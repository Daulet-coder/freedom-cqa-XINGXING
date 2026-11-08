"""Model provider plus deterministic CQA scoring; saved checklist versions are preserved."""
import os, json, re, math, urllib.request

DEFAULT_CRITERIA = [{'id': 'contact',
  'name': 'Установление контакта',
  'weight': 10,
  'type': 'binary',
  'na': False,
  'values': [],
  'rule': 'Оператор поздоровался на языке клиента И представился в ПЕРВОМ ответе. Приветствие бота не '
          'считается.',
  'requires_product_evidence': False},
 {'id': 'discovery',
  'name': 'Выявление потребности',
  'weight': 15,
  'type': 'binary',
  'na': True,
  'values': [],
  'rule': 'Учёл известные детали и уточнил недостающее ДО ответа. null только если информации для ответа '
          'хватало изначально.',
  'requires_product_evidence': False},
 {'id': 'identification',
  'name': 'Идентификация',
  'weight': 20,
  'type': 'binary',
  'na': True,
  'values': [],
  'rule': 'Личность ПОДТВЕРЖДЕНА до раскрытия данных конкретного счёта или защищённого действия. Просьба '
          'назвать данные не доказывает успешную идентификацию. Системное подтверждение учитывается. null '
          'если не требовалась.',
  'requires_product_evidence': False},
 {'id': 'consultation',
  'name': 'Корректная и полная консультация',
  'weight': 20,
  'type': 'scale',
  'na': True,
  'values': [0, 5, 10, 15, 20],
  'rule': '20 все существенные вопросы закрыты ИЛИ корректный следующий шаг; 15 основной решён, упущена '
          'второстепенная деталь; 10 часть закрыта, существенный вопрос открыт; 5 общая подсказка, непонятно '
          'как действовать; 0 нет ответа по существу ИЛИ ключевая рекомендация ошибочна. null ТОЛЬКО чат '
          'закончился до формулировки запроса. Не наказывай за отсутствие данных в FAQ. Не приписывай '
          'оператору обещания из вопросов клиента.',
  'requires_product_evidence': True},
 {'id': 'empathy',
  'name': 'Эмпатия и клиентоориентированность',
  'weight': 15,
  'type': 'binary',
  'na': False,
  'values': [],
  'rule': 'Вежлив И при выраженном недовольстве или неудобстве отреагировал на конкретную проблему. Если '
          'недовольства нет, достаточно вежливости; отдельная фраза сочувствия не обязательна.',
  'requires_product_evidence': False},
 {'id': 'dialogue',
  'name': 'Управление диалогом, скорость и грамотность',
  'weight': 15,
  'type': 'scale',
  'na': False,
  'values': [0, 4, 7, 10],
  'rule': '10 ясно, связно, предупредил при явном ожидании; 7 один заметный сбой, можно продолжить; 4 клиент '
          'переспрашивает из-за формулировок/порядка; 0 бессвязно или противоречиво, ход непонятен. Не '
          'снижай только за неполноту консультации. Порог первой реакции 3 минуты НЕ входит. Звонки: '
          'понятность речи и логика, не орфография ASR.',
  'requires_product_evidence': False},
 {'id': 'closure',
  'name': 'Завершение',
  'weight': 5,
  'type': 'binary',
  'na': True,
  'values': [],
  'rule': 'Подвёл итог ИЛИ предложил дальнейшую помощь, И попрощался. null только если разговор оборвался до '
          'возможности завершить. Закрытие системой не является прощанием оператора.',
  'requires_product_evidence': False},
 {'id': 'critical',
  'name': 'Грубые ошибки',
  'weight': 0,
  'type': 'flag',
  'na': False,
  'values': [],
  'rule': 'true ТОЛЬКО оскорбление, предложение платной услуги в обход компании (достаточно предложения), '
          'раскрытие конфиденциальной информации. Другие недостатки сами по себе не грубые ошибки. Не '
          'обнуляй итог.',
  'requires_product_evidence': False}]

def validate_criteria(criteria):
    if not isinstance(criteria,list) or not 1<=len(criteria)<=40: raise ValueError('Нужно от 1 до 40 критериев')
    ids=set()
    for c in criteria:
        if not re.fullmatch(r'[a-z][a-z0-9_]{0,49}', c['id']) or c['id'] in ids: raise ValueError('ID должны быть уникальными: латиница, цифры, _')
        ids.add(c['id'])
        if not c['name'].strip() or not c['rule'].strip(): raise ValueError('Заполните название и правило')
        if c['type'] not in ['binary','scale','flag']: raise ValueError('Неизвестный тип')
        if type(c['weight']) not in (int,float) or not math.isfinite(c['weight']) or not 0<=c['weight']<=100: raise ValueError('Вес должен быть конечным числом от 0 до 100')
        if c['type']=='flag' and (c['weight']!=0 or c['na']): raise ValueError('Флаг: вес 0, без N/A')
        if c['type']=='scale':
            values=c['values']
            if len(values)<2 or any(type(v) not in (int,float) or not math.isfinite(v) for v in values) or values!=sorted(set(values)) or values[0]!=0 or values[-1]<=0: raise ValueError('Шкала должна начинаться с 0 и содержать разные возрастающие конечные числа')

def validate_result(rows, criteria, turns):
    if not isinstance(rows,list) or len(rows)!=len(criteria) or {r['criterion_id'] for r in rows}!={c['id'] for c in criteria}: raise ValueError('Модель вернула неполный набор критериев')
    for c in criteria:
        r=next(r for r in rows if r['criterion_id']==c['id']); v=r['value']
        if v is None:
            if not c['na']: raise ValueError('N/A запрещён для '+c['id'])
        elif c['type'] in ['binary','flag']:
            if type(v) is not bool: raise ValueError('Ожидается boolean')
        elif type(v) not in (int,float) or not math.isfinite(v) or v not in c['values']: raise ValueError('Значение вне шкалы')
        if not isinstance(r.get('rationale'),str) or not r['rationale'].strip(): raise ValueError('Нет обоснования')
        if not isinstance(r.get('evidence_turns'),list) or not r['evidence_turns'] or any(type(i) is not int or not 1<=i<=turns for i in r['evidence_turns']): raise ValueError('Неверные номера реплик')

def total(rows, criteria):
    weight=earned=0
    for c in criteria:
        r=next((r for r in rows if r['criterion_id']==c['id']),None)
        if not r or r['value'] is None or c['type']=='flag': continue
        weight+=c['weight']
        earned+=c['weight']*(r['value']/max(c['values']) if c['type']=='scale' else int(r['value']))
    return {'final_score':round(100*earned/weight,2) if weight else None,'critical_flag':any(r['value'] is True for r in rows if next((c['type'] for c in criteria if c['id']==r['criterion_id']),None)=='flag')}

class DemoEvaluator:
    name='Демо • правила, без обученной модели'
    mode='demo'
    def evaluate(self, record, criteria):
        t=record['transcript']; op=[(i+1,m) for i,m in enumerate(t) if m['speaker']=='operator']
        if not op: raise ValueError('Нет реплик оператора: автоматическая оценка недоступна')
        rows=[]; first=op[0][1]['text'].lower(); last=op[-1][1]['text'].lower(); text=' '.join(m['text'] for _,m in op).lower()
        for c in criteria:
            id=c['id']; evidence=[op[0][0]]; v=False
            reason='Демонстрационное правило не подтверждает выполнение критерия. Требуется проверка специалистом.'
            if id=='contact':
                v=bool(re.search(r'здравств|добрый|доброе|hello|hi\b|сәлем',first) and re.search(r'меня зовут|я |i.m |my name|есім',first)); reason='В первом ответе проверены маркеры приветствия и представления. Язык и смысл требуют проверки.'
            elif id=='discovery':
                v='?' in text; reason='Найден уточняющий вопрос оператора.' if v else 'Демо-правило не нашло уточняющего вопроса; применимость необходимо проверить.'
            elif id=='identification':
                v=None if c['na'] else False; evidence=[1]; reason='Демо-режим: идентификация временно исключена из расчёта. Применимость для этого запроса НЕ определена; подтвердите вручную.'
            elif id=='consultation':
                v=min(c['values'],key=lambda n:abs(n-max(c['values'])*.5)); evidence=[i for i,_ in op]; reason='Демо: условная частичная оценка для проверки интерфейса. Корректность совета не проверена по базе знаний.'
            elif id=='empathy':
                v=bool(re.search(r'понима|пожалуйста|спасибо|sorry|please|thank|рақмет',text)); reason='Проверены маркеры вежливости. Содержательная эмпатия требует проверки.'
            elif id=='dialogue':
                v=max(c['values']); evidence=[i for i,_ in op]; reason='Демо: верхняя ступень шкалы. Связность, скорость и грамотность ещё не проверены моделью.'
            elif id=='closure':
                v=bool(re.search(r'до свидания|хорошего|обращайтесь|goodbye|have a|сау бол',last)); evidence=[op[-1][0]]; reason='В последнем ответе проверены маркеры прощания. Наличие итога или предложения помощи подтвердите вручную.'
            elif c['type']=='flag':
                hit=next(((i,m) for i,m in op if re.search(r'идиот|тупой|переведите мне лично|на мою карту|you are stupid',m['text'].lower())),None)
                v=bool(hit); evidence=[hit[0]] if hit else [i for i,_ in op]; reason='Найден явный маркер возможного грубого нарушения; проверьте контекст.' if hit else 'По ограниченному списку демо-маркеров нарушение не найдено. Это не подтверждение отсутствия нарушений.'
            elif c['type']=='scale': v=0
            rows.append(dict(criterion_id=id,value=v,rationale=reason,evidence_turns=evidence))
        return rows

class ModelEvaluator:
    """HTTP inference; a failure never falls back to demo."""
    def __init__(self, config=None):
        c=config or {}
        self.url=c.get('model_url') or os.getenv('CQA_MODEL_URL','')
        self.name=c.get('model_name') or os.getenv('CQA_MODEL_NAME','local-model')
        self.mode=c.get('mode','local')
        self.timeout=float(c.get('timeout') or os.getenv('CQA_MODEL_TIMEOUT','900'))
        self.metadata={}
    def evaluate(self, record, criteria):
        req=urllib.request.Request(self.url,data=json.dumps({'conversation':record,'checklist':criteria},ensure_ascii=False).encode(),headers={'Content-Type':'application/json'})
        if not 0 < self.timeout <= 3600: raise ValueError('Тайм-аут: от 1 до 3600 секунд')
        try:
            with urllib.request.urlopen(req,timeout=self.timeout) as res: data=json.load(res)
        except urllib.error.HTTPError as exc:
            try: message=json.loads(exc.read().decode()).get('error','Ошибка сервиса модели')
            except Exception: message='Сервис модели вернул HTTP '+str(exc.code)
            raise ValueError(message) from exc
        except (urllib.error.URLError,TimeoutError) as exc:
            raise ValueError('Сервис модели недоступен или превышен тайм-аут. Проверьте настройки подключения.') from exc
        self.metadata=data.get('metadata',{})
        return data['criteria']

def evaluator(config=None):
    if config is not None:return DemoEvaluator() if config.get('mode')=='demo' else ModelEvaluator(config)
    return ModelEvaluator() if os.getenv('CQA_MODEL_URL') else DemoEvaluator()

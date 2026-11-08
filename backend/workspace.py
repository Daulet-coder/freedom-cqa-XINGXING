"""Validation and exact organizer export, independent of the UI."""
import copy, json, math
from urllib.parse import urlsplit
from .scoring import DEFAULT_CRITERIA, validate_criteria, validate_result, total
DATASETS={'DEV','PROD','CUSTOM','DEMO'}
MODEL_MODES={'local','external_api','hybrid'}

def validate_settings(c):
    if c.get('mode') not in {'demo',*MODEL_MODES}:raise ValueError('Выберите режим модели')
    if not isinstance(c.get('team_name'),str) or not c['team_name'].strip() or len(c['team_name'])>100:raise ValueError('Укажите название команды, до 100 символов')
    if type(c.get('timeout')) not in (int,float) or not math.isfinite(c['timeout']) or not 1<=c['timeout']<=3600:raise ValueError('Тайм-аут: от 1 до 3600 секунд')
    if c['mode']!='demo':
        u=urlsplit(c.get('model_url',''))
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password or u.fragment:raise ValueError('Укажите HTTP(S) URL без встроенного логина и пароля')
        if not c.get('model_name','').strip():raise ValueError('Укажите фактическое название модели')

def official_shape(criteria):
    keys=('id','type','weight','na','values')
    try:return {c['id']:tuple(json.dumps(c.get(k),sort_keys=True) for k in keys) for c in criteria}=={c['id']:tuple(json.dumps(c.get(k),sort_keys=True) for k in keys) for c in DEFAULT_CRITERIA}
    except (KeyError,TypeError):return False

def same_checklist(left, right):
    """Compare complete criterion configurations; version labels are host-specific."""
    return isinstance(left,list) and isinstance(right,list) and sorted(left,key=lambda c:c['id'])==sorted(right,key=lambda c:c['id'])

def export_report(dataset, records, evaluations, checklist_version, current_criteria=None):
    issues=[];rows=[];providers={};missing=[];demo=[];stale=[];experimental=[];errors=[]
    expected={'DEV':65,'PROD':10}.get(dataset)
    if expected is not None and len(records)!=expected:issues.append(f'{dataset}: требуется {expected} диалогов, найдено {len(records)}')
    if not records:issues.append('Набор пуст')
    for record in records:
        id=record['conversation_id'];ev=evaluations.get(id)
        if not ev:missing.append(id);continue
        if ev.get('mode') not in MODEL_MODES:demo.append(id)
        else:providers.setdefault(ev['mode'],set()).add(ev['provider'])
        changed=not same_checklist(ev['checklist']['criteria'],current_criteria) if current_criteria is not None else ev['checklist']['version']!=checklist_version
        if changed:stale.append(id)
        if not official_shape(ev['checklist']['criteria']):experimental.append(id)
        if ev['status']=='error':errors.append(id)
        rows.append({k:copy.deepcopy(v) for k,v in ev.items() if k in ('conversation_id','status','criteria','score','error')})
    for ids,label in [(missing,'Нет оценки'),(demo,'Демонстрационные результаты'),(stale,'Старая версия чек-листа'),(experimental,'Критерии, веса или шкалы отличаются от официального формата')]:
        if ids:issues.append(f'{label}: {len(ids)}')
    if dataset not in ('DEV','PROD'):issues.append('Для сдачи выберите DEV или PROD')
    mode=next(iter(providers)) if len(providers)==1 else 'hybrid'
    name='; '.join(sorted({n for names in providers.values() for n in names}))
    return {'dataset':dataset,'total':len(records),'evaluated':len(rows),'missing':missing,'demo':demo,'stale':stale,'experimental':experimental,'errors':errors,'issues':issues,'ready':not issues,'model':{'mode':mode,'name':name},'results':rows}

def validate_imported_results(payload, records, checklist):
    model=payload.get('model',{})
    if model.get('mode') not in MODEL_MODES or not isinstance(model.get('name'),str) or not model['name'].strip():raise ValueError('Нужны фактические model.mode и model.name')
    if payload.get('schema_version')!='1.0' or not isinstance(payload.get('results'),list) or not 1<=len(payload['results'])<=1000:raise ValueError('Ожидается JSON результатов schema_version 1.0')
    rubric=payload.get('checklist',checklist['criteria']);validate_criteria(rubric)
    if rubric!=checklist['criteria']:raise ValueError('Чек-лист результатов не совпадает с текущим. Сначала сохраните соответствующую конфигурацию.')
    seen=set();out=[]
    for row in payload['results']:
        id=row.get('conversation_id')
        if id not in records:raise ValueError('Сначала загрузите транскрипт: '+str(id))
        if id in seen:raise ValueError('Повторяющийся ID: '+id)
        seen.add(id)
        if row.get('status')=='ok':
            validate_result(row['criteria'],rubric,len(records[id]['transcript']))
            score=row.get('score')
            if not isinstance(score,dict) or type(score.get('critical_flag')) is not bool or (score.get('final_score') is not None and (type(score['final_score']) not in (int,float) or not math.isfinite(score['final_score']))):raise ValueError('Неверные типы полей score: '+id)
            if score!=total(row['criteria'],rubric):raise ValueError('Итог не совпадает с пересчётом: '+id)
        elif row.get('status')=='error':
            if row.get('criteria')!=[] or row.get('score') is not None or not isinstance(row.get('error'),str) or not row['error'].strip():raise ValueError('Неверный формат ошибки: '+id)
        else:raise ValueError('Неверный status: '+str(id))
        out.append(copy.deepcopy(row))
    return out,model

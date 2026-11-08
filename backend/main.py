from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit
from urllib.request import urlopen
import sqlite3, json, uuid, copy, os, threading, math, re
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .audio import resolve_source
from .scoring import DEFAULT_CRITERIA, validate_criteria, validate_result, total, evaluator
from .workspace import DATASETS, MODEL_MODES, validate_settings, export_report, validate_imported_results

ROOT=Path(__file__).resolve().parents[1]
DATASET=Path(os.getenv('CQA_DATASET_PATH',str(ROOT/'data/dev_dataset.json' if (ROOT/'data/dev_dataset.json').exists() else ROOT/'data/dev_dataset.public.json')))
DB=Path(os.getenv('CQA_DB_PATH',str(ROOT/'data/cqa.sqlite3')))
RESULTS_ROOT=Path(os.getenv('CQA_RESULTS_PATH',str(ROOT/'results')))
app=FastAPI(title='Freedom CQA',version='1.0.0')
lock=threading.RLock()
inflight=set()
model_check={'state':'unchecked','checked_at':None}

def now():return datetime.now(timezone.utc).isoformat()
def encode(x):return json.dumps(x,ensure_ascii=False,allow_nan=False)
@contextmanager
def connection():
    db=sqlite3.connect(DB,timeout=30);db.row_factory=sqlite3.Row
    try:yield db;db.commit()
    except Exception:db.rollback();raise
    finally:db.close()
def get_state(db):return json.loads(db.execute('SELECT body FROM state WHERE id=1').fetchone()[0])
def save_state(db,s):db.execute('UPDATE state SET body=? WHERE id=1',(encode(s),))
def get_record(db,id):
    row=db.execute('SELECT body FROM conversations WHERE id=?',(id,)).fetchone()
    if not row:raise HTTPException(404,'Диалог не найден')
    return json.loads(row[0])
def stored(db,table,id):
    row=db.execute(f'SELECT body FROM {table} WHERE id=?',(id,)).fetchone()
    return json.loads(row[0]) if row else None

def defaults():
    return {'team_name':'Freedom CQA','mode':'local' if os.getenv('CQA_MODEL_URL') else 'demo','model_url':os.getenv('CQA_MODEL_URL',''),'model_name':os.getenv('CQA_MODEL_NAME','Qwen3.5-9B NF4 + RAG'),'timeout':float(os.getenv('CQA_MODEL_TIMEOUT','900'))}
def settings(db):return stored(db,'settings','workspace') or defaults()
def active_job(db):
    return next((json.loads(r[0]) for r in db.execute('SELECT body FROM jobs ORDER BY rowid DESC') if json.loads(r[0])['status'] in ('queued','running','cancelling')),None)
def writable(db):
    if inflight or active_job(db):raise HTTPException(409,'Дождитесь завершения или отмените текущую обработку')
def pending(db,id):return any(json.loads(r[0])['conversation_id']==id and json.loads(r[0])['status']=='pending' for r in db.execute('SELECT body FROM appeals'))
def persist_evaluation(db,ev):
    db.execute('INSERT OR REPLACE INTO evaluations VALUES(?,?)',(ev['conversation_id'],encode(ev)))
    db.execute('INSERT OR REPLACE INTO evaluation_history VALUES(?,?,?)',(ev['revision'],ev['conversation_id'],encode(ev)))
def decorated(db,r):
    group=db.execute('SELECT dataset FROM memberships WHERE id=?',(r['conversation_id'],)).fetchone()
    return {**r,'dataset':group[0] if group else 'CUSTOM','evaluation':stored(db,'evaluations',r['conversation_id'])}

def initialize():
    with connection() as db:
        db.executescript('CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE IF NOT EXISTS evaluations(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE IF NOT EXISTS appeals(id TEXT PRIMARY KEY,body TEXT);')
        if not db.execute('SELECT 1 FROM state').fetchone(): db.execute('INSERT INTO state VALUES(1,?)',(json.dumps({'version':1,'criteria':DEFAULT_CRITERIA},ensure_ascii=False),))
        if not db.execute('SELECT 1 FROM conversations').fetchone():
            records=json.loads(DATASET.read_text())['data']['records']
            sample=dict(conversation_id='demo-024',language='RU',channel='agent chat',audio_url=None,demo=True,transcript=[
                dict(timestamp='00:00',speaker='client',text='Здравствуйте! Я оставил обращение по комиссии, но ответа пока нет.'),
                dict(timestamp='00:12',speaker='operator',text='Здравствуйте! Меня зовут Алина. Понимаю, что ожидание вызывает неудобство. Подскажите, когда вы отправили обращение?'),
                dict(timestamp='00:38',speaker='client',text='Вчера вечером, через приложение.'),
                dict(timestamp='02:08',speaker='client',text='Когда я получу ответ по обращению?'),
                dict(timestamp='02:18',speaker='operator',text='Я передам вопрос специалистам.'),
                dict(timestamp='02:27',speaker='client',text='А сколько времени это займёт?'),
                dict(timestamp='02:45',speaker='operator',text='Обращение передано в профильный отдел.'),
                dict(timestamp='02:50',speaker='system',text='Оператор завершил диалог.')])
            for r in [sample]+records: db.execute('INSERT INTO conversations VALUES(?,?)',(r['conversation_id'],json.dumps(r,ensure_ascii=False)))
    with connection() as db:
        demo=dict(conversation_id='demo-critical',language='RU',channel='agent chat',audio_url=None,demo=True,transcript=[
            dict(timestamp='00:00',speaker='client',text='Здравствуйте! Подскажите, где получить консультацию по инвестициям?'),
            dict(timestamp='00:08',speaker='operator',text='Здравствуйте, меня зовут Игорь. Переведите мне лично деньги на консультацию, и я помогу вам вне компании.'),
            dict(timestamp='00:19',speaker='client',text='Я хотел получить консультацию через официальный сервис.'),
            dict(timestamp='00:28',speaker='operator',text='Хорошо, обратитесь в поддержку через приложение. До свидания!')])
        db.execute('INSERT OR IGNORE INTO conversations VALUES(?,?)',(demo['conversation_id'],json.dumps(demo,ensure_ascii=False)))

def bootstrap():
    initialize()
    source=json.loads(DATASET.read_text())['data']['records'];dev_ids={r['conversation_id'] for r in source}
    with connection() as db:
        db.executescript('CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE IF NOT EXISTS memberships(id TEXT PRIMARY KEY,dataset TEXT NOT NULL); CREATE TABLE IF NOT EXISTS evaluation_history(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL,body TEXT); CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,body TEXT);')
        for row in db.execute('SELECT body FROM conversations').fetchall():
            r=json.loads(row[0]);group='DEMO' if r.get('demo') else 'DEV' if r['conversation_id'] in dev_ids else 'CUSTOM'
            db.execute('INSERT OR IGNORE INTO memberships VALUES(?,?)',(r['conversation_id'],group))
        for row in db.execute('SELECT body FROM evaluations').fetchall():
            ev=json.loads(row[0]);db.execute('INSERT OR IGNORE INTO evaluation_history VALUES(?,?,?)',(ev['revision'],ev['conversation_id'],row[0]))
        for row in db.execute('SELECT id,body FROM jobs').fetchall():
            j=json.loads(row[1])
            if j['status'] in ('queued','running','cancelling'):
                j.update(status='interrupted',finished_at=now(),message='Сервер перезапущен. Сохранённые результаты доступны; оставшиеся можно запустить повторно.')
                db.execute('UPDATE jobs SET body=? WHERE id=?',(encode(j),row[0]))
bootstrap()

@app.exception_handler(ValueError)
def value_error(request,exc):return JSONResponse(status_code=422,content={'detail':str(exc)})
@app.get('/api/health')
def health():
    with connection() as db:c=settings(db)
    p=evaluator(c)
    return {'ok':True,'provider':p.name,'mode':p.mode,'model_state':'demo' if p.mode=='demo' else model_check['state'],'checked_at':model_check.get('checked_at')}
@app.get('/api/settings')
def read_settings():
    with connection() as db:return settings(db)
@app.put('/api/settings')
def update_settings(payload:dict=Body(...)):
    c={k:payload.get(k) for k in defaults()};validate_settings(c)
    with lock,connection() as db:
        writable(db);db.execute('INSERT OR REPLACE INTO settings VALUES(?,?)',('workspace',encode(c)))
        model_check.clear();model_check.update(state='unchecked',checked_at=None)
    return c
@app.post('/api/model/check')
def check_model():
    with connection() as db:c=settings(db)
    if c['mode']=='demo':return {'state':'demo','message':'Используются демонстрационные правила. Модель не вызывается.','checked_at':now()}
    u=urlsplit(c['model_url']);url=urlunsplit((u.scheme,u.netloc,u.path.rsplit('/',1)[0]+'/health','',''))
    try:
        with urlopen(url,timeout=5) as res:body=json.load(res)
        if body.get('ok') is not True:raise ValueError('Сервис не подтвердил готовность')
        result={'state':'ready','message':'Сервис отвечает. Для проверки inference запустите оценку нового диалога.','checked_at':now(),'service':body}
    except Exception:
        result={'state':'unavailable','message':'Нет ответа от сервиса модели. Проверьте URL, запуск на GPU и доступность сети.','checked_at':now()}
    model_check.update(result);return result
@app.get('/api/checklist')
def checklist():
    with connection() as db:return get_state(db)
@app.put('/api/checklist')
def update_checklist(payload:dict=Body(...)):
    try:validate_criteria(payload['criteria'])
    except (KeyError,TypeError) as ex:raise ValueError('Неверная конфигурация чек-листа') from ex
    with lock,connection() as db:
        writable(db);s=get_state(db)
        if payload.get('version')!=s['version']:raise HTTPException(409,'Чек-лист уже изменён. Обновите страницу.')
        s={'version':s['version']+1,'criteria':payload['criteria']};save_state(db,s);return s
@app.post('/api/checklist/official')
def restore_official(payload:dict=Body(...)):
    with connection() as db:s=get_state(db)
    return update_checklist({'version':payload.get('version'),'criteria':copy.deepcopy(DEFAULT_CRITERIA)})
@app.get('/api/conversations')
def conversations():
    with connection() as db:return [decorated(db,json.loads(r[0])) for r in db.execute('SELECT body FROM conversations ORDER BY rowid')]
@app.get('/api/conversations/{id}')
def conversation(id:str):
    with connection() as db:return decorated(db,get_record(db,id))
@app.get('/api/conversations/{id}/history')
def history(id:str):
    with connection() as db:
        get_record(db,id)
        return [json.loads(r[0]) for r in db.execute('SELECT body FROM evaluation_history WHERE conversation_id=? ORDER BY rowid DESC',(id,))]
@app.get('/api/conversations/{id}/audio-source')
def audio_source(id:str):
    with connection() as db:r=get_record(db,id)
    trusted={r['audio_url'] for r in json.loads(DATASET.read_text())['data']['records'] if r.get('audio_url')}
    try:return {'url':resolve_source(r.get('audio_url'),trusted)}
    except Exception:raise HTTPException(502,'Не удалось получить запись. Можно прикрепить локальный аудиофайл.')
@app.post('/api/import')
def import_records(payload=Body(...),dataset:str='CUSTOM'):
    if dataset not in ('DEV','PROD','CUSTOM'):raise ValueError('Выберите DEV, PROD или CUSTOM')
    try:
        rows=payload if isinstance(payload,list) else payload.get('data',payload).get('records',[payload] if 'conversation_id' in payload else [])
        if not isinstance(rows,list) or not 1<=len(rows)<=1000:raise ValueError('Нужно от 1 до 1000 диалогов')
        ids=set();normalized=[]
        for record in rows:
            r=copy.deepcopy(record);id=r['conversation_id']
            if not isinstance(id,str) or not id.strip() or len(id)>100 or '/' in id or id in ids:raise ValueError('Некорректные или повторяющиеся ID')
            ids.add(id)
            if r.get('language') not in ('RU','KZ','EN') or r.get('channel') not in ('agent chat','voice call'):raise ValueError('Язык: RU/KZ/EN; канал: agent chat/voice call')
            if not isinstance(r['transcript'],list) or not 1<=len(r['transcript'])<=5000:raise ValueError('Пустой или слишком большой транскрипт')
            for m in r['transcript']:
                if m['speaker'] not in ('client','operator','bot','system') or not isinstance(m['text'],str) or not m['text'].strip() or not isinstance(m['timestamp'],str):raise ValueError('Неверный формат реплики')
                stamp=m['timestamp']
                if not re.fullmatch(r'\d+:[0-5]\d(?::[0-5]\d)?',stamp):
                    try:
                        parsed=datetime.fromisoformat(stamp.replace('Z','+00:00'))
                        if parsed.tzinfo is None:raise ValueError()
                    except ValueError:raise ValueError('Метка времени должна быть MM:SS или ISO 8601 с часовым поясом')
            if r.get('audio_url') is not None and not isinstance(r['audio_url'],str):raise ValueError('audio_url должен быть строкой или null')
            r['demo']=False;normalized.append(r)
        with lock,connection() as db:
            existing={r[0] for r in db.execute('SELECT id FROM conversations')}
            if existing&ids:raise ValueError('Уже существуют ID: '+', '.join(sorted(existing&ids)[:5]))
            if dataset=='DEV':
                allowed={r['conversation_id'] for r in json.loads(DATASET.read_text())['data']['records']}
                if not ids<=allowed:raise ValueError('DEV зарезервирован для исходных 65 ID. Для своих тестов выберите CUSTOM.')
            for r in normalized:
                db.execute('INSERT INTO conversations VALUES(?,?)',(r['conversation_id'],encode(r)))
                db.execute('INSERT INTO memberships VALUES(?,?)',(r['conversation_id'],dataset))
        return {'imported':len(normalized),'dataset':dataset}
    except (KeyError,TypeError,AttributeError) as ex:raise ValueError('Проверьте структуру JSON: ID, язык, канал и transcript') from ex

def evaluate_one(id,config=None,expected_version=None):
    with lock,connection() as db:
        if id in inflight:raise HTTPException(409,'Диалог уже обрабатывается')
        if pending(db,id):raise HTTPException(409,'Сначала завершите открытую апелляцию по этому диалогу')
        r=get_record(db,id);s=get_state(db);c=config or settings(db)
        if expected_version is not None and s['version']!=expected_version:raise HTTPException(409,'Чек-лист изменился')
        inflight.add(id)
    try:
        provider=evaluator(c)
        ev={'conversation_id':id,'checklist':s,'provider':provider.name,'mode':provider.mode,'evaluated_at':now(),'revision':str(uuid.uuid4()),'reviews':[],'source':'inference' if provider.mode!='demo' else 'demo'}
        try:
            rows=provider.evaluate(r,s['criteria']);validate_result(rows,s['criteria'],len(r['transcript']))
            ev.update(status='ok',criteria=rows,score=total(rows,s['criteria']),original_score=total(rows,s['criteria']),original_criteria=copy.deepcopy(rows),metadata=getattr(provider,'metadata',{}))
        except Exception as exc:
            ev.update(status='error',criteria=[],score=None,error=str(exc))
            if provider.mode!='demo':model_check.update(state='unavailable',checked_at=now())
        with lock,connection() as db:
            if get_state(db)['version']!=s['version'] or pending(db,id):raise HTTPException(409,'Конфигурация или статус апелляции изменились. Повторите оценку.')
            persist_evaluation(db,ev)
        return ev
    finally:
        with lock:inflight.discard(id)
@app.post('/api/conversations/{id}/evaluate')
def evaluate(id:str):return evaluate_one(id)

@app.get('/api/jobs')
def jobs():
    with connection() as db:return [json.loads(r[0]) for r in db.execute('SELECT body FROM jobs ORDER BY rowid DESC LIMIT 20')]
def save_job(db,j):db.execute('INSERT OR REPLACE INTO jobs VALUES(?,?)',(j['id'],encode(j)))
def run_job(id,config,version):
    try:
        with connection() as db:
            j=stored(db,'jobs',id)
            if j['status']=='cancelling':
                j.update(status='cancelled',finished_at=now());save_job(db,j);return
            j.update(status='running');save_job(db,j)
        for cid in j['conversation_ids']:
            with connection() as db:
                j=stored(db,'jobs',id)
                if j['status']=='cancelling':break
                j['current']=cid;save_job(db,j)
            try:
                ev=evaluate_one(cid,config,version);item={'conversation_id':cid,'status':ev['status']}
                if ev['status']=='error':item['error']=ev['error']
            except Exception as ex:item={'conversation_id':cid,'status':'error','error':ex.detail if isinstance(ex,HTTPException) else str(ex)}
            with connection() as db:
                j=stored(db,'jobs',id);j['results'].append(item);j['completed']=len(j['results']);j['errors']=sum(x['status']=='error' for x in j['results']);save_job(db,j)
        with connection() as db:
            j=stored(db,'jobs',id);j.update(status='cancelled' if j['status']=='cancelling' else 'completed',current=None,finished_at=now());save_job(db,j)
    except Exception as ex:
        with connection() as db:
            j=stored(db,'jobs',id);j.update(status='failed',message=str(ex),current=None,finished_at=now());save_job(db,j)
@app.post('/api/jobs')
def create_job(payload:dict=Body(...)):
    ids=payload.get('conversation_ids')
    if not isinstance(ids,list) or not ids or len(ids)>1000 or any(not isinstance(id,str) for id in ids) or len(ids)!=len(set(ids)):raise ValueError('Выберите уникальные ID диалогов')
    with lock,connection() as db:
        writable(db)
        for id in ids:get_record(db,id)
        c=settings(db);s=get_state(db)
        j={'id':str(uuid.uuid4()),'conversation_ids':ids,'total':len(ids),'completed':0,'errors':0,'results':[],'status':'queued','current':None,'created_at':now(),'checklist_version':s['version'],'mode':c['mode']}
        save_job(db,j)
    threading.Thread(target=run_job,args=(j['id'],c,s['version']),daemon=True).start();return j
@app.post('/api/jobs/{id}/cancel')
def cancel_job(id:str):
    with lock,connection() as db:
        j=stored(db,'jobs',id)
        if not j:raise HTTPException(404,'Задание не найдено')
        if j['status'] in ('queued','running'):j['status']='cancelling';save_job(db,j)
        return j
@app.post('/api/results/import')
def import_results(payload:dict=Body(...)):
    with lock,connection() as db:
        writable(db);s=get_state(db);records={r['conversation_id']:r for r in (json.loads(x[0]) for x in db.execute('SELECT body FROM conversations'))}
        rows,model=validate_imported_results(payload,records,s)
        for row in rows:
            if pending(db,row['conversation_id']):raise HTTPException(409,'Есть открытая апелляция: '+row['conversation_id'])
        for row in rows:
            ev={**row,'checklist':copy.deepcopy(s),'provider':model['name'],'mode':model['mode'],'evaluated_at':now(),'revision':str(uuid.uuid4()),'reviews':[],'source':'imported','metadata':{'label_provenance':'imported_unreviewed'}}
            if row['status']=='ok':ev.update(original_score=copy.deepcopy(row['score']),original_criteria=copy.deepcopy(row['criteria']))
            persist_evaluation(db,ev)
        return {'imported':len(rows),'provider':model['name'],'message':'Результаты импортированы. Их происхождение заявлено в файле; экспертная точность не подтверждена.'}

@app.get('/api/appeals')
def appeals():
    with connection() as db:return [json.loads(r[0]) for r in db.execute('SELECT body FROM appeals ORDER BY rowid DESC')]
@app.post('/api/appeals')
def create_appeal(payload:dict=Body(...)):
    with lock,connection() as db:
        id=payload.get('conversation_id','');get_record(db,id)
        if id in inflight:raise HTTPException(409,'Дождитесь окончания оценки')
        ev=stored(db,'evaluations',id)
        if not ev or ev['status']!='ok':raise ValueError('Сначала оцените диалог')
        criterion=next((r for r in ev['criteria'] if r['criterion_id']==payload.get('criterion_id')),None)
        if not criterion or not isinstance(payload.get('comment'),str) or not payload['comment'].strip():raise ValueError('Выберите критерий и заполните комментарий')
        if any(json.loads(x[0])['status']=='pending' and json.loads(x[0])['conversation_id']==id and json.loads(x[0])['criterion_id']==payload['criterion_id'] for x in db.execute('SELECT body FROM appeals')):raise HTTPException(409,'По этому критерию уже есть открытая апелляция')
        a={'id':str(uuid.uuid4()),'conversation_id':id,'criterion_id':payload['criterion_id'],'comment':payload['comment'].strip(),'status':'pending','created_at':now(),'original':criterion,'evaluation_revision':ev['revision'],'criterion_name':next(c['name'] for c in ev['checklist']['criteria'] if c['id']==payload['criterion_id'])}
        db.execute('INSERT INTO appeals VALUES(?,?)',(a['id'],encode(a)));return a
@app.post('/api/appeals/{id}/resolve')
def resolve(id:str,payload:dict=Body(...)):
    with lock,connection() as db:
        a=stored(db,'appeals',id)
        if not a:raise HTTPException(404,'Апелляция не найдена')
        if a['status']!='pending':raise HTTPException(409,'Решение уже принято')
        if payload.get('decision') not in ('confirmed','changed') or not isinstance(payload.get('reason'),str) or not payload['reason'].strip():raise ValueError('Укажите решение и обоснование')
        ev=stored(db,'evaluations',a['conversation_id'])
        if ev['revision']!=a['evaluation_revision']:raise HTTPException(409,'Оценка изменилась')
        row=next(r for r in ev['criteria'] if r['criterion_id']==a['criterion_id'])
        if payload['decision']=='changed':row.update(value=payload.get('value'),rationale='Решение проверяющего: '+payload['reason'].strip())
        validate_result(ev['criteria'],ev['checklist']['criteria'],len(get_record(db,a['conversation_id'])['transcript']))
        ev['score']=total(ev['criteria'],ev['checklist']['criteria'])
        a.update(status=payload['decision'],reason=payload['reason'].strip(),final_value=row['value'],resolved_at=now());ev['reviews'].append(a)
        db.execute('UPDATE appeals SET body=? WHERE id=?',(encode(a),id));persist_evaluation(db,ev);return a

def report_for(db,dataset):
    if dataset not in DATASETS:raise ValueError('Неизвестный набор')
    records=[get_record(db,r[0]) for r in db.execute('SELECT id FROM memberships WHERE dataset=? ORDER BY rowid',(dataset,))]
    evs={r[0]:json.loads(r[1]) for r in db.execute('SELECT id,body FROM evaluations')}
    state=get_state(db)
    report=export_report(dataset,records,evs,state['version'],state['criteria'])
    ids={r['conversation_id'] for r in records}
    report['pending_appeals']=sorted({a['conversation_id'] for a in (json.loads(row[0]) for row in db.execute('SELECT body FROM appeals')) if a['status']=='pending' and a['conversation_id'] in ids})
    if report['pending_appeals']:report['issues'].append('Незавершённые апелляции: '+str(len(report['pending_appeals'])));report['ready']=False
    if inflight or active_job(db):report['issues'].append('Обработка ещё выполняется. Дождитесь завершения очереди.');report['ready']=False
    return report
@app.get('/api/export/validate')
def validate_export(dataset:str='DEV'):
    with lock,connection() as db:r=report_for(db,dataset)
    return {k:v for k,v in r.items() if k!='results'}
def official_payload(db,dataset):
    r=report_for(db,dataset)
    if not r['ready']:raise HTTPException(422,{'message':'Экспорт не готов к сдаче','issues':r['issues']})
    return {'schema_version':'1.0','team_name':settings(db)['team_name'].strip(),'model':r['model'],'results':r['results']}
@app.get('/api/export')
def export(dataset:str|None=None,strict:bool=False):
    with lock,connection() as db:
        if strict:
            if dataset is None:raise ValueError('Выберите DEV или PROD')
            return official_payload(db,dataset)
        evs=[json.loads(r[0]) for r in db.execute('SELECT body FROM evaluations')]
        if dataset:
            ids={r[0] for r in db.execute('SELECT id FROM memberships WHERE dataset=?',(dataset,))};evs=[e for e in evs if e['conversation_id'] in ids]
        modes={r['mode'] for r in evs};names=sorted({r['provider'] for r in evs})
        return {'schema_version':'1.0','team_name':settings(db)['team_name'],'model':{'mode':next(iter(modes)) if len(modes)==1 else 'hybrid','name':'; '.join(names)},'prototype_only':not evs or 'demo' in modes,'results':[{k:v for k,v in r.items() if k in ('conversation_id','status','criteria','score','error')} for r in evs]}
@app.post('/api/export/save')
def save_export(payload:dict=Body(...)):
    dataset=payload.get('dataset')
    if dataset not in ('DEV','PROD'):raise ValueError('Выберите DEV или PROD')
    with lock,connection() as db:data=official_payload(db,dataset)
    directory=RESULTS_ROOT/dataset.lower();directory.mkdir(parents=True,exist_ok=True)
    target=directory/'results.json'
    if target.exists():
        (directory/('results.backup-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')+'.json')).write_bytes(target.read_bytes())
    temporary=directory/'results.json.tmp';temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(target)
    return {'path':str(target),'count':len(data['results']),'message':'Сохранено локально. Commit и push в репозиторий ещё не выполнены.'}
app.mount('/',StaticFiles(directory=ROOT/'frontend',html=True),name='frontend')

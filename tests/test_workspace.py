"""Full HTTP workflows against an explicitly synthetic model-contract fixture.
These tests verify plumbing and export, never model accuracy.
"""
import copy, json, os, socket, subprocess, sys, tempfile, threading, time, unittest
import urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from backend.scoring import DEFAULT_CRITERIA, total
from backend.workspace import official_shape, same_checklist

ROOT=Path(__file__).resolve().parents[1]
class FixtureModel(BaseHTTPRequestHandler):
    def log_message(self,*_):pass
    def reply(self,status,data):
        b=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def do_GET(self):self.reply(200,{'ok':True,'training_status':'contract_fixture_not_a_real_model'})
    def do_POST(self):
        data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        record=data['conversation'];id=record['conversation_id']
        if 'service-error' in id:return self.reply(503,{'error':'Synthetic fixture inference failure'})
        if 'slow' in id:time.sleep(.25)
        evidence=next(i+1 for i,m in enumerate(record['transcript']) if m['speaker']=='operator')
        rows=[{'criterion_id':c['id'],'value':False if c['type']=='flag' else max(c['values']) if c['type']=='scale' else True,'rationale':'Explicit synthetic contract fixture, not an AI judgment','evidence_turns':[evidence]} for c in data['checklist']]
        self.reply(200,{'criteria':rows,'metadata':{'label_provenance':'contract_fixture_only'}})

def conversation(id):
    return {'conversation_id':id,'language':'RU','channel':'agent chat','transcript':[{'timestamp':'00:00','speaker':'client','text':'Учебный запрос'},{'timestamp':'00:03','speaker':'operator','text':'Здравствуйте, меня зовут Тест. Это синтетический ответ.'}], 'audio_url':None}
class WorkspaceHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model=ThreadingHTTPServer(('127.0.0.1',0),FixtureModel)
        cls.thread=threading.Thread(target=cls.model.serve_forever,daemon=True);cls.thread.start()
        cls.model_url=f'http://127.0.0.1:{cls.model.server_port}/evaluate'
    @classmethod
    def tearDownClass(cls):cls.model.shutdown();cls.model.server_close();cls.thread.join()
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
        self.base=f'http://127.0.0.1:{port}/api';self.results=Path(self.tmp.name)/'results'
        self.proc=subprocess.Popen([sys.executable,'-m','uvicorn','backend.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT,env={**os.environ,'CQA_MODEL_URL':'','CQA_DB_PATH':str(Path(self.tmp.name)/'db.sqlite3'),'CQA_RESULTS_PATH':str(self.results)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:self.call('/health');break
            except Exception:time.sleep(.03)
        else:self.fail('Server did not start')
    def tearDown(self):self.proc.terminate();self.proc.wait(timeout=10);self.tmp.cleanup()
    def call(self,path,method='GET',body=None):
        req=urllib.request.Request(self.base+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=10) as r:return json.load(r)
        except urllib.error.HTTPError as e:
            message=e.read().decode();e.close();e.detail=message;raise
    def configure(self,**extra):
        c={'team_name':'Fixture Team','mode':'local','model_url':self.model_url,'model_name':'contract-fixture-not-real-model','timeout':2};c.update(extra)
        return self.call('/settings','PUT',c)
    def wait_job(self,id):
        for _ in range(200):
            j=next(j for j in self.call('/jobs') if j['id']==id)
            if j['status'] not in ('queued','running','cancelling'):return j
            time.sleep(.02)
        self.fail('Job did not finish')
    def test_migration_and_groups_preserve_original_ids(self):
        rows=self.call('/conversations')
        self.assertEqual(sum(r['dataset']=='DEV' for r in rows),65)
        self.assertEqual(sum(r['dataset']=='DEMO' for r in rows),2)
        self.call('/import?dataset=CUSTOM','POST',[conversation('custom-a')])
        self.assertEqual(self.call('/conversations/custom-a')['dataset'],'CUSTOM')
        with self.assertRaises(urllib.error.HTTPError):self.call('/import?dataset=DEV','POST',[conversation('not-dev')])
    def test_service_roundtrip_history_and_no_fallback(self):
        self.configure();self.assertEqual(self.call('/health')['model_state'],'unchecked')
        self.assertEqual(self.call('/model/check','POST',{})['state'],'ready')
        ev=self.call('/conversations/p1-ru-001/evaluate','POST',{})
        self.assertEqual(ev['mode'],'local');self.assertEqual(ev['score']['final_score'],100)
        self.assertEqual(ev['metadata']['label_provenance'],'contract_fixture_only')
        self.call('/conversations/p1-ru-001/evaluate','POST',{})
        self.assertEqual(len(self.call('/conversations/p1-ru-001/history')),2)
        self.call('/import','POST',[conversation('service-error')])
        error=self.call('/conversations/service-error/evaluate','POST',{})
        self.assertEqual(error['status'],'error');self.assertEqual(error['mode'],'local');self.assertIsNone(error['score'])
        self.configure(model_url='http://127.0.0.1:9/evaluate')
        self.assertEqual(self.call('/model/check','POST',{})['state'],'unavailable')
        self.assertEqual(self.call('/conversations/p1-ru-001/evaluate','POST',{})['status'],'error')
    def test_prod_export_exact_schema_and_local_save(self):
        self.configure();rows=[conversation('control-'+str(i)) for i in range(10)]
        self.call('/import?dataset=PROD','POST',{'data':{'records':rows}})
        j=self.call('/jobs','POST',{'conversation_ids':[r['conversation_id'] for r in rows]})
        done=self.wait_job(j['id']);self.assertEqual(done['completed'],10);self.assertEqual(done['errors'],0)
        self.assertTrue(self.call('/export/validate?dataset=PROD')['ready'])
        out=self.call('/export?dataset=PROD&strict=true')
        self.assertEqual(set(out),{'schema_version','team_name','model','results'})
        self.assertEqual(len(out['results']),10);self.assertEqual(out['model']['name'],'contract-fixture-not-real-model')
        self.assertTrue(all(r['conversation_id'].startswith('control-') for r in out['results']))
        saved=self.call('/export/save','POST',{'dataset':'PROD'})
        self.assertEqual(Path(saved['path']),self.results/'prod'/'results.json')
        self.assertEqual(json.loads(Path(saved['path']).read_text()),out)
        self.call('/export/save','POST',{'dataset':'PROD'});self.assertEqual(len(list((self.results/'prod').glob('results.backup-*'))),1)
    def test_export_blocks_demo_missing_stale_and_custom_criteria(self):
        self.call('/conversations/p1-ru-001/evaluate','POST',{})
        r=self.call('/export/validate?dataset=DEV');self.assertFalse(r['ready']);self.assertEqual(len(r['missing']),64);self.assertEqual(r['demo'],['p1-ru-001'])
        with self.assertRaises(urllib.error.HTTPError):self.call('/export?dataset=DEV&strict=true')
        self.configure();self.call('/conversations/p1-ru-001/evaluate','POST',{})
        c=self.call('/checklist');c['criteria'][0]['weight']=12;self.call('/checklist','PUT',c)
        self.assertEqual(self.call('/export/validate?dataset=DEV')['stale'],['p1-ru-001'])
        self.call('/conversations/p1-ru-001/evaluate','POST',{})
        self.assertEqual(self.call('/export/validate?dataset=DEV')['experimental'],['p1-ru-001'])
        restored=self.call('/checklist/official','POST',{'version':self.call('/checklist')['version']});self.assertTrue(official_shape(restored['criteria']))
        self.assertEqual(self.call('/export/validate?dataset=DEV')['stale'],['p1-ru-001'])
    def test_identical_rules_survive_host_version_labels_but_changed_rules_do_not(self):
        self.configure();self.call('/conversations/p1-ru-001/evaluate','POST',{})
        self.call('/checklist/official','POST',{'version':self.call('/checklist')['version']})
        self.assertEqual(self.call('/export/validate?dataset=DEV')['stale'],[])
        c=self.call('/checklist');c['criteria'][0]['rule']+=' Explicit changed requirement.'
        self.call('/checklist','PUT',c)
        self.assertEqual(self.call('/export/validate?dataset=DEV')['stale'],['p1-ru-001'])
    def test_import_results_validates_all_before_commit(self):
        record=conversation('offline-1');self.call('/import?dataset=PROD','POST',[record])
        criteria=[dict(criterion_id=c['id'],value=False if c['type']=='flag' else max(c['values']) if c['type']=='scale' else True,rationale='Synthetic fixture only',evidence_turns=[2]) for c in DEFAULT_CRITERIA]
        row={'conversation_id':'offline-1','status':'ok','criteria':criteria,'score':total(criteria,DEFAULT_CRITERIA)}
        payload={'schema_version':'1.0','model':{'mode':'local','name':'import-contract-fixture'},'results':[row]}
        bad=copy.deepcopy(payload);bad['results'][0]['criteria'][0]['evidence_turns']=[999]
        with self.assertRaises(urllib.error.HTTPError):self.call('/results/import','POST',bad)
        self.assertIsNone(self.call('/conversations/offline-1')['evaluation'])
        self.assertEqual(self.call('/results/import','POST',payload)['imported'],1)
        self.assertEqual(self.call('/conversations/offline-1')['evaluation']['source'],'imported')
        bad_types=copy.deepcopy(payload);bad_types['results'][0]['score']['critical_flag']=0
        with self.assertRaises(urllib.error.HTTPError):self.call('/results/import','POST',bad_types)
        bad=copy.deepcopy(payload);bad['results'][0]['score']['final_score']=25
        with self.assertRaises(urllib.error.HTTPError):self.call('/results/import','POST',bad)
        with self.assertRaises(urllib.error.HTTPError):self.call('/results/import','POST',{**payload,'results':[row,row]})
    def test_history_keeps_appeal_after_reevaluation(self):
        self.configure();id='p1-ru-001';self.call('/conversations/'+id+'/evaluate','POST',{})
        a=self.call('/appeals','POST',{'conversation_id':id,'criterion_id':'contact','comment':'Fixture appeal'})
        self.assertEqual(self.call('/export/validate?dataset=DEV')['pending_appeals'],[id])
        with self.assertRaises(urllib.error.HTTPError):self.call('/conversations/'+id+'/evaluate','POST',{})
        self.call('/appeals/'+a['id']+'/resolve','POST',{'decision':'changed','value':False,'reason':'Synthetic human review fixture'})
        reviewed=self.call('/conversations/'+id)['evaluation'];self.assertEqual(reviewed['original_score']['final_score'],100)
        self.call('/conversations/'+id+'/evaluate','POST',{})
        h=self.call('/conversations/'+id+'/history');self.assertEqual(len(h),2);self.assertEqual(len(h[1]['reviews']),1)
    def test_job_cancel_and_settings_lock(self):
        self.configure();rows=[conversation('slow-'+str(i)) for i in range(5)];self.call('/import','POST',rows)
        j=self.call('/jobs','POST',{'conversation_ids':[r['conversation_id'] for r in rows]})
        with self.assertRaises(urllib.error.HTTPError) as ex:self.configure()
        self.assertEqual(ex.exception.code,409)
        self.assertTrue(any('Обработка ещё' in issue for issue in self.call('/export/validate?dataset=DEV')['issues']))
        self.call('/jobs/'+j['id']+'/cancel','POST',{})
        done=self.wait_job(j['id']);self.assertEqual(done['status'],'cancelled');self.assertLess(done['completed'],5)
    def test_wrong_language_and_invalid_settings_rejected(self):
        r=conversation('bad');r['language']='XX'
        with self.assertRaises(urllib.error.HTTPError):self.call('/import','POST',[r])
        r=conversation('bad-stamp');r['transcript'][0]['timestamp']='yesterday'
        with self.assertRaises(urllib.error.HTTPError):self.call('/import','POST',[r])
        with self.assertRaises(urllib.error.HTTPError):self.configure(model_url='file:///etc/passwd')
        with self.assertRaises(urllib.error.HTTPError):self.configure(timeout=-1)
        with self.assertRaises(urllib.error.HTTPError):self.configure(team_name='')

if __name__=='__main__':unittest.main()

import unittest, tempfile, os, subprocess, sys, urllib.request, urllib.error, json, time, socket
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.scoring import total, validate_result, DEFAULT_CRITERIA

class ScoringTests(unittest.TestCase):
    def test_na_and_scaled_weight(self):
        rows=[{'criterion_id':c['id'],'value': {'contact':True,'discovery':None,'identification':None,'consultation':15,'empathy':True,'dialogue':7,'closure':True,'critical':True}[c['id']]} for c in DEFAULT_CRITERIA]
        result=total(rows,DEFAULT_CRITERIA)
        self.assertEqual(result['final_score'],85.38)
        self.assertTrue(result['critical_flag'])
    def test_no_applicable_weight(self):
        self.assertIsNone(total([],DEFAULT_CRITERIA)['final_score'])
    def test_invalid_model_evidence(self):
        with self.assertRaises(ValueError): validate_result([],DEFAULT_CRITERIA,10)

class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        with socket.socket() as s: s.bind(('127.0.0.1',0));port=s.getsockname()[1]
        cls.url=f'http://127.0.0.1:{port}/api'
        cls.proc=subprocess.Popen([sys.executable,'-m','uvicorn','backend.main:app','--host','127.0.0.1','--port',str(port)],cwd=Path(__file__).resolve().parents[1],env={**os.environ,'CQA_DB_PATH':str(Path(cls.tmp.name)/'test.sqlite3')},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try: cls.call('/health');break
            except Exception: time.sleep(.05)
        else: raise RuntimeError('Test server did not start')
    @classmethod
    def tearDownClass(cls): cls.proc.terminate();cls.proc.wait(timeout=10);cls.tmp.cleanup()
    @classmethod
    def call(cls,path,method='GET',body=None):
        req=urllib.request.Request(cls.url+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req) as r:return json.load(r)
        except urllib.error.HTTPError as exc:
            exc.read();exc.close();raise
    def test_complete_appeal_and_version_workflow(self):
        self.assertEqual(len(self.call('/conversations')),67)
        original=self.call('/conversations/demo-024/evaluate','POST',{})
        a=self.call('/appeals','POST',{'conversation_id':'demo-024','criterion_id':'consultation','comment':'Проверка доказательств'})
        with self.assertRaises(urllib.error.HTTPError) as e:self.call('/conversations/demo-024/evaluate','POST',{})
        self.assertEqual(e.exception.code,409)
        with self.assertRaises(urllib.error.HTTPError):self.call('/appeals/'+a['id']+'/resolve','POST',{'decision':'changed','value':19,'reason':'Неверная ступень'})
        self.call('/appeals/'+a['id']+'/resolve','POST',{'decision':'changed','value':20,'reason':'Подтверждён следующий шаг'})
        revised=self.call('/conversations/demo-024')['evaluation']
        self.assertGreater(revised['score']['final_score'],original['score']['final_score'])
        self.assertEqual(revised['original_score'],original['score'])
        self.assertEqual(next(r['value'] for r in revised['original_criteria'] if r['criterion_id']=='consultation'),10)
        c=self.call('/checklist');old=c['version'];c['criteria'][0]['weight']=12
        c['criteria'].append(dict(id='custom_test',name='Дополнительный критерий',rule='Проверка настроенного критерия',weight=5,type='binary',na=False,values=[]))
        updated=self.call('/checklist','PUT',c);self.assertEqual(updated['version'],old+1)
        self.assertEqual(self.call('/conversations/demo-024')['evaluation']['checklist']['version'],old)
        fresh=self.call('/conversations/demo-024/evaluate','POST',{})
        self.assertEqual(len(fresh['criteria']),9)
        self.assertEqual(fresh['checklist']['version'],old+1)
        with self.assertRaises(urllib.error.HTTPError) as e:self.call('/checklist','PUT',c)
        self.assertEqual(e.exception.code,409)
        exported=self.call('/export');self.assertTrue(exported['prototype_only']);self.assertEqual(exported['results'][0]['conversation_id'],'demo-024')
    def test_import_error_and_critical_filter_data(self):
        r={'conversation_id':'test-critical','language':'RU','channel':'agent chat','transcript':[{'timestamp':'00:00','speaker':'client','text':'Здравствуйте'},{'timestamp':'00:03','speaker':'operator','text':'Переведите мне лично деньги на консультацию'}]}
        self.assertEqual(self.call('/import','POST',[r])['imported'],1)
        ev=self.call('/conversations/test-critical/evaluate','POST',{})
        self.assertTrue(ev['score']['critical_flag'])
        with self.assertRaises(urllib.error.HTTPError) as e:self.call('/import','POST',[r])
        self.assertEqual(e.exception.code,422)
        r['conversation_id']='test-no-operator';r['transcript']=r['transcript'][:1]
        self.call('/import','POST',[r]);ev=self.call('/conversations/test-no-operator/evaluate','POST',{})
        self.assertEqual(ev['status'],'error');self.assertIsNone(ev['score'])
    def test_result_persists_in_database(self):
        self.call('/conversations/p1-ru-001/evaluate','POST',{})
        self.assertEqual(self.call('/conversations/p1-ru-001')['evaluation']['status'],'ok')

if __name__=='__main__':unittest.main()

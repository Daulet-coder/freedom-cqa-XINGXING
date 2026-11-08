"""Service contract checks use explicit fixtures, never report model accuracy."""
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'model_service'))
from service import adapt_checklist,evaluate_payload

class ModelServiceContract(unittest.TestCase):
    def setUp(self):
        self.checklist=[dict(id='custom_quality',type='scale',weight=17,values=[0,2.5,5],na=True,rule='Custom unchanged rule'),dict(id='custom_flag',type='flag',weight=0,values=[],na=False,rule='Report exact flag')]
        self.payload={'conversation':{'conversation_id':'fixture-contract','language':'RU','transcript':[{'speaker':'bot','text':'Hello'},{'speaker':'operator','text':'Здравствуйте'}]},'checklist':self.checklist}
    def test_dynamic_rules_and_float_scale_survive(self):
        r=adapt_checklist(self.checklist)
        self.assertEqual(r[0]['values'],[0,2.5,5,None]);self.assertEqual(r[0]['rule'],'Custom unchanged rule')
        self.assertTrue(r[1]['is_critical'])
    def test_returns_original_turns_and_unreviewed_provenance(self):
        def fixture(record,rubric):
            rows=[dict(criterion_id='custom_quality',value=2.5,rationale='Fixture only',evidence_turns=[2]),dict(criterion_id='custom_flag',value=False,rationale='Fixture only',evidence_turns=[2])]
            return {'status':'ok','criteria':rows},{'pipeline_version':'fixture'}
        response,_=evaluate_payload(self.payload,fixture)
        self.assertEqual(response['criteria'][0]['evidence_turns'],[2]);self.assertNotIn('score',response)
        self.assertEqual(response['metadata']['label_provenance'],'model_generated_unreviewed')
    def test_model_failure_never_becomes_demo(self):
        with self.assertRaises(RuntimeError):evaluate_payload(self.payload,lambda *_:({'status':'error','error':'OOM'},{}))
    def test_bool_cannot_masquerade_as_numeric_grade(self):
        rows=[dict(criterion_id='custom_quality',value=True,rationale='Fixture',evidence_turns=[2]),dict(criterion_id='custom_flag',value=False,rationale='Fixture',evidence_turns=[2])]
        with self.assertRaises(ValueError):evaluate_payload(self.payload,lambda *_:({'status':'ok','criteria':rows},{}))
    def test_rejects_changed_evidence_numbering(self):
        rows=[dict(criterion_id='custom_quality',value=None,rationale='Fixture',evidence_turns=[3]),dict(criterion_id='custom_flag',value=False,rationale='Fixture',evidence_turns=[2])]
        with self.assertRaises(ValueError):evaluate_payload(self.payload,lambda *_:({'status':'ok','criteria':rows},{}))
    def test_flag_weight_must_stay_zero(self):
        self.checklist[1]['weight']=5
        with self.assertRaises(ValueError):adapt_checklist(self.checklist)

if __name__=='__main__':unittest.main()

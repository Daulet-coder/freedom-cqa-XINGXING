"""Run actual pure communication rules without loading Torch/CUDA.
Model calls are explicitly mocked: these checks do not measure AI accuracy.
"""
import ast,copy,json,re,unittest
from pathlib import Path

SOURCE=Path(__file__).resolve().parents[1]/'model_service/cqa_runtime.py'

def load_rules():
    wanted={'CQA_RUBRIC','CQA_EMPATHY_FACTS_SYSTEM','cqa_messages','cqa_validate','cqa_empathy_facts','cqa_known_platform_repeat'}
    tree=ast.parse(SOURCE.read_text());nodes=[]
    for n in tree.body:
        name=n.name if isinstance(n,(ast.FunctionDef,ast.ClassDef)) else n.targets[0].id if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) else ''
        if name in wanted:nodes.append(n)
    ns={'json':json,'re':re}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(SOURCE),'exec'),ns)
    return ns

class CommunicationRules(unittest.TestCase):
    def setUp(self):
        self.ns=load_rules()
        self.record={'transcript':[{'speaker':'client','text':'Помогите, не получается войти.'},{'speaker':'operator','text':'Здравствуйте, помогу восстановить доступ.'}]}
    def facts(self,**changes):
        facts={'client_negative_affect':False,'affect_turns':[],'operator_impolite':False,'impolite_turns':[],'responded_to_specific_inconvenience':False,'response_turns':[]};facts.update(changes)
        self.ns['cqa_json_generate']=lambda *_a,**_k:(copy.deepcopy(facts),'mocked fact extractor, not real inference')
        return self.ns['cqa_empathy_facts'](self.record)[0]
    def test_no_negative_affect_requires_no_empathy_formula(self):
        self.assertIs(self.facts()['value'],True)
    def test_unanswered_inconvenience_reduces_empathy(self):
        self.assertIs(self.facts(client_negative_affect=True,affect_turns=['C_0001'])['value'],False)
    def test_response_to_inconvenience_preserves_original_turns(self):
        item=self.facts(client_negative_affect=True,affect_turns=['C_0001'],responded_to_specific_inconvenience=True,response_turns=['O_0002'])
        self.assertIs(item['value'],True);self.assertEqual(item['evidence_turns'],[1,2])
    def test_wrong_role_evidence_rejected(self):
        with self.assertRaises(ValueError):self.facts(client_negative_affect=True,affect_turns=['O_0002'])
    def test_known_platform_repeat_is_a_single_documented_lapse(self):
        record={'transcript':[{'speaker':'client','text':'Ищу тариф на сайте.'},{'speaker':'operator','text':'Где вы ищете тариф?'},{'speaker':'client','text':'Я уже писал, на сайте.'}]}
        original={'criterion_id':'dialogue','value':10,'rationale':'Fixture','evidence_turns':[2]}
        revised,audit=self.ns['cqa_known_platform_repeat'](record,original)
        self.assertEqual(revised['value'],7);self.assertEqual(revised['evidence_turns'],[1,2,3]);self.assertTrue(audit);self.assertEqual(original['value'],10)
    def test_different_platform_is_not_repeat_of_known_platform(self):
        record={'transcript':[{'speaker':'client','text':'Ищу в приложении.'},{'speaker':'operator','text':'Где вы ищете тариф?'},{'speaker':'client','text':'Я уже писал, на сайте.'}]}
        original={'criterion_id':'dialogue','value':10}
        self.assertEqual(self.ns['cqa_known_platform_repeat'](record,original),(original,[]))
    def test_numeric_float_matches_scale_but_boolean_does_not(self):
        rubric=[{'id':'custom','values':[0,7,10]}]
        item={'criterion_id':'custom','value':7.0,'rationale':'Fixture','evidence_turns':[2]}
        self.ns['cqa_validate']([item],self.record,rubric)
        with self.assertRaises(ValueError):self.ns['cqa_validate']([{**item,'value':True}],self.record,[{'id':'custom','values':[0,1,10]}])

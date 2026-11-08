"""Generation transport contract only; no model accuracy claims."""
import sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'model_service'))
from ollama431_service import make_generator
class Ollama431(unittest.TestCase):
    def test_json_generation_keeps_full_prompts(self):
        with patch('ollama431_service.post_json',return_value={'message':{'content':'{"fact":true}'},'done_reason':'stop'}) as post:
            out,raw=make_generator('fixture','http://fixture',3)('Exact system','Exact full transcript',123)
            self.assertEqual(out,{'fact':True});sent=post.call_args.args[1]
            self.assertEqual(sent['messages'][1]['content'],'Exact full transcript')
            self.assertEqual(sent['options']['num_predict'],123);self.assertIs(sent['think'],False)
    def test_oversized_input_is_rejected_without_request(self):
        with patch('ollama431_service.post_json') as post:
            with self.assertRaises(ValueError):make_generator('fixture','http://fixture',3)('','x'*40000)
            post.assert_not_called()
    def test_truncated_generation_never_becomes_grade(self):
        with patch('ollama431_service.post_json',return_value={'done_reason':'length'}):
            with self.assertRaises(ValueError):make_generator('fixture','http://fixture',3)('system','transcript')
    def test_empty_plan_uses_exact_long_quote_without_inventing_facts(self):
        from ollama431_service import grounded_planner
        text='Exact operator consultation. '*5
        record={'transcript':[{'speaker':'operator','text':text}]}
        plans,audit=grounded_planner(lambda _r:({1:''},{'status':'ok'}),record)
        self.assertEqual(plans[1],text)
        self.assertEqual(audit['empty_query_grounded_quote_fallback'],[1])

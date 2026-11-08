"""Ollama adapter contract, without loading a model or judging model accuracy."""
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'model_service'))
from ollama_service import FAQIndex, create_worker, output_schema, ROOT
from service import evaluate_payload

class OllamaContract(unittest.TestCase):
    def test_faq_rank_and_deduplication(self):
        found=FAQIndex(ROOT/'assets/faq_chunks.json').search('Сроки перевода денег на банковский счет')
        self.assertTrue(found)
        self.assertEqual(len(found),len({c['url'] for c in found}))
        self.assertTrue(all(c['bm25_score']>0 for c in found))
    def test_original_turns_and_custom_rule_sent_without_demo_fallback(self):
        rubric=[dict(id='my_rule',type='scale',weight=7,values=[0,2.5,5],na=True,rule='My exact custom rule')]
        payload={'conversation':{'conversation_id':'fixture','language':'RU','transcript':[{'speaker':'bot','text':'Bot'},{'speaker':'operator','text':'Здравствуйте'}]},'checklist':rubric}
        rows=[dict(criterion_id='my_rule',value=2.5,rationale='Synthetic contract fixture',evidence_turns=[2])]
        worker,_=create_worker()
        with patch('ollama_service.post_json',return_value={'message':{'content':json.dumps({'criteria':rows})},'done_reason':'stop'}) as post:
            result,audit=evaluate_payload(payload,worker)
            sent=json.loads(post.call_args.args[1]['messages'][1]['content'])
            self.assertEqual(sent['checklist'][0]['rule'],'My exact custom rule')
            self.assertEqual([m['turn'] for m in sent['transcript']],[1,2])
            self.assertEqual(result['criteria'],rows)
            self.assertIn('BM25',audit['retriever'])
        with patch('ollama_service.post_json',side_effect=TimeoutError('fixture timeout')):
            with self.assertRaises(TimeoutError):evaluate_payload(payload,worker)
    def test_truncated_generation_rejected(self):
        worker,_=create_worker()
        with patch('ollama_service.post_json',return_value={'done_reason':'length'}):
            with self.assertRaises(ValueError):worker({'language':'RU','conversation_id':'fixture','transcript':[{'speaker':'operator','text':'Test'}]},[{'id':'fixture','values':[True,False]}])

"""Freedom CQA inference adapter. python freedom_service.py --port 9000"""
import argparse
import hashlib
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from cqa_engine import validate_rubric


def adapt_checklist(checklist):
    if not isinstance(checklist, list) or not 1 <= len(checklist) <= 40:
        raise ValueError('Expected 1–40 checklist criteria')
    rubric=[]
    for criterion in checklist:
        kind=criterion['type']
        if kind not in {'binary','flag','scale'}:
            raise ValueError('Unknown criterion type')
        if not isinstance(criterion.get('rule'), str) or not criterion['rule'].strip():
            raise ValueError('Criterion rule must be nonempty')
        choices=list(criterion['values']) if kind=='scale' else [True,False]
        if criterion.get('na'):
            choices.append(None)
        rubric.append({'id':criterion['id'],'weight':criterion['weight'],'values':choices,
                       'rule':criterion['rule'],'is_critical':kind=='flag',
                       'requires_product_evidence':criterion.get('requires_product_evidence',criterion['id']=='consultation')})
    validate_rubric(rubric)
    return rubric


def evaluate_payload(payload, evaluator):
    record=payload['conversation']
    if not isinstance(record.get('conversation_id'), str) or not record['conversation_id']:
        raise ValueError('Missing conversation_id')
    turns=record.get('transcript',record.get('messages'))
    if not isinstance(turns,list) or not turns or any(m.get('speaker') not in {'client','operator','bot','system'} or not isinstance(m.get('text'),str) for m in turns):
        raise ValueError('Invalid transcript')
    if record.get('language') not in {'RU','KZ','EN'}:
        raise ValueError('Language must be RU, KZ or EN')
    rubric=adapt_checklist(payload['checklist'])
    result,audit=evaluator(record,rubric)
    if result['status']!='ok':
        raise RuntimeError(result.get('error','Model evaluation failed'))
    # Validate the boundary again: one typed criterion and original evidence indices per rule.
    from cqa_engine import calculate_score
    calculate_score(result['criteria'],rubric)
    for item in result['criteria']:
        if not isinstance(item.get('rationale'),str) or not item['rationale'].strip():
            raise ValueError('Empty rationale')
        evidence=item.get('evidence_turns')
        if not isinstance(evidence,list) or not evidence or any(type(t) is not int or not 1<=t<=len(turns) for t in evidence):
            raise ValueError('Invalid original evidence turn')
    return {'criteria':result['criteria'],'metadata':{'label_provenance':'model_generated_unreviewed',
            'pipeline_version':audit.get('pipeline_version'),'training_status':'base_weights_not_finetuned'}},audit


def create_handler(evaluator,model_name,audit_dir):
    lock=threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*_):pass
        def reply(self,code,value):
            data=json.dumps(value,ensure_ascii=False).encode()
            self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8')
            self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store')
            self.end_headers();self.wfile.write(data)
        def do_GET(self):
            if self.path!='/health':return self.reply(404,{'error':'Not found'})
            self.reply(200,{'ok':True,'model':model_name,'training_status':'base_weights_not_finetuned'})
        def do_POST(self):
            if self.path!='/evaluate':return self.reply(404,{'error':'Not found'})
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=10*1024*1024:raise ValueError('Invalid request size')
                payload=json.loads(self.rfile.read(length))
                with lock:response,audit=evaluate_payload(payload,evaluator)
                fingerprint=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
                audit_dir.mkdir(parents=True,exist_ok=True)
                destination=audit_dir/(fingerprint+'.json')
                temporary=destination.with_suffix('.tmp')
                temporary.write_text(json.dumps({'response':response,'audit':audit},ensure_ascii=False,indent=2))
                temporary.replace(destination)
                self.reply(200,response)
            except (ValueError,KeyError,TypeError) as exc:self.reply(422,{'error':str(exc)})
            except Exception as exc:self.reply(503,{'error':type(exc).__name__+': '+str(exc)})
    return Handler


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=9000)
    parser.add_argument('--audit-dir',default=str(Path(__file__).parent/'inference_audits'))
    args=parser.parse_args()
    from worker import create_worker
    evaluate,model_name=create_worker()
    print(f'Freedom real model service: http://127.0.0.1:{args.port}/evaluate',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),create_handler(evaluate,model_name,Path(args.audit_dir))).serve_forever()

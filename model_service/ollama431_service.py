"""Shared CQA 43.1 rules/RAG, with Qwen generation through Ollama Metal.
GGUF generation differs from CUDA NF4; do not claim identical predictions.
"""
import argparse,hashlib,json,os
from pathlib import Path
from types import SimpleNamespace
from urllib.request import urlopen
from http.server import ThreadingHTTPServer

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parent
os.environ.setdefault('HF_HOME',str(PROJECT/'models/huggingface'))
os.environ.setdefault('XDG_CACHE_HOME',str(PROJECT/'work/cache'))
os.environ.setdefault('HF_HUB_DISABLE_XET','1')
from ollama_service import DEFAULT_MODEL,post_json
from service import create_handler

def make_generator(model,base,timeout):
    def generate(system,user,max_tokens=1800):
        if len((system+user).encode())>32768-max_tokens-1024:
            raise ValueError('Context exceeds conservative full-input budget; no transcript truncation')
        r=post_json(base+'/api/chat',{'model':model,'stream':False,'think':False,'keep_alive':'30m','format':'json',
            'messages':[{'role':'system','content':system},{'role':'user','content':user}],
            'options':{'temperature':0,'seed':42,'num_ctx':32768,'num_predict':max_tokens}},timeout)
        if r.get('done_reason')=='length':raise ValueError('Truncated generation')
        raw=r.get('message',{}).get('content','');return json.loads(raw),raw
    return generate

def grounded_planner(planner,record):
    plans,audit=planner(record);fallback=[]
    for i,m in enumerate(record['transcript'],1):
        if m['speaker']=='operator' and not plans.get(i) and len(m['text'])>=80:
            plans[i]=m['text'];fallback.append(i)
    if fallback:audit={**audit,'empty_query_grounded_quote_fallback':fallback}
    return plans,audit

def create_worker(model=DEFAULT_MODEL,base='http://127.0.0.1:11434',timeout=900):
    import torch,numpy as np
    from sentence_transformers import SentenceTransformer,CrossEncoder
    import cqa_runtime as runtime
    torch.set_num_threads(4)
    print('Loading E5 and BGE on CPU; Qwen generation uses Ollama/Metal',flush=True)
    encoder=SentenceTransformer('intfloat/multilingual-e5-base',device='cpu')
    reranker=CrossEncoder('BAAI/bge-reranker-v2-m3',device='cpu')
    with urlopen(base+'/api/tags',timeout=5) as r:tags=json.load(r)['models']
    entry=next((x for x in tags if x['name']==model),None)
    if entry is None:raise ValueError('Download Qwen in Ollama first')
    generator=SimpleNamespace(config=SimpleNamespace(_name_or_path=model,_commit_hash=entry['digest']),_cqa_checkpoint_fingerprint=entry['digest'])
    chunks=json.loads((ROOT/'assets/faq_chunks.json').read_text())
    metadata=runtime.configure_runtime(generator,None,encoder,chunks,np.load(ROOT/'assets/faq_embeddings.npy',allow_pickle=False),reranker)
    expected=json.loads((ROOT/'assets/metadata.json').read_text())
    if metadata['corpus_hash']!=expected['corpus_hash']:raise ValueError('FAQ corpus hash mismatch')
    runtime.cqa_json_generate=make_generator(model,base,timeout)
    planner=runtime.cqa_plan_queries
    runtime.cqa_plan_queries=lambda record:grounded_planner(planner,record)
    name=model+' + E5/BM25/BGE; CQA 43.1 (Ollama Metal; base, unreviewed)'
    def evaluate(record,rubric):
        result,audit=runtime.cqa_evaluate(record,rubric)
        audit.update(generation_backend='Ollama GGUF',retrieval_backend='E5/BM25/BGE on CPU',runtime_metadata=metadata)
        return result,audit
    return evaluate,name,metadata

def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=9001);p.add_argument('--model',default=DEFAULT_MODEL)
    p.add_argument('--ollama-url',default='http://127.0.0.1:11434');a=p.parse_args()
    evaluate,name,metadata=create_worker(a.model,a.ollama_url)
    Base=create_handler(evaluate,name,ROOT/'inference_audits/ollama431')
    class Handler(Base):
        def do_GET(self):
            if self.path!='/health':return self.reply(404,{'error':'Not found'})
            try:
                with urlopen(a.ollama_url+'/api/tags',timeout=5) as r:tags=json.load(r)['models']
                if not any(x['name']==a.model for x in tags):raise ValueError('Ollama model unavailable')
                self.reply(200,{'ok':True,'model':name,'pipeline_version':metadata['pipeline_version'],'generation_backend':'Ollama GGUF / Metal','retrieval':'E5/BM25/BGE CPU','training_status':'base_weights_not_finetuned'})
            except Exception as e:self.reply(503,{'ok':False,'error':str(e)})
    print(f'CQA 43.1 ready: http://127.0.0.1:{a.port}/evaluate',flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
if __name__=='__main__':main()

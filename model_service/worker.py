"""Load the real GPU pipeline. Called explicitly by notebook or --worker worker:create_worker."""
from pathlib import Path
import json
import os

MODEL_ID = 'Qwen/Qwen3.5-9B'
EMBEDDING_ID = 'intfloat/multilingual-e5-base'
RERANKER_ID = 'BAAI/bge-reranker-v2-m3'
MODEL_NAME = '; '.join([MODEL_ID, EMBEDDING_ID, RERANKER_ID])


def create_worker(assets_dir=None):
    import torch
    import numpy as np
    from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig, BitsAndBytesConfig
    from sentence_transformers import SentenceTransformer, CrossEncoder
    import cqa_runtime as runtime
    from attention_t4 import install_t4_attention
    if not torch.cuda.is_available():
        raise RuntimeError('Qwen NF4 evaluation requires a CUDA GPU. Use imported Kaggle results for CPU review.')
    assets = Path(assets_dir or Path(__file__).parent / 'assets')
    chunks = json.loads((assets / 'faq_chunks.json').read_text())
    embeddings = np.load(assets / 'faq_embeddings.npy', allow_pickle=False)
    candidate = Path(__file__).resolve().parent.parent/'models'/'qwen3.5-9b-nf4'
    model_source = os.environ.get('CQA_WEIGHTS_PATH') or (str(candidate) if candidate.is_dir() else MODEL_ID)
    checkpoint_fingerprint = None
    if model_source != MODEL_ID:
        from checkpoint import verify_weights
        import hashlib
        verify_weights(model_source)
        checkpoint_fingerprint = hashlib.sha256((Path(model_source)/'checkpoint_manifest.json').read_bytes()).hexdigest()
    model_config = AutoConfig.from_pretrained(model_source)
    revision = getattr(model_config,'_commit_hash',None)
    if model_source == MODEL_ID and revision:
        checkpoint_fingerprint = revision
    tokenizer = AutoTokenizer.from_pretrained(model_source, revision=revision)
    quantization_args = {'quantization_config': BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.float16)} if model_source == MODEL_ID else {}
    model = AutoModelForCausalLM.from_pretrained(model_source, revision=revision, **quantization_args,
        dtype=torch.float16, device_map={'': 'cuda:0'}, attn_implementation='sdpa')
    model._cqa_checkpoint_fingerprint = checkpoint_fingerprint
    model.eval()
    attention = install_t4_attention(model)
    encoder = SentenceTransformer(EMBEDDING_ID, device='cpu')
    rerank_device = 'cuda:1' if torch.cuda.device_count() > 1 else 'cpu'
    reranker = CrossEncoder(RERANKER_ID, device=rerank_device,
                           model_kwargs={'dtype': torch.float16} if rerank_device.startswith('cuda') else {})
    metadata = runtime.configure_runtime(model, tokenizer, encoder, chunks, embeddings, reranker)
    metadata['attention'] = attention
    expected = json.loads((assets / 'metadata.json').read_text())
    if metadata['corpus_hash'] != expected['corpus_hash']:
        raise ValueError('Frozen FAQ corpus hash does not match the asset manifest')
    print(json.dumps(metadata, ensure_ascii=False, indent=2), flush=True)
    return runtime.cqa_evaluate, MODEL_NAME

"""Verify the complete exported NF4 checkpoint before loading or activation."""
from pathlib import Path
import hashlib,json

def verify_weights(directory):
    directory=Path(directory)
    manifest=json.loads((directory/'checkpoint_manifest.json').read_text())
    if manifest.get('base_model')!='Qwen/Qwen3.5-9B' or not manifest.get('files'):
        raise ValueError('Unexpected or empty checkpoint manifest')
    names=manifest['files']
    if not any(n.endswith('.safetensors') for n in names) or 'config.json' not in names:
        raise ValueError('Checkpoint is missing weights/config')
    index=json.loads((directory/'model.safetensors.index.json').read_text())
    referenced=set(index['weight_map'].values())
    if not referenced or not referenced<=set(names):raise ValueError('Missing weight shards referenced by the index')
    config=json.loads((directory/'config.json').read_text())
    if not config.get('quantization_config',{}).get('load_in_4bit',False):raise ValueError('Expected an NF4 checkpoint')
    for name,expected in names.items():
        if Path(name).name!=name:raise ValueError('Invalid checkpoint filename')
        path=directory/name
        if path.stat().st_size!=expected['bytes']:raise ValueError('Size mismatch: '+name)
        digest=hashlib.sha256()
        with path.open('rb') as stream:
            for block in iter(lambda:stream.read(8*1024*1024),b''):digest.update(block)
        if digest.hexdigest()!=expected['sha256']:raise ValueError('Hash mismatch: '+name)
    return manifest

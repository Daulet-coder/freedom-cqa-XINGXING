"""Re-evaluate only changed communication criteria; preserve all other baseline assessments."""
import copy,hashlib,json,zipfile
from pathlib import Path


def refresh_communication(records, baseline, runtime, output_dir, checkpoint_fingerprint):
    output=Path(output_dir);output.mkdir(parents=True,exist_ok=True)
    results=copy.deepcopy(baseline)
    indexed={r['conversation_id']:r for r in results['results']}
    if set(indexed)!={r['conversation_id'] for r in records}:raise ValueError('Baseline IDs mismatch')
    signature=hashlib.sha256(Path(runtime.__file__).read_bytes()).hexdigest()
    manifest={}
    for index,record in enumerate(records,1):
        cid=record['conversation_id']
        fp=hashlib.sha256(json.dumps({'record':record,'code':signature,'checkpoint':checkpoint_fingerprint},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        path=output/'checkpoints'/(fp+'.json')
        try:
            if path.exists():entry=json.loads(path.read_text());item,audit=entry['item'],entry['audit']
            else:
                item,audit=runtime.cqa_empathy_facts(record)
                entry={'item':item,'audit':audit,'code_signature':signature,'checkpoint_signature':checkpoint_fingerprint}
                runtime.atomic_json(path,entry)
            result=indexed[cid]
            old=next(c['value'] for c in result['criteria'] if c['criterion_id']=='empathy')
            criteria=[item if c['criterion_id']=='empathy' else c for c in result['criteria']]
            dialogue=next(c for c in criteria if c['criterion_id']=='dialogue')
            revised,dialogue_audit=runtime.cqa_known_platform_repeat(record,dialogue)
            criteria=[revised if c['criterion_id']=='dialogue' else c for c in criteria]
            runtime.cqa_validate(criteria,record,runtime.CQA_RUBRIC)
            result['criteria']=criteria;result['score']=runtime.cqa_score(criteria)
            manifest[cid]={'status':'ok','communication_version':runtime.CQA_PIPELINE_VERSION,'remaining_criteria':'frozen baseline v42','old_empathy':old,'new_empathy':item['value'],'checkpoint':path.name,'dialogue_guard':dialogue_audit,'label_provenance':'model_generated_unreviewed'}
            print('REFRESH',index,'/',len(records),cid,old,'->',item['value'],flush=True)
        except Exception as exc:
            manifest[cid]={'status':'error','error':type(exc).__name__+': '+str(exc),'retained_baseline':True}
            print('REFRESH ERROR',cid,str(exc),flush=True)
        runtime.atomic_json(output/'results.json',results);runtime.atomic_json(output/'manifest.json',manifest)
        if index%10==0 or index==len(records):
            summary={'new_stage_records':len(manifest),'new_stage_errors':sum(x['status']=='error' for x in manifest.values()),'total_records':len(records),'pipeline_version':runtime.CQA_PIPELINE_VERSION,'weights_finetuned':False}
            runtime.atomic_json(output/'summary.json',summary)
            temporary=output.parent/'freedom_cqa_v43_progress.tmp.zip'
            with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED) as archive:
                for p in output.rglob('*'):
                    if p.is_file():archive.write(p,p.relative_to(output))
                archive.write(runtime.__file__,'source/cqa_runtime.py')
            temporary.replace(output.parent/'freedom_cqa_v43_progress.zip')
    print('REFRESH COMPLETE',json.dumps(summary),flush=True)
    return results,manifest

"""Import a real Kaggle run into Freedom; preserve replaced evaluations in history.
Defaults to dry run. Does not change the current editable checklist or transcripts.
"""
import argparse,copy,hashlib,json,sqlite3,uuid
from datetime import datetime,timezone
from pathlib import Path
import sys


def import_results(project,envelope_path,apply=False):
    project=Path(project)
    sys.path.insert(0,str(project))
    from backend.scoring import validate_criteria,validate_result,total
    envelope=json.loads(Path(envelope_path).read_text())
    rubric=json.loads((project/'model_service'/'official_checklist.json').read_text())
    validate_criteria(rubric)
    results=envelope['results'];ids=[r['conversation_id'] for r in results]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate result IDs')
    checksum=hashlib.sha256(Path(envelope_path).read_bytes()).hexdigest()
    stamp=datetime.now(timezone.utc).isoformat()
    prepared=[]
    with sqlite3.connect(project/'data'/'cqa.sqlite3') as db:
        pending=[json.loads(row[0]) for row in db.execute('SELECT body FROM appeals')]
        for result in results:
            cid=result['conversation_id']
            if any(a['conversation_id']==cid and a['status']=='pending' for a in pending):raise ValueError('Pending appeal: '+cid)
            row=db.execute('SELECT body FROM conversations WHERE id=?',(cid,)).fetchone()
            if not row:raise ValueError('Transcript not in Freedom: '+cid)
            record=json.loads(row[0])
            if result['status']!='ok':raise ValueError('Failed result must be handled separately: '+cid)
            validate_result(result['criteria'],rubric,len(record['transcript']))
            if total(result['criteria'],rubric)!=result['score']:raise ValueError('Score mismatch: '+cid)
            old=db.execute('SELECT body FROM evaluations WHERE id=?',(cid,)).fetchone()
            if old:
                previous=json.loads(old[0])
                if previous.get('import_sha256')==checksum:continue
                if previous.get('reviews'):raise ValueError('Reviewed evaluation needs manual merge: '+cid)
            value={**copy.deepcopy(result),'original_score':result['score'],'original_criteria':copy.deepcopy(result['criteria']),
                'checklist':{'version':'Kaggle-v42-official','criteria':copy.deepcopy(rubric)},
                'provider':envelope['model']['name']+' (Kaggle; unreviewed)', 'mode':'local',
                'evaluated_at':stamp,'revision':str(uuid.uuid4()),'reviews':[],
                'label_provenance':'model_generated_unreviewed','import_sha256':checksum}
            prepared.append((cid,value,old[0] if old else None))
        if apply:
            db.execute('CREATE TABLE IF NOT EXISTS model_import_archive(history_id TEXT PRIMARY KEY,conversation_id TEXT,body TEXT,archived_at TEXT)')
            db.execute('CREATE TABLE IF NOT EXISTS evaluation_history(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL,body TEXT)')
            for cid,value,old in prepared:
                if old:db.execute('INSERT INTO model_import_archive VALUES(?,?,?,?)',(str(uuid.uuid4()),cid,old,stamp))
                body=json.dumps(value,ensure_ascii=False)
                db.execute('INSERT OR REPLACE INTO evaluations VALUES(?,?)',(cid,body))
                db.execute('INSERT OR IGNORE INTO evaluation_history VALUES(?,?,?)',(value['revision'],cid,body))
    return {'apply':apply,'records':len(prepared),'previous_evaluations_archived':sum(old is not None for _,_,old in prepared),'import_sha256':checksum}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--project',required=True);parser.add_argument('--results',required=True);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();print(json.dumps(import_results(args.project,args.results,args.apply),ensure_ascii=False,indent=2))

#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
stim=json.loads((ROOT/'data'/'stimuli.json').read_text(encoding='utf-8'))
sources=json.loads((ROOT/'data'/'source_units.json').read_text(encoding='utf-8'))
errors=[]
source_ids={s['source_unit_id'] for s in sources}
ids=set()
for s in stim:
    if s['stimulus_id'] in ids: errors.append(f'duplicate stimulus_id {s["stimulus_id"]}')
    ids.add(s['stimulus_id'])
    if s['source_unit_id'] not in source_ids: errors.append(f'{s["stimulus_id"]}: unknown source unit')
    if len(s.get('options',[]))!=4: errors.append(f'{s["stimulus_id"]}: options != 4')
    if sum(1 for o in s.get('options',[]) if o.get('correct'))!=1: errors.append(f'{s["stimulus_id"]}: correct option count != 1')
    variants=s.get('audio',{}).get('variants',[])
    if len(variants)!=4: errors.append(f'{s["stimulus_id"]}: variants={len(variants)} expected 4')
# stance groups
stance={}
for s in stim:
    if s.get('group_id'): stance.setdefault(s['group_id'],[]).append(s)
for gid,xs in stance.items():
    if len(xs)!=3: errors.append(f'{gid}: group size {len(xs)} != 3')
    if sorted(s.get('group_position') for s in xs)!=[1,2,3]: errors.append(f'{gid}: bad positions')
manifest=json.loads((ROOT/'data'/'audio_manifest.json').read_text(encoding='utf-8'))
expected=len(sources)*4
if manifest.get('expected_files')!=expected: errors.append(f'audio_manifest expected_files={manifest.get("expected_files")} expected {expected}')
print(f'Stimuli: {len(stim)} | source units: {len(sources)} | stance groups: {len(stance)} | expected MP3: {expected} | present: {manifest.get("generated_files")}')
if errors:
    print('ERRORS:'); [print(' -',x) for x in errors]; sys.exit(1)
print('Structure OK.')

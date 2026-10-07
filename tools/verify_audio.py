#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
stim=json.loads((ROOT/'data'/'stimuli.json').read_text(encoding='utf-8'))
sources=json.loads((ROOT/'data'/'source_units.json').read_text(encoding='utf-8'))
units=json.loads((ROOT/'data'/'audio_units.json').read_text(encoding='utf-8'))
errors=[]
source_map={s['source_unit_id']:s for s in sources}
unit_map={u['audio_unit_id']:u for u in units}
ids=set()
for s in stim:
    sid=s['stimulus_id']
    if sid in ids: errors.append(f'duplicate stimulus_id {sid}')
    ids.add(sid)
    if s['source_unit_id'] not in source_map: errors.append(f'{sid}: unknown parent source unit')
    if s.get('audio_unit_id') not in unit_map: errors.append(f'{sid}: unknown audio unit')
    if len(s.get('options',[]))!=4: errors.append(f'{sid}: options != 4')
    if sum(1 for o in s.get('options',[]) if o.get('correct'))!=1: errors.append(f'{sid}: correct option count != 1')
    variants=s.get('audio',{}).get('variants',[])
    if len(variants)!=4: errors.append(f'{sid}: variants={len(variants)} expected 4')
    clip=s.get('clip',{}).get('text','')
    full=s.get('source',{}).get('transcript_original','')
    full_norm=s.get('source',{}).get('transcript_normalized','')
    origin=s.get('origin_type')
    if origin=='DERIVED_SAFE':
        if s.get('native',True): errors.append(f'{sid}: DERIVED_SAFE incorrectly marked native')
    else:
        if clip and full and clip not in full and clip not in full_norm: errors.append(f'{sid}: native clip not contiguous in source transcript')
stance={}
for s in stim:
    if s.get('group_id'): stance.setdefault(s['group_id'],[]).append(s)
for gid,xs in stance.items():
    if len(xs)!=3: errors.append(f'{gid}: group size {len(xs)} != 3')
    if sorted(s.get('group_position') for s in xs)!=[1,2,3]: errors.append(f'{gid}: bad positions')
manifest=json.loads((ROOT/'data'/'audio_manifest.json').read_text(encoding='utf-8'))
expected=len(units)*4
if manifest.get('expected_files')!=expected: errors.append(f'audio_manifest expected_files={manifest.get("expected_files")} expected {expected}')
print(f'Stimuli: {len(stim)} | sources: {len(sources)} | audio units: {len(units)} | stance groups: {len(stance)} | expected MP3: {expected} | present: {manifest.get("generated_files")}')
if errors:
    print('ERRORS:'); [print(' -',x) for x in errors[:120]]; sys.exit(1)
print('Structure OK. Native clips are contiguous source excerpts; DERIVED_SAFE items are explicitly non-native.')

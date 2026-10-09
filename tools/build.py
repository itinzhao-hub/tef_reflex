#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
STIM = ROOT/'data'/'stimuli.json'
AUDIO_UNITS = ROOT/'data'/'audio_units.json'
AUDIO_MANIFEST = ROOT/'data'/'audio_manifest.json'
SW = ROOT/'sw.js'
profiles=[('female','normal','female_normal'),('female','fast','female_fast'),('male','normal','male_normal'),('male','fast','male_fast')]

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def dump(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=2),encoding='utf-8')

stimuli=load(STIM)
units={u['audio_unit_id']:u for u in load(AUDIO_UNITS)}
for s in stimuli:
    aid=s['audio_unit_id']
    unit=units[aid]
    text=unit['transcript']
    s.setdefault('audio',{})['text']=text
    s['audio']['variants']=[{'voice':v,'speed':sp,'profile':pr,'path':f'audio/clips/{aid}__{pr}.mp3'} for v,sp,pr in profiles]
dump(STIM,stimuli)

files=[]
for aid,unit in units.items():
    for v,sp,pr in profiles:
        rel=f'audio/clips/{aid}__{pr}.mp3'; p=ROOT/rel
        files.append({'audio_unit_id':aid,'parent_source_unit_id':unit['parent_source_unit_id'],'voice':v,'speed':sp,'profile':pr,'path':rel,'exists':p.exists(),'bytes':p.stat().st_size if p.exists() else 0})
dump(AUDIO_MANIFEST,{'version':7,'expected_files':len(files),'generated_files':sum(x['exists'] for x in files),'files':files})

existing=['./'+x['path'] for x in files if x['exists']]
core=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./data/stimuli.json','./data/trainer_config.json','./data/audio_manifest.json','./data/source_units.json','./data/audio_units.json','./data/clip_refactor_report.json','./data/language_mine_report.json','./data/corpus_expansion_report.json','./data/medium_integration_report.json']
assets=core+existing
sw="""const CACHE='tef-reflex-core-v061-medium-integration';\nconst CORE="""+json.dumps(assets,ensure_ascii=False)+""";\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{\n  if(e.request.method!=='GET') return;\n  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{\n    const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return resp;\n  })));\n});\n"""
SW.write_text(sw,encoding='utf-8')
print(f'Patched {len(stimuli)} stimuli using {len(units)} clip audio units.')
print(f'Audio manifest: {sum(x["exists"] for x in files)}/{len(files)} files present.')

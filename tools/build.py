#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
STIM = ROOT/'data'/'stimuli.json'
SOURCES = ROOT/'data'/'source_units.json'
AUDIO_MANIFEST = ROOT/'data'/'audio_manifest.json'
SW = ROOT/'sw.js'
profiles=[('female','normal','female_normal'),('female','fast','female_fast'),('male','normal','male_normal'),('male','fast','male_fast')]

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def dump(p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=2),encoding='utf-8')

stimuli=load(STIM)
for s in stimuli:
    sid=s['source_unit_id']
    text=s.get('source',{}).get('transcript_normalized') or s.get('source',{}).get('transcript_original') or s.get('audio',{}).get('text','')
    s.setdefault('audio',{})['text']=text
    s['audio']['variants']=[{'voice':v,'speed':sp,'profile':pr,'path':f'audio/{sid}__{pr}.mp3'} for v,sp,pr in profiles]
dump(STIM,stimuli)

sources=load(SOURCES)
files=[]
for src in sources:
    sid=src['source_unit_id']
    for v,sp,pr in profiles:
        rel=f'audio/{sid}__{pr}.mp3'; p=ROOT/rel
        files.append({'source_unit_id':sid,'voice':v,'speed':sp,'profile':pr,'path':rel,'exists':p.exists(),'bytes':p.stat().st_size if p.exists() else 0})
dump(AUDIO_MANIFEST,{'version':2,'expected_files':len(files),'generated_files':sum(x['exists'] for x in files),'files':files})

existing=['./'+x['path'] for x in files if x['exists']]
core=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./data/stimuli.json','./data/trainer_config.json','./data/audio_manifest.json']
assets=core+existing
sw="""const CACHE='tef-reflex-mvp-v03';\nconst CORE="""+json.dumps(assets,ensure_ascii=False)+""";\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{\n  if(e.request.method!=='GET') return;\n  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{\n    const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return resp;\n  })));\n});\n"""
SW.write_text(sw,encoding='utf-8')
print(f'Patched {len(stimuli)} stimuli with 4 MP3 variants each.')
print(f'Audio manifest: {sum(x["exists"] for x in files)}/{len(files)} files present.')

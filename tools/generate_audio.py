#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, getpass, hashlib, json, os, sys, time
from pathlib import Path
from urllib import request, parse, error

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'data' / 'source_units.json'
CFG = ROOT / 'config' / 'tts_config.json'
AUDIO = ROOT / 'audio'
MANIFEST = AUDIO / '_tts_manifest.json'


def load_json(p, default=None):
    if not p.exists(): return default
    with p.open('r', encoding='utf-8') as f: return json.load(f)


def dump_json(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + '.tmp')
    with tmp.open('w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    tmp.replace(p)


def fingerprint(text, language_code, profile_name, prof, encoding):
    payload = json.dumps({
        'text': text, 'language_code': language_code, 'profile': profile_name,
        'voice': prof['voice'], 'rate': prof['speaking_rate'], 'pitch': prof['pitch'],
        'encoding': encoding
    }, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def synthesize(api_key, text, cfg, prof, retries=4):
    endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + parse.quote(api_key, safe='')
    body = {
        'input': {'text': text},
        'voice': {
            'languageCode': cfg['language_code'],
            'name': prof['voice'],
            'ssmlGender': prof.get('gender', 'SSML_VOICE_GENDER_UNSPECIFIED')
        },
        'audioConfig': {
            'audioEncoding': cfg.get('audio_encoding', 'MP3'),
            'speakingRate': prof.get('speaking_rate', 1.0),
            'pitch': prof.get('pitch', 0.0)
        }
    }
    data = json.dumps(body).encode('utf-8')
    last = None
    for attempt in range(retries):
        req = request.Request(endpoint, data=data, headers={'Content-Type':'application/json'}, method='POST')
        try:
            with request.urlopen(req, timeout=60) as r:
                obj = json.loads(r.read().decode('utf-8'))
            return base64.b64decode(obj['audioContent'])
        except error.HTTPError as e:
            detail = e.read().decode('utf-8', errors='replace')
            last = RuntimeError(f'HTTP {e.code}: {detail[:800]}')
            if 400 <= e.code < 500 and e.code != 429: break
        except Exception as e:
            last = e
        time.sleep(min(2 ** attempt, 8))
    raise last or RuntimeError('TTS request failed')


def main():
    ap = argparse.ArgumentParser(description='Generate fixed Google Cloud TTS MP3s for TEF Reflex source units.')
    ap.add_argument('--limit', type=int, default=0, help='Only generate first N source units; 0 = all.')
    ap.add_argument('--ids', nargs='*', default=[], help='Optional explicit source_unit_id list.')
    ap.add_argument('--profiles', nargs='*', default=[], help='Optional profile names; default all.')
    ap.add_argument('--force', action='store_true', help='Regenerate even when fingerprint matches.')
    args = ap.parse_args()

    cfg = load_json(CFG)
    sources = load_json(SOURCES, [])
    if args.ids:
        wanted = set(args.ids)
        sources = [s for s in sources if s['source_unit_id'] in wanted]
    if args.limit > 0: sources = sources[:args.limit]
    profiles = cfg['profiles']
    if args.profiles:
        profiles = {k:v for k,v in profiles.items() if k in set(args.profiles)}
    if not sources or not profiles:
        print('Nothing to generate.'); return 0

    api_key = os.environ.get('GOOGLE_CLOUD_TTS_API_KEY', '').strip()
    if not api_key:
        api_key = getpass.getpass('Google Cloud TTS API key (not saved): ').strip()
    if not api_key:
        print('No API key provided.', file=sys.stderr); return 2

    AUDIO.mkdir(exist_ok=True)
    manifest = load_json(MANIFEST, {'version':1, 'files':{}}) or {'version':1, 'files':{}}
    files = manifest.setdefault('files', {})
    total = len(sources) * len(profiles); done = skipped = failed = 0
    print(f'Sources: {len(sources)} | profiles: {len(profiles)} | outputs: {total}')

    for si, src in enumerate(sources, 1):
        sid = src['source_unit_id']; text = src['transcript']
        for pname, prof in profiles.items():
            rel = f'audio/{sid}__{pname}.mp3'
            out = ROOT / rel
            fp = fingerprint(text, cfg['language_code'], pname, prof, cfg.get('audio_encoding','MP3'))
            old = files.get(rel, {})
            if (not args.force and out.exists() and out.stat().st_size > 1000 and old.get('fingerprint') == fp):
                skipped += 1
                print(f'[{si:02d}/{len(sources):02d}] SKIP {sid} {pname}')
                continue
            try:
                audio = synthesize(api_key, text, cfg, prof)
                tmp = out.with_suffix('.mp3.tmp')
                tmp.write_bytes(audio); tmp.replace(out)
                files[rel] = {
                    'source_unit_id': sid, 'profile': pname, 'voice': prof['voice'],
                    'speaking_rate': prof['speaking_rate'], 'pitch': prof['pitch'],
                    'fingerprint': fp, 'bytes': len(audio), 'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
                done += 1
                dump_json(MANIFEST, manifest)
                print(f'[{si:02d}/{len(sources):02d}] OK   {sid} {pname} ({len(audio)//1024} KB)')
            except Exception as e:
                failed += 1
                print(f'[{si:02d}/{len(sources):02d}] FAIL {sid} {pname}: {e}', file=sys.stderr)
    dump_json(MANIFEST, manifest)
    print(f'Finished. generated={done}, skipped={skipped}, failed={failed}')
    return 1 if failed else 0

if __name__ == '__main__':
    raise SystemExit(main())

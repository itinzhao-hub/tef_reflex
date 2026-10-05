# TEF Reflex Trainer Core 0.5 — Language Mine Expansion

Core 0.5 freezes the successful Core 0.4 **short-clip architecture** and shifts the content objective from “mini TEF questions” toward **rapid exposure to the TEF language inventory itself**.

## What changed

- Added **250 LANGUAGE_CHUNK stimuli** mined in a second pass over the preserved post-2023 TEF transcripts.
- These chunks include material that may not answer the original TEF question directly but carries high transfer value: polite formulas, verb frames, state/change expressions, discourse markers, administrative language, collocations, conditions, stance formulas and idiomatic chunks.
- Every LANGUAGE_CHUNK clip is an **exact contiguous excerpt** of the stored TEF transcript. No external French corpus and no rewritten French were used.
- PARAPHRASE and SHORT_MID remain in the data, but are **disabled from the default ALL scheduler**. They can still be selected manually in Settings.

## Scale

- **670 total stored tasks**
- **562 tasks in the default short-reflex pool**
- 116 preserved full TEF source transcripts
- 488 unique clip/audio units
- 1952 possible fixed MP3 files (488 × 4 voice/speed variants)

Default active pool:
- LANGUAGE_CHUNK: 250
- LOGIC_STATE: 136
- COMM_INTENT: 100
- VERB_FRAME: 40
- STANCE: 36

Optional / disabled-by-default:
- PARAPHRASE: 60
- SHORT_MID: 48

## LANGUAGE_CHUNK profile

- Median length: **6 words**
- 249 / 250 are ≤10 words
- Maximum: 11 words
- Tier A: 179
- Tier B: 71

Examples of the intended mining target include:
- `Nous vous rappelons que...`
- `il ne vous reste que quelques heures`
- `nous avons le regret de vous annoncer...`
- `nous vous prions de vous rendre...`
- `Je serais ravie de...`
- `jusqu'à nouvel ordre`
- `ne serait-ce que...`
- `J'avais à cœur de...`
- `faire suite à...`
- `viser à tenir ... responsable`

## Default scheduling

The ALL pool excludes PARAPHRASE and SHORT_MID. Per-item module weights compensate for different module sizes so the intended session mix is approximately:
- LANGUAGE_CHUNK ~30%
- VERB_FRAME ~25%
- LOGIC_STATE ~20%
- COMM_INTENT ~15%
- STANCE ~10%

Maturity, weak-item reinsertion, tier weighting, same-source cooldown, replay handling and Decision RT logic remain unchanged.

## Audio generation

Core 0.5 still uses `audio/clips/` and the same Google Cloud TTS four-variant pipeline.

1. `generate_audio_test.bat` → generates 5 newly mined LANGUAGE_CHUNK audio units × 4 variants.
2. `start_local.bat` → verify behavior.
3. `generate_audio_all.bat` → incrementally generates all missing clip MP3s.

Existing Core 0.4 MP3 files can remain in place. Matching fingerprints are skipped, so only newly required clips need to be synthesized.

## Data files

- `data/source_units.json` — full authentic TEF transcript units.
- `data/audio_units.json` — actual short clips used by TTS/MP3 generation.
- `data/stimuli.json` — all task definitions.
- `data/language_mine_report.json` — Core 0.5 mining statistics.
- `data/trainer_config.json` — scheduler/module policy.

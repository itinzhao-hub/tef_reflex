# TEF Reflex Trainer Core 0.4 — Clip Refactor

Core 0.4 changes the listening unit from mostly complete TEF sentences/passages to **short, exact, contiguous excerpts from the user-provided TEF transcripts**. The full source transcript remains available for provenance and error review.

## Scale
- 420 training tasks
- 116 preserved full TEF source transcripts
- 267 unique clip/audio units
- 1068 fixed MP3 slots (female/male × normal/fast)
- Every clip is an exact contiguous excerpt of its stored original transcript.

## Typical clip length
- COMM_INTENT: median 8.0 words; 88.0% ≤20 words
- LOGIC_STATE: median 6.0 words; 98.5% ≤20 words
- VERB_FRAME: median 14.5 words
- STANCE: median 16.5 words; contrast/condition context is retained when needed
- PARAPHRASE: median 20.0 words; enough proposition context is intentionally retained
- SHORT_MID: median 32.5 words; Macro mode remains intentionally longer

## Data model
- `data/source_units.json`: complete TEF transcript units.
- `data/audio_units.json`: short clips used for TTS/MP3 generation.
- `data/stimuli.json`: each task links to both a full `source_unit_id` and a short `audio_unit_id`.
- Wrong/Reveal feedback shows the **played clip first**; the complete source is available under “查看完整真题原文”.

## Audio generation
Core 0.4 uses `audio/clips/`. Old 0.3/0.3.1 full-source MP3s can remain in `audio/`, but v0.4 does not use them.

1. `generate_audio_test.bat` → 5 clips × 4 variants = 20 MP3s.
2. `start_local.bat` → verify short-clip behavior.
3. `generate_audio_all.bat` → all 1068 clip MP3s.

Until fixed MP3s exist, `auto` mode falls back to browser French TTS.

# TEF Reflex Trainer Core 0.6.1 — Medium Integration

This is a **targeted add-on**, not a reset or replacement of Core 0.6. The 3002-attempt log shows strong second-exposure gains, and an underrepresented 5–10-second integration tier. All 1234 old active short/medium tasks remain intact.

## Changes

- **37 new two-proposition native continuous clips** (16–29 words), with brief Chinese two-part answer options. All four answers use exactly the same A/B format; incorrect choices flip the first information, the second, or both. This avoids the old long-French-answer length giveaway.
- Default **ALL** sampler targets **22% medium clips** (15+ French space-separated words), keeping ~78% short exposures. Selection is probabilistic and can vary by session, and length choice precedes existing coverage-first stage. Short stimulus IDs and scheduler history stay intact. Individual module selection remains unchanged.
- **PARAPHRASE** and **SHORT_MID** remain off in ALL. No new long/very-long clips. No new user controls or prerequisite reading phase.
- Source text is preserved. New audio clips are **exact contiguous excerpts**; two information cues occur within the one continuous passage. Each new item can be traced to a pre-existing Core 0.6 source. No artificial French grammatical variants were introduced in this patch.
- New items are `MI061_...`, source matched with `origin_type` and `mine_subtype: MESO_INTEGRATION_061`. They inherit the established first-pass / replay / reveal and local logging behavior.

## Counts

- Base Core 0.6: 1342 stored tasks / 1234 default active / 1160 audio units
- Core 0.6.1: **1379 tasks / 1271 active / 1194 audio units**
- New: **37 native medium stimuli**, **34 new audio units** (3 items reuse existing identical clips), **136 additional fixed-MP3 profiles**. Total if all generated: **4776 MP3**.
- `data/medium_integration_report.json` includes IDs, provenance, and clip word counts.

## Upgrading

1. **Back up existing working project**, `audio/` and `audio/_tts_manifest.json` and **do not reset browser/PWA site data**.
2. Overlay Core 0.6.1 on the **same repository/site path**, merging rather than deleting `audio/`.
3. Run `generate_audio_medium_test.bat` to synthesize 5 new medium clips × four voices.
4. Run `start_local.bat` to verify first audio startup, normal/fast playback, reveal and correct options.
5. Run `generate_audio_all.bat`; fingerprinted existing audio is skipped, missing 0.6.1 MP3s generated.
6. Push updated site to GitHub and reload mobile PWA to get the v0.6.1 service worker.

**Note:** Actual synthesis requires your local Google Cloud TTS API key. No MP3s are bundled and no API key is stored. With `auto` audio mode, missing MP3s can use the browser TTS fallback.

## Interpretation of the training log

The 3002 records contain 2989 attempts in the five core modules, using 1127 unique core stimuli. Among those, initial first-pass success was 46.9%, second exposure 72.2%, fourth exposure 84.5%; replay rate was 50.6%, 24.1%, 13.1% respectively. At the item level ~85% of distinct stimuli have a median duration ≤3.5 sec, and only about 1% exceed 7 sec. The need for medium integration follows from the distributional gap; the observational log **cannot independently establish improvement in real-exam listening**.

---

# TEF Reflex Trainer Core 0.6 — Final Corpus Expansion

Core 0.6 is the final pre-exam breadth expansion. It preserves the successful Core 0.4/0.5 **short-clip reflex architecture** and uses the user's training log to shift scheduling toward **first exposure → second-exposure consolidation**.

The content objective is not to reproduce whole TEF questions. It is to maximize the proportion of common TEF vocabulary, verb frames, noun/adjective structures, formulas, state/logic patterns and useful collocations that have already been heard before exam day.

## Scale

- **1342 total stored tasks**
- **1234 tasks in the default active pool**
- **672 new stimuli added in Core 0.6**
- 739 preserved source/context units
- 1160 unique clip/audio units
- 4640 possible fixed MP3 files (1160 × 4 voice/speed variants)

Long-text modules remain stored but disabled by default:
- PARAPHRASE: 60
- SHORT_MID: 48

## New Core 0.6 material

672 new stimuli:
- **488 AUTH_OLD** — mined from authentic pre-reform TEF transcripts
- **90 SIMULATED** — selected only to fill useful coverage gaps
- **94 DERIVED_SAFE** — limited, explicitly tagged high-frequency variants for person/number/tense/structure generalization

New-module distribution:
- LANGUAGE_CHUNK: 502
- VERB_FRAME: 123
- LOGIC_STATE: 47

New-clip length distribution:
- **579 ≤ 8 words**
- **67 = 9–14 words**
- **26 = 15–22 words**
- no new long / very-long explicit stimuli

This keeps short clips as the primary “first exposure window” while adding a small medium-length layer for working-memory integration.

## Source hierarchy

Core 0.6 keeps source provenance explicit:

1. `AUTH_NEW` — post-reform authentic TEF; remains the structural/task calibration source.
2. `AUTH_OLD` — pre-reform authentic TEF; aggressively mined for transferable language breadth.
3. `SIMULATED` — supplementary only; never used to define real-TEF frequency or current task weights.
4. `DERIVED_SAFE` — lowest-priority, limited natural variants; never presented as authentic transcript material.

In the default active pool, authentic TEF material remains about **85%** of all tasks. Simulated material is about 7%, and derived-safe material about 8%.

### Old single-sentence section

From `TEF_BEFORE_6` onward, the old final single-sentence items were no longer automatically excluded. They were selectively mined when they contained high-transfer language. Shortness alone is not a reason for inclusion; trivial or narrow sentences are skipped.

### Simulation Chinese notes

For `TEF_STI_1–8`, only the **French listening transcript** was used. Chinese vocabulary notes, glosses and explanations under the transcript were ignored and do not participate in corpus statistics, clip generation or answer design.

## Clip policy

Core 0.4's clip model remains frozen:

- complete source/context is preserved for feedback;
- actual playback uses a short contiguous French clip;
- no mechanical half-clause cuts;
- short clips dominate;
- medium clips are a minority integration layer;
- no new long/very-long explicit listening units;
- authentic OCR-derived clips are tagged `batch_ocr_from_user_screenshot`;
- suspicious/corrupted OCR candidates are excluded instead of silently rewritten into textbook French;
- `DERIVED_SAFE` items are explicitly `native: false`.

## Coverage-first scheduler

The 1000-attempt training log showed the largest improvement between the first and second encounter. Core 0.6 therefore changes the ALL-pool scheduler to:

- **40% unseen**
- **25% seen exactly once**
- **20% weak / still-acquiring**
- **10% mature review**
- **5% random coverage**

Wrong/reveal reinsertion, same-source cooldown, maturity states and Decision RT logging remain in place.

The intended delivered module mix remains approximately:
- LANGUAGE_CHUNK ~30%
- VERB_FRAME ~25%
- LOGIC_STATE ~20%
- COMM_INTENT ~15%
- STANCE ~10%

PARAPHRASE and SHORT_MID remain disabled from the default ALL scheduler.

## Audio generation

Core 0.6 continues to use the same Google Cloud TTS fixed-audio pipeline:

1. Run `generate_audio_test.bat` — generates 5 new Core 0.6 authentic clips × 4 variants.
2. Run `start_local.bat` — verify playback and UI.
3. Run `generate_audio_all.bat` — incrementally generates all missing MP3s and validates the library.

If you already have a working Core 0.5 repository, **keep the existing `audio/` folder and `_tts_manifest.json`**. Old matching audio-unit IDs are unchanged, so fingerprint matching skips already generated files and synthesizes only missing Core 0.6 clips.

Expected complete library:

**1160 audio units × 4 variants = 4640 MP3 files**

## Data files

- `data/source_units.json` — source/context units with provenance.
- `data/audio_units.json` — actual clips used by TTS/MP3 generation.
- `data/stimuli.json` — all task definitions.
- `data/language_mine_report.json` — retained Core 0.5 mining report.
- `data/corpus_expansion_report.json` — Core 0.6 expansion statistics.
- `data/trainer_config.json` — source hierarchy, scheduler and module policy.

## Update safety

Existing Core 0.5 stimulus IDs and audio-unit IDs are preserved. Browser localStorage keys are unchanged, so existing attempt history and mastery state continue to work after the update.

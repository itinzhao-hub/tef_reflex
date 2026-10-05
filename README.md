# TEF Reflex Trainer Core 0.3

Core 0.3 是在 MVP 0.2 已通过实际手感验证后形成的第一版主训练题库。原则不变：**改革后 TEF 真题原文优先，不引入外部语料。**

## 规模
- **420 条训练任务**
- **116 个唯一真实听力 source units**
- **464 个固定 MP3 槽位**（116 × 男女声 × normal/fast）
- 新增 36 个从 TEF_NEW_1–6 后半卷人工核对提取的真实短/中篇 source units
- 新增 108 条基于这些原文的 `SHORT_MID / PARAPHRASE / LOGIC_STATE` 任务
- 新增 120 条 `TASK_REFRAMING_ONLY`：**只改变题目任务，不改真题音频文本**
- 新增 18 条 STANCE “理由压缩”任务

模块分布：
- COMM_INTENT：100
- LOGIC_STATE：136
- VERB_FRAME：40
- STANCE：36
- PARAPHRASE：60
- SHORT_MID：48

`TASK_REFRAMING_ONLY` 不视为新的语言矿物，只用于降低固定题面记忆。

## 启动
Windows 双击 `start_local.bat`，浏览器打开 `http://localhost:8765`。不要直接双击 `index.html`。

如果你已经在旧版目录里生成过 MP3：**不要删除 `audio/` 文件夹。** 将本版覆盖/合并到旧目录后运行 `generate_audio_all.bat`；fingerprint 会自动跳过已经存在且匹配的音频，只补新增 source。

## 快捷键
- `1–4`：作答（播放期间不提交，只记 premature input）
- `R`：完整重播
- `0`：Reveal
- `Space`：PARAPHRASE / SHORT_MID 完成 Pre-read 后开始播放
- `Enter`：错题 / Reveal 后下一题

## 计时
- MESO / MACRO 音频播放期间锁定答案。
- `Decision RT` 从音频结束开始。
- 主 RT 曲线只统计 `FP_CORRECT`。
- Replay 与 Wrong 分开记录；Reveal 作为 hard fail。
- PARAPHRASE / SHORT_MID 单独记录 `pre_read_time_ms`。

## STANCE
原有 6 组三人观点题仍按组连续训练，并记录 `STANCE ≥2/3`。新增的 18 条理由压缩题不是三人组，不触发组队列。

## 固定 MP3
四个 profile：
- `female_normal`
- `female_fast`
- `male_normal`
- `male_fast`

运行 `generate_audio_test.bat` 可先生成 5 个 v0.3 新 source × 4 = 20 个 MP3；运行 `generate_audio_all.bat` 做全量/增量生成。

## 数据文件
- `data/stimuli.json`：420条任务
- `data/source_units.json`：116个真实原文单元
- `data/trainer_config.json`：计时、调度与版本信息
- `data/audio_manifest.json`：464个固定音频槽位

## 训练定位
本版刻意没有硬凑到900–1100条。原因是新增内容仍能保持很高的真题原生比例；继续膨胀会显著增加近重复或人工派生。420条任务配合四音频变体已经形成约1680种听觉呈现。后续扩容以实际错误分布和保留的 NEW-7 盲测为依据。

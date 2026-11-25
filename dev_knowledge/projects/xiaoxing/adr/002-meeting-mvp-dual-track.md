# ADR-002：小星会议 MVP（双轨骨架 + Me 唤醒口播）

## 背景

ADR-001 要求小星具备 AI 会议能力。首版不能 `require desktop/lib`，也不能阻塞等待完整 Whisper 外挂。

## 试过什么

1. **只做麦问答**：无法覆盖听会/旁听/唤醒半双工产品承诺。  
2. **直接复用 desktop 主进程**：违反同级隔离。  
3. **双 Web Speech 同时绑 Me/Others**：Chromium SpeechRecognition 难指定设备，双实例不稳。

## 决策（MVP）

1. **会话态**：`lib/meeting/session.cjs` 写 `knowledge/sessions/mtg_*.jsonl`；phase = listening / armed / speaking。  
2. **口令**：`schema/meeting-commands.json`（唤醒/旁听/开会/散会）；引擎只做匹配。  
3. **半双工**：播报中不接咨询；「谢谢小星」解除武装继续旁听。  
4. **双轨采音 UI**：Me = 本机麦；Others = 第二输入设备（CABLE）或 `getDisplayMedia` 系统声——先保证电平与会话标记。  
5. **Others ASR**：MVP 支持手动「记入」会场转写；Whisper 外挂后续按 `shared/adr/003` 独立落地。  
6. **咨询**：武装后 Me 句进既有 `ask` + TTS（`voiceTurn` 支持 `preAnswer` 避免双算）。

## 后果

- 用户可「开始听会 → 叫小星提问 → 谢谢小星旁听 → 手动记会场句」。  
- Others 自动转写仍缺，需下一里程碑接 HostAsr/Whisper，PCM 上行按 track 分会话。  
- 冒烟：`npm run smoke:meeting`。

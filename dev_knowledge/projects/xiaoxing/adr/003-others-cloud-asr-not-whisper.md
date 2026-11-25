# ADR-003：Others 会场转写用豆包云 ASR，不用本地 Whisper

## 背景

会议 MVP（ADR-002）缺 Others 自动转写。本地 Whisper / HostAsr-local 在实机听感与会场噪声下效果一般，产品明确**不接入本地 Whisper**。

## 试过 / 排除

1. **本地 Whisper CLI/Server**：部署重、口音/噪声差、与 Electron ABI 解耦成本高（见 shared/adr/003 仅作可选旁路，小星本阶段不用）。  
2. **双 Web Speech**：难指定 Others 设备，效果不稳定。  
3. **直接 require desktop HostAsr**：违反项目隔离。

## 决策

1. 在 `xiaoxing/lib/asr/` **独立实现**豆包/火山 `sauc/bigmodel` 流式协议（与大智同源协议，代码不跨引用）。  
2. Others 采音 → PCM 16k 上行 → `CloudAsrSession` → final 进 `meeting.handleMeetingUtterance({ track:'others' })`。  
3. 密钥：`DOUBAO_SPEECH_API_KEY` 或 `DOUBAO_ASR_API_KEY`（可与 TTS 共用）。  
4. 无密钥时降级：电平 + 手动「记入」，不假装本地转写。

## 后果

- 依赖云配额与网络；会场噪声下通常优于本地 Whisper。  
- 冒烟：`npm run smoke:asr`（协议）；`FORCE_ASR_CONNECT=1` 可测握手。  
- 后续可加农服热词表，仍不默认打开本地 Whisper。

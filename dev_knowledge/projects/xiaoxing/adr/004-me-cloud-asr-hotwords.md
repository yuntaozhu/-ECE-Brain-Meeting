# ADR-004：Me 轨也走豆包云 ASR + 农服热词

## 背景

Others 已用云 ASR（ADR-003）。Me 仍依赖浏览器 Web Speech，听写不稳且与「不用本地 Whisper」方向不一致。

## 决策

1. `lib/asr/trackBridge.cjs` 统一 Me/Others 云会话。  
2. 听会 / 连续听：Me PCM → 豆包流式 ASR；热词来自 `schema/asr-hotwords.json`。  
3. 播报中 `setTrackPaused('me')`，防 TTS 回灌。  
4. 无密钥时 Me 降级 Web Speech；仍不启用本地 Whisper。

## 后果

- 双轨听写质量对齐云端；依赖配额。  
- Push-to-Ask / 按住说话在云模式下短开 Me 会话。  
- 冒烟：`smoke:asr`（含热词加载）。

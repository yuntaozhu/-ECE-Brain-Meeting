# ADR-019：听会默认「Me 说完即问」

## 背景

听会以 `armed:false` 启动时，Me ASR final 只 `listen_only`，用户只能靠「提问并播报」咨询。

## 决策

1. `startMeeting` 默认 `armed:true`（`meeting-commands.json` → `defaultArmed: true`）。  
2. 「谢谢小星」→ 旁听；再叫「小星…」或 Push 恢复。  
3. 旧行为：`startMeeting({ requireWake: true })`。

## 后果

- 冒烟：`smoke:meeting`；旁路门闩测例用 `requireWake`。

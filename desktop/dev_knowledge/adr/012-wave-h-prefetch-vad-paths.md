# ADR-012 Wave H：真 partial 预热、VAD 预卷、安装包路径

## 背景

prefetch 仅在句尾同步调用且 `speakingMs` 易恒为 0；VAD 开口易吞首字；打包后 `knowledge_wiki` / glossary 不在 resources。

## 决策

1. `onOthersPartialAsr`（600ms 节流）+ `startedAt = now - 500` 开口步进；`listenSession` 在 Others `!final` 挂接。
2. `vadGate` 增加约 240ms `preRollChunks`，上升沿并入语段。
3. `appPaths`：`wiki2ReadRoot` / `wiki2WriteRoot`（安装包种子拷贝）、`glossaryPath`、`sessionLogsWriteDir`；`extraResources` 打包 `knowledge_wiki` 与 `dev_knowledge/glossary`。

## 后果

- 对方说话中途即可预热 FAQ/Wiki2；本地 Whisper 首字更完整。
- 安装包写入落在 `userData`，不写 asar。

# 小星 · 农业 AI 助理（含会议）

与根目录 `desktop/`（大智）**并列**的独立产品：农业领域口径 + **AI 会议能力**（听写 / 唤醒 / 口播 / 半双工等，方法论对齐大智，代码不跨引用）。

## 一句话

开会场听写与唤醒「小星」→ FAQ/Wiki 农服口径口播；会下也可麦问；答不好进看板复盘。

## 与大智

| | 大智 `desktop/` | 小星 `xiaoxing/` |
|--|--|--|
| 领域 | 教育 / 园所美语等 | 农业（首垂类草莓） |
| AI 会议 | 参考实现（完善） | **要对齐落地**（见 `dev_knowledge/shared/playbook/meeting-assistant.md`） |
| 代码 | 独立 | 独立；禁止 `require('../desktop/lib/...')` |
| 业务知识 | `desktop/knowledge/` | `xiaoxing/knowledge/` |

会议能力：听会会话、Me 唤醒半双工、Others **豆包云 ASR**（不用本地 Whisper）。见 `dev_knowledge/projects/xiaoxing/adr/003-others-cloud-asr-not-whisper.md`。

## 目录

```text
xiaoxing/
  main.cjs · preload.cjs · renderer/
  lib/              # ask / voice / knowledge（会议能力独立落地，不引用 desktop）
  knowledge/        # FAQ · Wiki · raw · sessions · inbox
  scripts/
  package.json
```

## 快速开始

```bash
# 仓库根
npm run xiaoxing

cd xiaoxing
npm install
npm start
npm run smoke:all
```

> 若本机 electron 安装脚本被拦截，`start` 可能临时调用 `desktop` 的 electron 二进制（过渡，非架构依赖）。

## 研发知识

- 全局：`dev_knowledge/INDEX.md`
- 小星档案：`dev_knowledge/projects/xiaoxing/`
- 方案：`multi_project_monorepo_and_dev_knowledge_plan.md`

## 边界

- 不编用药剂量、产量承诺、补贴金额  
- 不共用大智业务 FAQ  
- 密钥只存 `.env`

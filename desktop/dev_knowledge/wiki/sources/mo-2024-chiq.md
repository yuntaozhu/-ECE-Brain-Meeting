# CHIQ: Contextual History Enhancement for Improving Query Rewriting in Conversational Search（Mo 等，2024）

## 一句话
改写查询之前先整理历史：先看是不是换了题，再消歧当前问句。

## 要点
- 作者是 Fengran Mo、Abbas Ghaddar、Kelong Mao、Mehdi Rezagholizadeh、Boxing Chen、Qun Liu、Jian-Yun Nie。
- 两步：先增强对话历史，再改写查询。增强包括问句消歧、短答展开、假想回答、话题切换、历史摘要。
- 话题切换为真时，截断更早的历史，只用最近相关轮。
- 他们用开源 LLM 做这两步，并在五个对话检索基准上与闭源改写器比较。

## 对本仓库
- **部分对齐**：换题就不再用更早的卡做实体；当前这句若是完整问，仍要改写并检索，不能因为会话计时到了就把这句丢掉。
- **不采用**用 LLM 做历史增强、假想回答或在线改写器。假想回答与已拒绝的 HyDE 同类。

## 改变的概念
- [[follow-up-interaction]]
- [[query-understanding]]

## 原文
- `raw/2406.05013-chiq-query-rewriting.pdf` · arXiv:2406.05013 · EMNLP 2024
- 核对用：`raw/md/2406.05013-chiq-query-rewriting.md`

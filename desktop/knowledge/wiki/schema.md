# 大智 Wiki Schema（LLM Wiki 约定）

本目录是会中回答的**编译后知识层**。原始材料在 `knowledge/raw/` 与 `quan-yuan-meiyu.txt` 等处，只追加不改写。提问时优先读整页概念词条，禁止从半句切块拼口径。

## 三步操作

| 操作 | 何时 | 做什么 |
|------|------|--------|
| **Ingest** | 会后 / 人工审 | 新材料或审核通过的 inbox → 更新相关概念页、`index.md`、`log.md` |
| **Query** | 会中 L2/L3（≤20s） | 读 `index.md` → 打开 1–3 个整页 → 按「口播/边界」作答 |
| **Lint** | 定期 | `npm run knowledge:wiki:lint`：矛盾数字、孤页、缺链、FAQ 与口播不一致 |

## 概念页模板

文件：`wiki/concepts/{slug}.md`

```markdown
# 标题（一句话主题）

## 口播
会中可直接朗读的短句（建议 ≤80 字）。

## 事实
可核对的规则、数字、范围；必须能回溯到 raw。

## 边界
禁止说出口的承诺、未写明的单价、易混概念。

## 相关
- [[other-slug]]

## 出处
- quan-yuan-meiyu.txt / 协议条款…

## 常见问法
- 园长原话或同义问（仅作检索别名，不覆盖事实）
```

## 硬规则

1. **数字只能来自事实段或 raw**，L2/L3 成功回答不得自动改写「事实 / 口播 / 边界」。
2. Ingest 对已有词条默认只追加「常见问法」；覆盖事实需人工改文件。
3. FAQ（L1）句子应从词条「口播」派生，避免两套口径。
4. 会中不做 Ingest；超时路径用词条口播，不现场编译 wiki。
5. `distilled/` 保留为历史升格产物；新沉淀一律进 `wiki/concepts/`。

## 索引行格式（index.md）

```
- slug | 一句话 | type=concept|benefit|ledger|process | aliases=别名1,别名2
```

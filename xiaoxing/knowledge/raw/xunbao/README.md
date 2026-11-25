# 上海旬报 / 季节意见快照包

存放嘉定、松江、浦东等区农技/农委**当季管理意见**快照。

## 规则

1. 只追加，不改写原文
2. 文件名：`{district}-{yyyy}-{mm}-{xun|event}-{slug}.md`
3. Front matter 必填：`district` / `fetched_at` / `source_url` / `valid_until`
4. 升格 FAQ 前必须人工审；过期（过 `valid_until`）降权或下线

## 目录

| 路径 | 用途 |
|------|------|
| `snapshots/` | Firecrawl 或手工粘贴的旬报正文 |
| `templates/season-faq.md` | 升格 FAQ 前的填写模板 |

抓取清单见 `knowledge/schema/crawl-sources.json` 中 `sh-*` 条目；也可 `npm run crawl:xunbao`。

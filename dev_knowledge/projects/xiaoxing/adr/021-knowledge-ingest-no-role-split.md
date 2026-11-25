# ADR-021 知识入库三轨与不定人设

## 背景

会议 mtg_1795420554407：助手应具备专业积累、跨会记忆与场景信息支持，但**近期不**按科普/产业/市场硬切人设；先明确抓什么、补什么。同步盘点东方城乡报、市农委农业技术栏目与正版书目。

## 决策

1. **三轨入库**：公开爬取（白名单）/ 授权摘录（raw/manual）/ 书目索引（无正文）。  
2. **可爬**：`nyncw.sh.gov.cn/nyjs`、`dfcxb.com` 公开页、既有学会农科院行情源、水稻所/粮油信息首页等。  
3. **禁爬**：正式出版物全书、译丛、品种志全文、App 登录墙、盗版 PDF、网店当正文。  
4. **关键词**：`ingest-keywords.json` 作物 ∩ 栏目簇过滤东方城乡报等稿件。  
5. **人设**：角色包后置；程序上「界定容易」但不阻塞补库。

## 后果

- 配置：`crawl-sources`、`knowledge-layers`、`ingest-keywords`、`source-priority`  
- 文档：`docs/knowledge-ingest-rules.md`  
- 后续：会后 ingest-task 闭环（任务列表 P0-B）

## 状态

Accepted · 2026-11-23

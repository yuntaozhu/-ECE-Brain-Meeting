# Wiki 变更日志

## [2026-11-17] bootstrap | 小星草莓 Phase A

- 新建边界、自我介绍、5 品种卡、育苗/栽培历/上海/标准入口词条
- FAQ L1 首批
- Firecrawl 公开机构页：cshs / jaas / saas 入 raw；baafs 代理隧道失败待重试
- Ask 管线：边界闸 → FAQ → Wiki → inbox；smoke 8/8、lint OK

## [2026-11-17] continue | 深页爬取 + 四季 + 复盘看板

- 新增 `shanghai-season-guide` / `source-portals` 词条与 FAQ
- inbox 支持看板状态：pending/reviewing/ready/done；`/board` 可视化
- crawl-sources 增加分会、团体标准、草莓服务/成果深页；`npm run crawl:deep`
- 从深页升格：久香、苏莓66 品种卡；草莓分会挂靠与组织口径（cshs-branches-p2）
- baafs 仍超时/隧道失败，保留重试

## [2026-11-17] continue | 渠道 + 旬报包 + promote 联动

- `/wechat` 明文回调骨架；`POST /webhook/ask`
- `raw/xunbao` 快照包 + `npm run crawl:xunbao`
- promote 默认只吃 `ready`，成功后标 `done`；`--status=pending,ready` 可放宽

## [2026-11-17] voice V0/V1

- 方案：`docs/product-voice-desktop.md`
- `/voice` Push-to-Ask 页；`POST /voice/turn`；豆包 TTS（可选）+ 浏览器朗读降级
- `npm run voice` / `npm run smoke:voice`

## [2026-11-17] Electron 扁平化

- 删除 `xiaoxing/desktop/` 嵌套；入口上移为 `main.cjs` / `preload.cjs` / `renderer/`
- 根脚本：`npm run xiaoxing` → Electron；`npm run xiaoxing:serve` → HTTP 旁路

## [2026-11-18] 知识扩容

- Wiki：红颜、章姬、灰霉/白粉概述、放蜂授粉、基质栽培、问行情指南（7 词条）
- FAQ L1 同步上述口播；病虫种子扩川/粤/陕；行情种子加彩椒/江南黄瓜/新发地西红柿
- ASR 热词与纠错：红颜、章姬、白粉病、放蜂等
- 重建 Wiki2 索引后跑 smoke:ask / wiki2 / bank

## [2026-11-22] 知识扩容续

- Wiki：越秀、娇美一号、甜查理、品种怎么选、炭疽病、蚜螨、采收分级、采后保鲜、水肥概述、山东产区（10 词条）
- FAQ L1 同步；ASR 热词/纠错补充；pest 匹配加炭疽/蚜虫权重
- `npm run wiki2:index` 后 smoke:bank / smoke / wiki2

## [2026-11-22] 知识扩容再续

- Wiki：申莓、紫金香雪、隋珠、棚室温湿度、疏花疏果、地膜滴灌、江苏/浙江产区、病毒病、定植密度（10 词条）
- FAQ/ASR 同步；题库 Q092 申莓改为硬 FAQ
- Wiki2 重建后回归 smoke:bank

## [2026-11-23] 水稻门户与上海品种

- 来源：用户 Word《水稻相关网站公众号》→ `raw/manual/rice-portals-2026-11.md`
- Wiki：全国/上海/行情门户、上海品种名录、花优14、申优28、优糖稻、知识分层（8 词条）
- 新增 `faq-rice.txt`；`faq.cjs` 支持加载全部 `faq-*.txt`
- ASR 热词/纠错补水稻品种与机构名；身份口径改为草莓主攻+水稻扩展
- `wiki2:index` 后 smoke:bank / smoke

## [2026-11-23] 水稻技术层续扩

- Wiki：沪软1212、沪早粳193、太安1号、南粳46、松香粳1018、栽培意见、机插、农机装备、病虫概述、智慧农业（10 词条）
- FAQ/ASR/题库 Q131–Q140 同步；Wiki2 目标 ≥60

## [2026-11-23] 水稻政策产业与区县续扩

- Wiki：政策入口、水稻所、食味鉴评、杂交制种、区县实践、上海品牌、期刊媒体、托市收购、籼粳通识、研究进展（10 词条）
- FAQ/题库 Q141–Q150；Wiki2 目标 ≥70

## [2026-11-23] 入库规则落盘（东方城乡报 + 市农委农业技术 + 书目）

- 文档：`docs/knowledge-ingest-rules.md`
- schema：`knowledge-layers` / `ingest-keywords`；扩 `crawl-sources`（dfcxb、nyjs、cnrri、chinariceinfo、grainmarket）
- manual：书目 catalog + README；source-priority 版权红线
- Wiki/FAQ：sh-nyncw-tech、dfcxb-portals、book-ingest-policy
- ADR-021

## [2026-11-23] C4/C5 柑橘骨架 + 长三角草莓行情

- 新增 `faq-citrus.txt`；Wiki：citrus-overview / citrus-source-portals / citrus-shanghai / yangtze-delta-strawberry-market
- 种子价：沪苏浙「长三角参考」草莓 3 条；retrieve 加长三角/江杨区域加权
- market-products 登记柑橘；FAQ/身份口径同步；题库 Q251–Q256

## [2026-11-24] 农业科技汇编入库 + Firecrawl 核验源

- raw：`agri-tech-kb-digest-2026-11-24.md` + README；公众号不盲爬
- crawl-sources：moa-home / std-samr / sh-gov / sh-spcsc
- Wiki×11：汇编索引、命名、再生稻、绿色防控、稻瘟、稻飞虱、测产、食味值、秸秆、善治标准、都市农业法；更新太安1号/籼粳/病虫概述
- faq-rice 同步；药剂剂量不进处方

## [2026-11-24] 汇编续升格 + 失败源重试

- Wiki：细菌性病害、生育进程、旺泾无人机、食农文化、上海全链升级
- FAQ/题库续扩；重试 dfcxb / natesc

## [2026-11-24] 会前 briefing + 跨会记忆后的收尾

- briefing 标题去转义；ASR 热词扩汇编术语
- C2 轻量：`shanghai-fruit-series-strawberry` 公开入口（正文仍待授权摘录）
- 题库 Q269–Q270

## [2026-11-25] 快照再升格收口

- 苏莓66/江苏产区：姜堰花果服务 11-24 快照确认
- 新增 `rice-deep-processing` / `rice-lab-testing` / `organic-farm-sweden`
- digest README 刷新；题库 Q271–Q274；index 去重

## [2026-11-25] 汇编末批轻量升格

- 新增 `rice-sheath-blight` / `rice-water-weevil` / `rice-ancient-innovation` / `cultivar-chongshang217`
- 籼粳 FAQ 补彩色稻；题库 Q275–Q278

## [2026-11-25] briefing 噪声过滤 + ASR

- `extractHeadlines` 过滤浏览器升级页/导航壳（saas 等）
- ASR 热词去重并补纹枯/稻水象甲/崇尚217/深加工等

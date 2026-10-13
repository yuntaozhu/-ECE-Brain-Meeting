/**
 * 一次性：写入 wiki/concepts 正式词条与 index.md
 * node scripts/bootstrap-wiki.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "knowledge", "wiki");
const dir = path.join(root, "concepts");
fs.mkdirSync(dir, { recursive: true });

function page({ title, speak, facts, bounds, related = [], sources = [], aliases = [] }) {
  const lines = [
    `# ${title}`,
    "",
    "## 口播",
    speak,
    "",
    "## 事实",
    facts,
    "",
    "## 边界",
    bounds,
    "",
    "## 相关",
    ...(related.length ? related.map((s) => `- [[${s}]]`) : ["- （暂无）"]),
    "",
    "## 出处",
    ...(sources.length ? sources.map((s) => `- ${s}`) : ["- quan-yuan-meiyu.txt"]),
    "",
    "## 常见问法",
    ...(aliases.length ? aliases.map((a) => `- ${a}`) : ["- （待沉淀）"]),
    ""
  ];
  return lines.join("\n");
}

const pages = {
  "quan-yuan-meiyu": page({
    title: "全园美语是什么",
    speak:
      "全园美语是面向大地合作园的全园型美语特色系统，不是单一英语课或账号采购；整合 ABCmouse、ABC说、菲教、Teacher说、Family说、AI测评等，用四端联动把美语做成校园特色和招生引擎。",
    facts:
      "全园美语系统以约 39,000 元建设校园美语环境，覆盖幼儿端、教师端、家庭端与成果展示；目标是特色经营与招生引擎，而非卖账号。",
    bounds: "不要说成「只买一批账号」或「随便哪个英语课都行」。未写明的单价不要口头报。",
    related: ["si-duan-liandong", "revenue-guarantee", "one-garden-two-systems", "ledger-3-enrollment"],
    sources: ["quan-yuan-meiyu.txt", "session 升格候选"],
    aliases: [
      "全园美语是什么",
      "什么是全园美语",
      "这个项目到底是什么",
      "它和普通英语课有什么区别",
      "和普通英语课的区别"
    ]
  }),
  "si-duan-liandong": page({
    title: "四端联动",
    speak:
      "四端联动是孩子学、老师教、回家续、成果显：幼儿端、教师端、家庭端和成果展示打通，链路通了美语才能成招生招牌。",
    facts:
      "四端指幼儿学习（ABCmouse / ABC说 / 菲教等）、教师备课与课堂用语（Teacher说）、家庭延续（Family说）、成果可见（AI测评与成果展）。缺一端就会断链。",
    bounds: "不要把四端说成四个独立产品各自卖；也不要用「大智」自称去解释四端定义。",
    related: ["quan-yuan-meiyu", "benefit-05-teacher-shuo", "benefit-06-family-shuo", "benefit-07-chengguozhan"],
    sources: ["quan-yuan-meiyu.txt"],
    aliases: ["什么是四端联动", "四端联动是什么", "大智什么是四端联动"]
  }),
  "revenue-guarantee": page({
    title: "收益保障：一学期收入的一半",
    speak:
      "认真执行的园，一学期核算。校园最终承担的项目费用不超过该学期美语相关收入的一半；若这一半低于 3 万 9，总部退差额。退款等于 3 万 9 减去学期相关收入除以 2。",
    facts:
      "以一学期为周期。规则是校园最终承担的费用不超过该学期美语项目相关收入的 50%，且最高不超过 39,000 元。公式：退款金额等于 39,000 元减去一学期项目相关收入除以 2。例：收入 50,000 则承担 25,000、退 14,000；收入 78,000 则一半正好 39,000、不退；收入 100,000 时一半是 50,000，但服务费封顶仍是 39,000，不另收费。相关收入包括全美语生增值等通过 ABCmouse 及相关美语项目取得的收入。",
    bounds:
      "这是执行后的核算兜底，不是「不管做不做都保证赚回 3 万 9」，也不要把举例里的 14,000 说成每园固定退款。",
    related: ["ledger-2-premium", "ledger-3-enrollment", "quan-yuan-meiyu"],
    sources: ["quan-yuan-meiyu.txt", "项目收益保障条款"],
    aliases: ["引入项目后收益保障如何", "收益保障怎么算", "是不是这样就能盈利", "亏了怎么办"]
  }),
  "one-garden-two-systems": page({
    title: "一园两制：普通生与全美语生",
    speak:
      "一园两制是普通生加全美语生，或普通班加全美语班。基础覆盖全体，愿意多投入的家庭走更高频，不是给孩子分等级。",
    facts:
      "39,000 元系统不要求所有家庭投入一致。普通生享有 ABCmouse、每班每天线上菲教、ABC 说、AI 测评、校园基础美语环境和成果展等活动，参与要求是「会一点、说一点、陪一点」。全美语生是愿意深度参与的家庭申请的更高频服务，需要家庭和校园一起配合；增值参考每月 150—500 元、各园自定。资源有限时，基础覆盖所有孩子，重点资源倾斜给高投入家庭，并循序渐进提高全美语生比例。",
    bounds:
      "不要说普通生没有菲教或没有账号。不要把分层说成资质分级或淘汰。增值月费以「每月 150—500 元、各园自定」为准，不要在这里另报一个价。",
    related: ["ledger-2-premium", "benefit-04-feijiao", "quan-yuan-meiyu"],
    sources: ["quan-yuan-meiyu.txt"],
    aliases: ["一园两制是什么", "普通生和全美语生有什么区别", "是不是分等级"]
  }),
  "benefit-01-abcmouse": page({
    title: "权益：全园幼儿的 ABCmouse 账号",
    speak: "全园幼儿配 ABCmouse 账号，用来做稳定、持续的英语输入。",
    facts: "八大核心权益第 1 条，全园幼儿配 ABCmouse 账号，定位是稳定持续的英语输入环境。",
    bounds: "资料未写每名幼儿的号费单价，不要口头报一个账号单价。",
    related: ["quan-yuan-meiyu", "benefit-02-abc-shuo", "benefit-08-account-space"],
    aliases: ["ABCmouse 是什么", "有没有账号", "全园都有账号吗"]
  }),
  "benefit-02-abc-shuo": page({
    title: "权益：ABC说小程序账号",
    speak: "全园幼儿配 ABC 说小程序，用来练开口，让孩子敢说。",
    facts: "八大核心权益第 2 条，全园幼儿配 ABC 说小程序账号，强化口语输出。",
    bounds: "资料未写每天必须开口的分钟数，不要承诺「每天开口多少分钟」。",
    related: ["benefit-01-abcmouse", "benefit-05-teacher-shuo"],
    aliases: ["ABC说是什么", "怎么练开口"]
  }),
  "benefit-03-ai-ceping": page({
    title: "权益：AI测评与美语成果检测",
    speak: "全园幼儿配 AI 测评和美语成果检测，成果可记录、可展示、可传播。",
    facts: "八大核心权益第 3 条，全园幼儿配 AI 测评及美语成果检测。",
    bounds: "资料未写测评分数线或通过率，不要承诺「测完就能招生翻倍」。",
    related: ["benefit-07-chengguozhan", "chengzhang-anli"],
    aliases: ["AI测评是什么", "怎么测成果"]
  }),
  "benefit-04-feijiao": page({
    title: "权益：每班每天一堂线上菲教",
    speak: "全园每班每天一堂线上菲教，25 分钟真人外教，天天听、天天互动。",
    facts: "八大核心权益第 4 条，全园每班每天一堂线上菲教课程，时长 25 分钟。",
    bounds:
      "这是每班每天一堂，不是承诺每名幼儿单独外教。1 对 3 小班菲教是另外可选服务，不要和这条混成同一件事。",
    related: ["one-garden-two-systems", "ledger-2-premium"],
    aliases: ["菲教怎么上", "每天有外教吗", "25分钟外教"]
  }),
  "benefit-05-teacher-shuo": page({
    title: "权益：全园老师的 Teacher 说",
    speak: "全园老师配 Teacher 说和教师美语训练，用来撑起全园双语氛围。",
    facts:
      "八大核心权益第 5 条，全园老师有 Teacher 说及教师美语训练。落地行事历里，老师通过 ABC 说小程序的 Teacher 说掌握课堂用语、表扬鼓励和游戏活动用语。",
    bounds:
      "资料未写补贴比例和考核必须全员通过。不要承诺奖金，也不要说老师必须先会英语才能开始。",
    related: ["si-duan-liandong", "rollout-calendar-phase1"],
    aliases: ["Teacher说是什么", "老师不会英语怎么办", "怎么培训老师"]
  }),
  "benefit-06-family-shuo": page({
    title: "权益：家长的 Family 说",
    speak: "全园家长配 Family 说，家庭英语环境不会因为离园就中断。",
    facts:
      "八大核心权益第 6 条，全园家长配 Family 说资源。行事历要求了解 Family 说及开展要求，并有五阶段开展说明。",
    bounds: "资料未写家长必须每天打卡的次数，不要把「家庭不中断」说成强制作业。",
    related: ["si-duan-liandong", "benefit-02-abc-shuo"],
    aliases: ["Family说是什么", "家长端怎么用", "回家怎么续"]
  }),
  "benefit-07-chengguozhan": page({
    title: "权益：美语成果展",
    speak: "全园配美语成果展和线上线下活动，让特色被家长看见。",
    facts: "八大核心权益第 7 条，全园配美语成果展及线上线下活动。",
    bounds: "资料未规定每学期必须办几场，不要承诺「每月一场成果展」。",
    related: ["chengzhang-anli", "ledger-3-enrollment", "si-duan-liandong"],
    aliases: ["成果展怎么做", "怎么让家长看见"]
  }),
  "benefit-08-account-space": page({
    title: "权益：校园账号使用空间",
    speak: "校园账号使用空间按在籍生人数的 1.3 倍做基础，服务可以延伸到在园以外的家庭。",
    facts:
      "八大核心权益第 8 条，校园账号使用空间进一步扩大，基础为在籍生人数的 1.3 倍。三笔账第一笔里，还可以按实际需求额外申请，服务毕业生、社区儿童、0—3 岁家庭、6—12 岁学生、托管及才艺班、员工子女和转介绍家庭。",
    bounds: "1.3 倍是使用空间的基础测算，不是承诺自动多送这么多付费名额，也不要自行改这个倍数。",
    related: ["ledger-1-service-radius", "benefit-01-abcmouse"],
    aliases: ["账号空间多少", "1.3倍是什么意思", "能不能服务毕业生"]
  }),
  "ledger-1-service-radius": page({
    title: "三笔账第一笔：扩大服务半径",
    speak:
      "第一笔账看的是服务半径，不是只给在园孩子买账号。参考测算是每半年不低于 250 元，250 元乘 156 人等于 3 万 9。",
    facts:
      "39,000 元定位是建设校园美语系统，不按「账号个数乘单价」理解。账号空间可到在籍生的 1.3 倍，并可额外申请。参考测算：延伸家庭每半年不低于 250 元，250 元乘 156 人等于 39,000 元。若现有 120 名在籍幼儿，156 减 120 等于 36，即再服务 36 名毕业生、社区或转介绍家庭，达到该服务规模。",
    bounds:
      "250 元和 156 人、120 与 36 都是方案里的参考测算，不是每园必达的收费标准。不要把它说成「园所必须向每个家庭收 250 元」。",
    related: ["benefit-08-account-space", "ledger-2-premium", "ledger-3-enrollment"],
    aliases: ["服务半径怎么算", "三笔账第一笔", "250元乘156"]
  }),
  "ledger-2-premium": page({
    title: "三笔账第二笔：特色增值收入",
    speak:
      "第二笔账是分层增值。全美语生参考每月加 150 到 500 元，由各园自定；可选的 1 对 3 线上菲教是每周 2 堂、每半年 1,800 元。",
    facts:
      "一园两制下，普通生是基础美语环境，全美语生是更高频率。全美语生增值参考范围为每位幼儿每月增加 150—500 元，具体由校园按当地收费决定。希望再增加家庭互动的，可选 1 对 3 线上菲教：每周 2 堂，每半年 1,800 元，1 位外教加 3 个孩子。这是参考测算，实际收入取决于全美语生比例和当地收费。",
    bounds:
      "150—500 元是参考范围，不要替园长定死一个月费。1,800 元是每半年的 1 对 3 服务参考价，不要说成每天菲教的价格。",
    related: ["one-garden-two-systems", "benefit-04-feijiao", "revenue-guarantee"],
    aliases: ["增值怎么收费", "全美语生加多少钱", "1对3菲教多少钱"]
  }),
  "ledger-3-enrollment": page({
    title: "三笔账第三笔：招生增长",
    speak:
      "第三笔账才是核心：美语特色要成为家长选择园所的理由。说明里的参考是一个新增幼儿每年约 1.8 万元、在园 3 年约 5.4 万元，可能盖过 3 万 9 的投入。",
    facts:
      "全园美语的经营目标不是卖账号，而是让美语特色成为招生引擎。项目说明提出：一个因美语特色报名的新增幼儿，每年约贡献 1.8 万元、在园 3 年约 5.4 万元，长期价值可能超过 39,000 元。还要看新增家庭、留下的家庭、全美语生比例，以及美语是否成为选择理由。三笔账的关系是：第一笔打服务规模，第二笔做增值，第三笔靠招生。",
    bounds:
      "1.8 万和 5.4 万是「如果新增并稳定在园 3 年」的参考测算，不是保证招到多少人，也不要许诺招生命中率。",
    related: ["quan-yuan-meiyu", "benefit-07-chengguozhan", "revenue-guarantee"],
    aliases: [
      "怎么靠美语招生",
      "三笔账第三笔",
      "能不能回本",
      "如何经营好园所",
      "通过美语课程经营园所",
      "起死回生"
    ]
  }),
  "rollout-calendar-phase1": page({
    title: "落地行事历：开课前分阶段",
    speak:
      "3 万 9 落地按行事历分阶段走。第一阶段园长和美语主任先吃透项目、账号、硬件、菲教排课和 Teacher 说；第二阶段带老师熟悉集体活动和素材；第三阶段再开家长说明会、排学期计划。不要一上来全园加压。",
    facts:
      "全园美语系统（39000）落地行事历分阶段。第一阶段：了解项目说明、ABCmouse 人员分工、美语主任职责、硬件与网络、园园通等平台、账号开通、EMS 后台、时长查核、ABC 拍评课、ABC 说、线上菲教排课、AI 测评安排、Family 说；非全美班可以先不学全美班资源。第二阶段：教师账号、集体活动三步骤、28 类素材，以及用 ABC 说里的 Teacher 说练课堂用语。第三阶段：按普通班或全美班准备家长说明会，制定学期美语工作计划和伴读教研、课程表。",
    bounds:
      "行事历没有「老师只拍十秒、先做一个月样板班」这句固定口径。不要把样板班操作说成资料原文，也不要承诺第一周就全员铺开。",
    related: ["benefit-05-teacher-shuo", "apply-project", "quan-yuan-meiyu"],
    aliases: ["怎么落地", "行事历怎么走", "先做什么后做什么", "0到1第一步"]
  }),
  "chengzhang-anli": page({
    title: "如何做成长案例与记录",
    speak:
      "主班老师日常归集 ABCmouse 记录、口语作品、AI 测评和活动表现，阶段性节点整理成成长案例；系统成果档案每周同步精选进步亮点。",
    facts:
      "成长案例来自系统自动留存的学习数据、口语作品与测评，再加人工精选亮点，用于家园沟通与招生展示，不是另写一套作文。",
    bounds: "不要承诺「写几个案例就能立刻招满」。资料未规定每周必须产出的案例篇数。",
    related: ["benefit-03-ai-ceping", "benefit-07-chengguozhan"],
    sources: ["quan-yuan-meiyu.txt", "session 升格候选"],
    aliases: ["如何做成长案例", "怎么记录孩子的成长", "成长档案怎么建"]
  }),
  "apply-project": page({
    title: "申请节奏：先摸清再申请",
    speak:
      "别急着直接申请。先摸清全园教师日常用英语的意愿和现有美语账号使用情况，再走申请流程，避免好项目做成闲置成本。",
    facts: "申请前应完成执行基础盘点：教师意愿、账号使用、硬件与网络、美语主任人选。落地按行事历分阶段推进。",
    bounds: "不要催促「今天必须签约」。也不要说「申请了就保证招生翻倍」。",
    related: ["rollout-calendar-phase1", "revenue-guarantee", "quan-yuan-meiyu"],
    sources: ["session 升格候选", "quan-yuan-meiyu.txt"],
    aliases: ["是不是马上就去申请", "怎么申请这个项目", "申请前要准备什么"]
  })
};

for (const [slug, body] of Object.entries(pages)) {
  fs.writeFileSync(path.join(dir, `${slug}.md`), body, "utf8");
}

const indexLines = [
  "# Wiki 目录",
  "",
  "> 会中 Query：先扫本目录，再打开命中的整页。",
  "",
  "## 概念",
  "- quan-yuan-meiyu | 全园美语是什么 | type=concept | aliases=全园美语是什么,什么是全园美语",
  "- si-duan-liandong | 四端联动 | type=concept | aliases=四端联动,什么是四端联动",
  "- one-garden-two-systems | 一园两制 | type=concept | aliases=一园两制,普通生,全美语生",
  "- revenue-guarantee | 收益保障 | type=concept | aliases=收益保障,退差额,盈利保障",
  "- chengzhang-anli | 成长案例与记录 | type=concept | aliases=成长案例,记录成长",
  "- apply-project | 申请节奏 | type=process | aliases=马上申请,如何申请",
  "- rollout-calendar-phase1 | 落地行事历 | type=process | aliases=行事历,怎么落地,0到1",
  "",
  "## 八大权益",
  "- benefit-01-abcmouse | ABCmouse 账号 | type=benefit | aliases=ABCmouse",
  "- benefit-02-abc-shuo | ABC说 | type=benefit | aliases=ABC说,开口",
  "- benefit-03-ai-ceping | AI测评 | type=benefit | aliases=AI测评",
  "- benefit-04-feijiao | 线上菲教 | type=benefit | aliases=菲教,外教",
  "- benefit-05-teacher-shuo | Teacher说 | type=benefit | aliases=Teacher说,老师培训",
  "- benefit-06-family-shuo | Family说 | type=benefit | aliases=Family说,家长端",
  "- benefit-07-chengguozhan | 美语成果展 | type=benefit | aliases=成果展",
  "- benefit-08-account-space | 账号使用空间 | type=benefit | aliases=1.3倍,账号空间",
  "",
  "## 三笔账",
  "- ledger-1-service-radius | 服务半径 | type=ledger | aliases=服务半径,250元",
  "- ledger-2-premium | 特色增值 | type=ledger | aliases=增值,150到500",
  "- ledger-3-enrollment | 招生增长 | type=ledger | aliases=招生引擎,1.8万",
  ""
];
fs.writeFileSync(path.join(root, "index.md"), indexLines.join("\n"), "utf8");
console.log(`[bootstrap-wiki] wrote ${Object.keys(pages).length} concept pages + index.md`);

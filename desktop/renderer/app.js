/**
 * ECE-Brain desktop — 纯软件虚拟音频网桥
 * 无外接线：虚拟音频输出 + 虚拟麦克风 对接腾讯会议 AI 账号
 */
const $ = (id) => document.getElementById(id);

const VIRTUAL_RE =
  /cable|vb-?audio|voice\s*meeter|virtual|sysvad|vac |vbcable|steam streaming|obs.?virtual|droidcam|nvidia broadcast/i;
const PHYSICAL_WARN_RE =
  /ugreen|realtek|nvidia high definition|high definition audio|hdmi|display|headphones|耳机|扬声器 \(|麦克风 \(|usb audio|webcam|camera/i;

let allInputs = [];
let allOutputs = [];
let inputStream = null;
let inCtx = null;
let analyser = null;
let meterTimer = null;
let loopCtx = null;
let listening = false;
let playCtx = null;
let nextPlay = 0;
let captureNode = null;
let unlisten = null;
let transcriptLines = [];
let lastPatrolAt = 0;
let lastLineCountAtPatrol = 0;
let silenceTimer = null;
let partialAsr = "";
let ttsPlayCount = 0;
let unsubMainLog = null;
let lastSpeechRmsAt = 0;
let lowLevelWarnAt = 0;
let asrFinalCount = 0;
let asrDeltaCount = 0;
let lastAsrFinalAt = 0;
let hostSpeakingUntil = 0;
let suppressCableInjectUntil = 0; // 自检/哔声注入 Cable 的静默窗口（听会中应避免）
let lastAsrStallAlertAt = 0;
/** @type {string[]} 最近 Host/李老师话术，用于过滤 Cable 回灌 */
let recentHostUtterances = [];
let lastWakeSpeakAt = 0;
let duplexPhase = "IDLE";
let holdUntil = 0;
let cooldownUntil = 0;
let patrolInFlight = false;
/** @type {string|null} 巡检忙时排队的下一触发原因 */
let pendingPatrolReason = null;
let thinkingUi = false;
let interactionModeUi = "HH";
let interactionModeLabel = "人—人旁听";
/** P2 会议生命周期 */
let meetingLifeUi = "OFF";
let meetingLifeLabel = "未开会";
let meetingIdUi = "";
/** P1：打断占麦中 — 收听补充，不丢 ASR */
let agentHoldListening = false;
let echoDiscardCount = 0;
let asrAcceptedCount = 0;
let suppressSpeakCount = 0;
let listenStartedAtUi = 0;

const PHASE = { IDLE: "IDLE", SPEAKING: "SPEAKING", COOLDOWN: "COOLDOWN" };
const SILENCE_PATROL_MS = 22000;
const TOPIC_HINT_RE =
  /美语|美蚁|梅雨|全[园员]|四端|家园|共育|招生|3900|三千九|教研|英语|经营|课程|教师|家长|一园两制|一元两制|一圆两制|自然拼读|绘本|TPR|启蒙|园所|试点|落地|主题|议程|元是什么|成功|做成|两制|菲教|非教|Teacher|Family|ABCmouse/;
const LOGISTICS_RE =
  /几点|三点|3\s*点|办公室|会议室|下午|挤出来|下次再|喂喂|好喂|行行|不好意思|电瓶|电平|扬声器|CABLE|cable/i;

function normalizeForMatchLocal(s) {
  let t = String(s || "");
  t = t.replace(/美蚁/g, "美语");
  t = t.replace(/梅雨/g, "美语");
  t = t.replace(/评测/g, "测评");
  t = t.replace(/全美语系统/g, "全园美语系统");
  t = t.replace(/全员美语/g, "全园美语");
  t = t.replace(/全员美育/g, "全园美语");
  t = t.replace(/签约美语/g, "全园美语");
  t = t.replace(/田园美语/g, "全园美语");
  t = t.replace(/一元两制|一圆两制|一园两治/g, "一园两制");
  t = t.replace(/大致|大志|大制|达智/g, "大智");
  t = t.replace(/原所|我的原(?=要|所|园)/g, "园所");
  t = t.replace(/原要倒闭/g, "园要倒闭");
  t = t.replace(/全员美女|全园美女/g, "全园美语");
  t = t.replace(/公办员/g, "公办园");
  t = t.replace(/样板单/g, "样板班");
  t = t.replace(/盐云港/g, "盐城连云港");
  t = t.replace(/非叫/g, "非教");
  t = t.replace(/色显优势|特色显优势/g, "特色优势");
  t = t.replace(/家园共浴/g, "家园共育");
  t = t.replace(/离院后/g, "离园后");
  t = t.replace(/四元流动|四端灵动|四段联动|四段流动/g, "四端联动");
  t = t.replace(/三千九百\s*元?/g, "3900元");
  t = t.replace(/3\s*[,，]\s*900/g, "3900");
  t = t.replace(/3\s*900/g, "3900");
  return t;
}

/** P1：播报中可放行的 barge-in 口令（与 meetingSession.looksLikeBargeInCommand 对齐） */
function looksLikeBargeInLocal(text) {
  const t = normalizeForMatchLocal(String(text || "").trim());
  if (!t) return false;
  return (
    /大智[，,\s]*(听我说|先听我说|你先听|先别说)|你先听我说完|请听我说完|先听我说|听我说完|大智听我说/.test(
      t
    ) ||
    /大智[，,\s]*请继续|大智[，,\s]*继续(说|答|讲)?|请继续|接着说|你继续/.test(t) ||
    /谢谢大智|停止大智|大智休息|大智闭嘴|大智先听着|谢谢李老师|停止李老师/.test(t) ||
    /我说完了|讲完了|说完了/.test(t)
  );
}

/** 上一答在让选题时，短句命中候选项 → 立刻巡检 */
function looksLikeOfferedChoicePick(text) {
  const bare = normalizeForMatchLocal(String(text || "").trim()).replace(/[，,。．.!！？?\s]/g, "");
  if (!bare || bare.length < 2 || bare.length > 14) return false;
  if (/(大智|谢谢|会议开始|会议结束|听我说|我说完了)/.test(bare)) return false;
  const host = recentHostUtterances[0] || "";
  if (!host || !/想先听|先听哪|听哪一块|哪一块|先说哪|选哪/.test(host)) return false;
  let chunk = "";
  const colon = host.match(/[：:]([^。！？?\n]{4,80})/);
  if (colon) chunk = colon[1];
  else {
    const idx = host.search(/想先听|先听哪|听哪一块|哪一块|先说哪|选哪/);
    if (idx > 4) chunk = host.slice(Math.max(0, idx - 48), idx);
  }
  chunk = chunk.replace(/与/g, "、");
  const parts = chunk
    .split(/[、，,/／]/)
    .map((s) => String(s || "").replace(/[的呢啊哦呀\s]/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 12);
  return parts.some((c) => bare === c || bare.includes(c) || c.includes(bare));
}

/** v2：默认旁听；点名大智/口令才立刻巡检；残句不巡检 */
function shouldImmediatePatrol(text) {
  const last = normalizeForMatchLocal(String(text || "").trim());
  if (!last || last.length < 2) return false;
  if (
    /谢谢大智|谢谢李老师|停止大智|大智.{0,8}(会议开始|会议结束)|请继续|听我说|我说完了/.test(last)
  ) {
    return true;
  }
  // 咨询中：上一答问「想先听哪一块」，用户只回选项名 → 立刻讲解
  if (
    (interactionModeUi === "HA_ASK" || interactionModeUi === "HA_TALK" || interactionModeUi === "HA_BIZ") &&
    looksLikeOfferedChoicePick(text)
  ) {
    return true;
  }
  if (/^(喂+|好+|嗯+|啊+|哦+|行+|对+|是+|没+|不是)[。.!！？]?$/i.test(last)) return false;
  // 残句「一是」「美语是。」不立即巡检，避免拖 LLM
  const bare = last.replace(/[，,。．.!！？?\s]/g, "");
  if (/^(一是|二是|三是|然后|那个|这个|就是|还有|如)$/.test(bare)) return false;
  if (bare.length <= 12 && /是$/.test(bare) && !/(什么|谁|多少|哪些|吗|呢|在吗)/.test(last)) {
    return false;
  }
  if (bare.length <= 4 && !/(大智|李老师|总结|在吗)/.test(last) && !/[？?]/.test(text)) {
    return false;
  }
  const echo = looksLikeHostEcho(last);
  if (echo.echo && !looksLikeOfferedChoicePick(text)) return false;
  if (
    /大智|大致|李老师|总结|暂停记录|继续记录|要总结|听我说完|我说完了|呼叫大智|大智咨询|大智探讨/.test(
      last
    )
  ) {
    return true;
  }
  // 咨询粘滞内的问句：即使 Host 还在播「我在请讲」，也立刻巡检（ASR 常把「大智，问题」拆成两句）
  if (interactionModeUi === "HA_ASK" || interactionModeUi === "HA_TALK" || interactionModeUi === "HA_BIZ") {
    const isQ =
      /[？?]/.test(last) ||
      /(什么意思|是什么|是谁|怎么[样办]|为什么|为何|能不能|可不可以|是否|真的吗|真的能|行不行|是不是|有没有|值得吗|划算吗)/.test(
        last
      ) ||
      /(吗|呢)\s*[。.!！]?$/.test(last);
    if (isQ) return true;
  }
  if (
    (duplexPhase === PHASE.SPEAKING || duplexPhase === PHASE.COOLDOWN) &&
    !looksLikeBargeInLocal(text) &&
    !/大智|李老师/.test(last)
  ) {
    return false;
  }
  // P0 静默：无名提问不立刻巡检（不插话）
  if (interactionModeUi === "IDLE_LISTEN" || interactionModeUi === "HH" || interactionModeUi === "PAUSED" || !interactionModeUi) {
    return false;
  }
  return false;
}

/** 界面显示纠错后文本（与逻辑层别名一致） */
function displayCorrectAsr(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  // 保留标点，只做专名纠错
  t = t.replace(/大致|大志|大制|达智/g, "大智");
  t = t.replace(/美蚁/g, "美语");
  t = t.replace(/梅雨/g, "美语");
  t = t.replace(/全员美女|全园美女/g, "全园美语");
  t = t.replace(/全员美语/g, "全园美语");
  t = t.replace(/全员美育/g, "全园美语");
  t = t.replace(/签约美语/g, "全园美语");
  t = t.replace(/田园美语/g, "全园美语");
  t = t.replace(/一元两制|一圆两制|一园两治/g, "一园两制");
  t = t.replace(/原所/g, "园所");
  t = t.replace(/原要倒闭/g, "园要倒闭");
  t = t.replace(/公办员/g, "公办园");
  t = t.replace(/样板单/g, "样板班");
  t = t.replace(/盐云港/g, "盐城连云港");
  t = t.replace(/非叫/g, "非教");
  t = t.replace(/色显优势|特色显优势/g, "特色优势");
  t = t.replace(/家园共浴/g, "家园共育");
  t = t.replace(/离院后/g, "离园后");
  t = t.replace(/四元流动|四端灵动|四段联动|四段流动/g, "四端联动");
  t = t.replace(/三千九百\s*元?/g, "3900元");
  t = t.replace(/3\s*[,，]\s*900/g, "3900");
  t = t.replace(/3\s*900/g, "3900");
  // 常见叠字 ASR：「全全员员」
  t = t.replace(/全全园园/g, "全园").replace(/全全员员/g, "全员");
  t = t.replace(/美与/g, "美语");
  return t;
}

function rememberHostUtterance(text) {
  const t = String(text || "")
    .trim()
    .replace(/（合成中…）$/, "")
    .replace(/（合成失败）$/, "")
    .replace(/（未播报：通道未就绪）$/, "");
  if (!t || t.length < 6) return;
  recentHostUtterances.unshift(t);
  if (recentHostUtterances.length > 6) recentHostUtterances.length = 6;
}

function applyHoldUntil(until, why) {
  const u = Number(until) || 0;
  const prev = hostSpeakingUntil;
  if (u > hostSpeakingUntil) hostSpeakingUntil = u;
  if (u > holdUntil) holdUntil = u;
  if (u - prev > 800) {
    slog("DEBUG", "DuplexPhase", "同步 holdUntil", {
      why,
      holdLeftSec: Math.max(0, Math.round((u - Date.now()) / 1000)),
      phase: duplexPhase
    });
  }
  renderDuplexStats();
}

function extendHostMute(ms, why) {
  const until = Date.now() + Math.max(0, ms || 0);
  applyHoldUntil(until, why);
}

function estimateHoldMsLocal(text, chunks) {
  const c = Number(chunks) || 0;
  if (c > 0) return Math.min(20000, Math.max(1500, Math.round(c * 400 + 600)));
  const len = String(text || "").length;
  return Math.min(12000, Math.max(2200, Math.round(len * 120) + 800));
}

function normTextLocal(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：""''「」（）()【】\[\]…·]/g, "");
}

function isIntroSelfTalkLocal(text) {
  const t = normTextLocal(text);
  if (t.length < 10) return false;
  const hasListen = /全程(在线)?收听|我已就位|随时呼叫我|随时叫我就|收听记录|需要我时叫李老师/.test(t);
  const hasTheme = /四端联动|全园美语|全员美语|家园共育|家园公寓|园所经营|美语教育/.test(t);
  return hasListen && hasTheme;
}

function isFollowUpNotEchoLocal(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (/[？?]/.test(t)) return true;
  if (
    /(什么意思|是什么|怎么[样办]|为什么|为何|能不能|可不可以|是否|咋办|真的吗|真的能|行不行|是不是|有没有)/.test(
      t
    )
  ) {
    return true;
  }
  if (/(吗|呢)\s*[。.!！]?$/.test(t) && t.length >= 4) return true;
  if (/(真的|能不能|可不可以|怎么办|为啥|为何)/.test(t)) return true;
  return false;
}

function looksLikeHostEcho(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 6) return { echo: false, score: 0, reason: "" };
  // P0：问句/求证追问豁免，避免「真的能重生吗」被 Host 尾句误杀
  if (isFollowUpNotEchoLocal(t)) return { echo: false, score: 0, reason: "follow-up-question" };
  if (isIntroSelfTalkLocal(t)) return { echo: true, score: 0.95, reason: "intro-template" };
  const tt = normTextLocal(t).replace(/梅雨/g, "美语").replace(/美蚁/g, "美语").replace(/非教/g, "菲教");
  const sinceHost = lastWakeSpeakAt ? Date.now() - lastWakeSpeakAt : null;

  // Host 刚说完：好的/嗯 + 主题 ≈ 回灌假对话
  if (sinceHost != null && sinceHost < 4500 && recentHostUtterances.length) {
    const affirm = /^(好的|好|嗯|对|行|是|哦|可以)[，,。！!？?\s]/.test(t);
    const hasTheme = TOPIC_HINT_RE.test(t);
    const hostTheme = recentHostUtterances.some((h) => TOPIC_HINT_RE.test(h));
    if (affirm && hasTheme && hostTheme && tt.length >= 6) {
      return { echo: true, score: 0.82, reason: "post-hold-affirm+theme" };
    }
  }

  if (
    /(四端联动|学生端|教师端|家庭端|运营端|ABCmouse|Teacher说|Family说|全园美语|三万九|39000|招生引擎|阅读模块|四端模块)/.test(
      t
    ) &&
    recentHostUtterances.some((h) => {
      const hub = normTextLocal(h);
      return (
        hub.includes("四端") ||
        hub.includes("全园美语") ||
        hub.includes("ABCmouse") ||
        hub.includes("三万九") ||
        hub.includes("阅读") ||
        hub.includes("模块") ||
        hub.includes("普通英语")
      );
    })
  ) {
    if (tt.length >= 8) return { echo: true, score: 0.75, reason: "faq-theme" };
  }
  let best = 0;
  let reason = "";
  for (const h of recentHostUtterances) {
    const hub = normTextLocal(h);
    if (hub.length < 8) continue;
    const needle = hub.slice(0, Math.min(20, hub.length));
    if (needle.length >= 8 && tt.includes(needle.slice(0, 10))) {
      best = Math.max(best, 0.75);
      reason = "substr";
    }
    let winHits = 0;
    const win = 8;
    for (let i = 0; i + win <= Math.min(hub.length, 80); i += 4) {
      if (tt.includes(hub.slice(i, i + win))) winHits += 1;
    }
    if (winHits >= 2) {
      const score = Math.min(0.95, 0.45 + winHits * 0.12);
      if (score > best) {
        best = score;
        reason = `win8=${winHits}`;
      }
    }
    let hit = 0;
    for (let i = 0; i + 6 <= Math.min(hub.length, 60); i += 6) {
      if (tt.includes(hub.slice(i, i + 6))) hit += 1;
    }
    const score = hit / 5;
    if (score > best) {
      best = score;
      reason = `ngram=${hit}`;
    }
  }
  if (best >= 0.62) return { echo: true, score: best, reason };
  return { echo: false, score: best, reason };
}

function setThinkingUi(on, label) {
  thinkingUi = !!on;
  const chip = $("chipThinking");
  if (chip) {
    chip.classList.toggle("on", thinkingUi);
    chip.classList.toggle("warn", thinkingUi);
    chip.textContent = thinkingUi ? label || "思考中" : "思考中";
  }
  renderDuplexStats();
}

function renderDuplexStats() {
  const el = $("duplexStats");
  if (!el) return;
  const holdLeft = Math.max(0, holdUntil - Date.now());
  const cdLeft = Math.max(0, cooldownUntil - Date.now());
  const q = pendingPatrolReason ? " · 排队 1 问" : "";
  const th = thinkingUi ? " · 思考中" : patrolInFlight ? " · 巡检中" : "";
  el.textContent = `会阶 ${meetingLifeLabel || meetingLifeUi} · 大智: ${interactionModeLabel || interactionModeUi} · 半双工 ${duplexPhase} · hold ${Math.ceil(
    holdLeft / 1000
  )}s · cool ${Math.ceil(cdLeft / 1000)}s · 回灌丢弃 ${echoDiscardCount} · 采纳 ${asrAcceptedCount} · 抑制播报 ${suppressSpeakCount}${th}${q}`;
  el.className =
    "status " +
    (thinkingUi ||
    pendingPatrolReason ||
    meetingLifeUi === "OPENING" ||
    meetingLifeUi === "CLOSING" ||
    meetingLifeUi === "HOLD" ||
    interactionModeUi === "HA_ASK" ||
    interactionModeUi === "HA_TALK" ||
    interactionModeUi === "HA_BIZ"
      ? "warn"
      : duplexPhase === "IDLE"
        ? "ok"
        : "warn");
  const chip = $("chipAgentMode");
  if (chip) {
    chip.textContent = interactionModeLabel || interactionModeUi || "模式";
    chip.classList.toggle("on", true);
    chip.classList.toggle(
      "warn",
      interactionModeUi === "HA_ASK" ||
        interactionModeUi === "HA_TALK" ||
        interactionModeUi === "HA_BIZ" ||
        interactionModeUi === "HH_SUM"
    );
    chip.classList.toggle("good", interactionModeUi === "HH" || interactionModeUi === "IDLE_LISTEN");
  }
  const lifeChip = $("chipMeetingLife");
  if (lifeChip) {
    const duplexHint =
      duplexPhase === "SPEAKING"
        ? "播报中"
        : meetingLifeUi === "HOLD" || agentHoldListening
          ? "占麦中"
          : meetingLifeLabel || meetingLifeUi || "会阶";
    lifeChip.textContent =
      duplexPhase === "SPEAKING" && meetingLifeUi !== "CLOSING" && meetingLifeUi !== "OPENING"
        ? `播报 · ${meetingLifeLabel || meetingLifeUi}`
        : duplexHint === "占麦中"
          ? "占麦中"
          : meetingLifeLabel || meetingLifeUi || "会阶";
    lifeChip.classList.toggle("on", true);
    lifeChip.classList.toggle(
      "warn",
      meetingLifeUi === "OPENING" ||
        meetingLifeUi === "CLOSING" ||
        meetingLifeUi === "HOLD" ||
        meetingLifeUi === "SUMMARY" ||
        duplexPhase === "SPEAKING"
    );
    lifeChip.classList.toggle(
      "good",
      meetingLifeUi === "SILENT" || meetingLifeUi === "OFF"
    );
  }
}

function formatDetail(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail.slice(0, 400);
  try {
    return JSON.stringify(detail).slice(0, 400);
  } catch {
    return String(detail).slice(0, 200);
  }
}

function showAlert(text, kind) {
  const el = $("alertBanner");
  if (!el) return;
  if (!text) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = text;
  el.className = "status " + (kind || "warn");
  if (kind === "bad") {
    el.style.borderColor = "#f87171";
    el.style.background = "#450a0a";
    el.style.color = "#fecaca";
  } else if (kind === "ok") {
    el.style.borderColor = "#4ade80";
    el.style.background = "#052e16";
    el.style.color = "#bbf7d0";
  } else {
    el.style.borderColor = "#f59e0b";
    el.style.background = "#422006";
    el.style.color = "#fde68a";
  }
}

function appendLogLine(level, tag, message, detail) {
  const el = $("log");
  if (!el) return;
  const t = new Date().toLocaleTimeString();
  const det = detail !== undefined ? " " + formatDetail(detail) : "";
  const color =
    level === "ERROR" ? "#f87171" : level === "WARN" ? "#fbbf24" : level === "DEBUG" ? "#64748b" : "#cbd5e1";
  const line = document.createElement("div");
  line.style.color = color;
  // textContent 保证 UTF-8 中文不二次编码乱码
  line.textContent = `[${t}] [${level}] [${tag}] ${String(message || "")}${det}`;
  el.insertBefore(line, el.firstChild);
  while (el.childNodes.length > 500) el.removeChild(el.lastChild);
}

function log(message, detail) {
  slog("INFO", "UI", message, detail);
}

function slog(level, tag, message, detail) {
  appendLogLine(level, tag, message, detail);
  try {
    window.bridge?.logUi?.(level, tag, message, detail);
  } catch (_) {}
}

function deviceSnapshot() {
  return {
    captureLabel: selectedLabel("inputDevice"),
    captureId: ($("inputDevice").value || "").slice(0, 24),
    playLabel: selectedLabel("outputDevice"),
    playId: ($("outputDevice").value || "").slice(0, 24),
    captureIsVirtual: isVirtualLabel(selectedLabel("inputDevice")),
    playIsVirtual: isVirtualLabel(selectedLabel("outputDevice")),
    playLooksDefault: /default/i.test(selectedLabel("outputDevice")),
    virtualOnly: $("virtualOnly").checked,
    allowPhysical: $("allowPhysical").checked,
    localMonitor: !!$("localMonitor")?.checked,
    chkHost: $("chkHost").checked,
    chkAiSpk: $("chkAiSpk").checked,
    chkAiMic: $("chkAiMic").checked,
    listening,
    loopActive: !$("loopStop").disabled
  };
}

function setStatus(text, kind) {
  $("status").textContent = text;
  $("status").className = "status " + (kind || "warn");
}

function setChip(id, on, extra) {
  const el = $(id);
  el.classList.toggle("on", !!on);
  if (extra === "good") {
    el.classList.add("good");
    el.classList.remove("bad");
  } else if (extra === "bad") {
    el.classList.add("bad");
    el.classList.remove("good");
  } else if (!on) {
    el.classList.remove("good", "bad");
  }
}

function isVirtualLabel(label) {
  return VIRTUAL_RE.test(label || "");
}

function isBannedCableLabel(label) {
  const s = String(label || "");
  return /default/i.test(s) || /16\s*ch|16ch|16通道/i.test(s);
}

function looksPhysical(label) {
  if (isVirtualLabel(label)) return false;
  return PHYSICAL_WARN_RE.test(label || "") || /default\s*-/i.test(label || "");
}

function preferVirtual(select, list) {
  const virtual = list.filter((d) => isVirtualLabel(d.label) && !isBannedCableLabel(d.label));
  if (!virtual.length) return;
  if (select.id === "inputDevice") {
    const cableOut = virtual.find((d) => /cable\s*output/i.test(d.label));
    const a = virtual.find((d) => /cable.?a|a\)/i.test(d.label));
    select.value = (cableOut || a || virtual[0]).deviceId;
    return;
  }
  if (select.id === "outputDevice") {
    const cableIn = virtual.find(
      (d) => /cable\s*input/i.test(d.label) && !/output/i.test(d.label.replace(/input/gi, ""))
    );
    const b = virtual.find((d) => /cable.?b|b\)/i.test(d.label));
    select.value = (cableIn || b || virtual[0]).deviceId;
    return;
  }
  select.value = virtual[0].deviceId;
}

function fill(select, list, empty) {
  const prev = select.value;
  select.innerHTML = "";
  if (!list.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = empty;
    select.appendChild(opt);
    return;
  }
  for (const d of list) {
    const opt = document.createElement("option");
    opt.value = d.deviceId;
    const label = d.label || d.deviceId;
    const tag = isVirtualLabel(label) ? " [虚拟]" : looksPhysical(label) ? " [物理-勿选]" : "";
    opt.textContent = label + tag;
    select.appendChild(opt);
  }
  if ([...select.options].some((o) => o.value === prev)) select.value = prev;
  else preferVirtual(select, list);
}

function selectedLabel(selectId) {
  return $(selectId).selectedOptions[0]?.textContent?.replace(/\s*\[.*\]\s*$/, "") || "";
}

function updateRouteHint() {
  const inL = selectedLabel("inputDevice");
  const outL = selectedLabel("outputDevice");
  const inOk = isVirtualLabel(inL);
  const outOk = isVirtualLabel(outL);
  setChip("chipVirtual", inOk && outOk, inOk && outOk ? "good" : "bad");

  $("routeHint").innerHTML =
    `VB-Cable 约定：<b>CABLE Input=播放端</b>，<b>CABLE Output=录音端</b>。<br>` +
    `听会：腾讯会议 <b>AI 扬声器必须=CABLE Input</b> → 采集 <b>${inL || "未选"}</b>(应为 Output) → EXE ASR<br>` +
    `出声：EXE→播放 <b>${outL || "未选"}</b>(应为 Input) → 会议 <b>AI 麦=CABLE Output</b> → 测试账号耳机<br>` +
    `<b>转写为空？</b>让「测试」大声说话，看「会场声」灯与输入电平是否跳动；不跳=会议扬声器没进 Cable（不是 ASR 坏了）。<br>` +
    `<b>听不到 AI？</b>AI 账号取消静音；可勾选「本机同时听」先确认 EXE 有声。<br>` +
    (inOk && outOk
      ? '<span class="ok">已绑定虚拟设备。单 Cable 易串扰，正式场景建议 Cable-A 听会 + Cable-B 出声。</span>'
      : '<span class="bad">请改为虚拟设备。物理麦/显示器音频不能用于 AI 环路。</span>');

  updateMeetingGate();
  slog("DEBUG", "Route", "路由提示已更新", deviceSnapshot());
}

function updateMeetingGate() {
  const checks =
    $("chkHost").checked && $("chkAiSpk").checked && $("chkAiMic").checked;
  const inOk = isVirtualLabel(selectedLabel("inputDevice"));
  const outOk = isVirtualLabel(selectedLabel("outputDevice"));
  const allowPhys = $("allowPhysical").checked;
  const devicesOk = allowPhys || (inOk && outOk);

  const gate = $("meetingGate");
  if (checks && devicesOk) {
    gate.textContent = "核对通过：可用虚拟环路启动控场。";
    gate.className = "status ok";
    $("start").disabled = listening;
  } else {
    const miss = [];
    if (!$("chkHost").checked) miss.push("主持人真麦真箱");
    if (!$("chkAiSpk").checked) miss.push("AI 扬声器=虚拟输出");
    if (!$("chkAiMic").checked) miss.push("AI 麦克风=虚拟麦");
    if (!devicesOk) miss.push("EXE 两侧选虚拟设备");
    gate.textContent = "待完成：" + miss.join("；");
    gate.className = "status warn";
    if (!listening) $("start").disabled = true;
  }
}

function renderArch() {
  $("archBox").textContent = `
腾讯会议 · 主持人账号          腾讯会议 · AI 专家账号              本 EXE（AI 大脑）
真麦克风 / 真音箱              扬声器 → 虚拟音频输出 ───────────→ ① 采集（听会 ASR）
                              麦克风 ← 虚拟麦克风   ←─────────── ② 播放（仅 Host TTS）
                                    ↑ 电脑内部数字环路，无外接线 ↑
驱动：VB-Cable / VoiceMeeter / 微软 SysVAD 类 Virtual Audio Device
`.trim();
}

async function ensureLabels() {
  const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
  tmp.getTracks().forEach((t) => t.stop());
}

async function refreshDevices() {
  slog("INFO", "Device", "开始刷新设备列表…");
  await ensureLabels();
  const devices = await navigator.mediaDevices.enumerateDevices();
  allInputs = devices.filter((d) => d.kind === "audioinput");
  allOutputs = devices.filter((d) => d.kind === "audiooutput");
  applyDeviceFilter();
  const vIn = allInputs.filter((d) => isVirtualLabel(d.label)).length;
  const vOut = allOutputs.filter((d) => isVirtualLabel(d.label)).length;
  slog("INFO", "Device", "刷新完成", {
    inputs: allInputs.length,
    outputs: allOutputs.length,
    virtualIn: vIn,
    virtualOut: vOut,
    inputLabels: allInputs.map((d) => d.label),
    outputLabels: allOutputs.map((d) => d.label),
    selected: deviceSnapshot()
  });
  if (vIn === 0 || vOut === 0) {
    slog("WARN", "Device", "未检测到足够虚拟声卡，请安装 VB-Cable 后重启再刷新");
  }
  try {
    localStorage.setItem(
      "ece_bridge_devices",
      JSON.stringify({
        input: $("inputDevice").value,
        output: $("outputDevice").value
      })
    );
  } catch (_) {}
}

function applyDeviceFilter() {
  const only = $("virtualOnly").checked;
  let inputs = allInputs;
  let outputs = allOutputs;
  if (only) {
    inputs = allInputs.filter((d) => isVirtualLabel(d.label));
    outputs = allOutputs.filter((d) => isVirtualLabel(d.label));
  }
  fill(
    $("inputDevice"),
    inputs,
    only ? "无虚拟输入 — 请安装 VB-Cable / SysVAD" : "无输入设备"
  );
  fill(
    $("outputDevice"),
    outputs,
    only ? "无虚拟输出 — 请安装 VB-Cable / SysVAD" : "无输出设备"
  );
  try {
    const saved = JSON.parse(localStorage.getItem("ece_bridge_devices") || "{}");
    const inOk =
      saved.input &&
      [...$("inputDevice").options].some((o) => o.value === saved.input) &&
      !isBannedCableLabel(selectedLabelFromValue("inputDevice", saved.input));
    const outOk =
      saved.output &&
      [...$("outputDevice").options].some((o) => o.value === saved.output) &&
      !isBannedCableLabel(selectedLabelFromValue("outputDevice", saved.output));
    if (inOk) $("inputDevice").value = saved.input;
    if (outOk) $("outputDevice").value = saved.output;
  } catch (_) {}
  updateRouteHint();
}

function selectedLabelFromValue(selectId, value) {
  const opt = [...$(selectId).options].find((o) => o.value === value);
  return (opt?.textContent || "").replace(/\s*\[.*\]\s*$/, "");
}

function assertVirtualOrAllowed(kind, label) {
  if ($("allowPhysical").checked) return;
  if (!isVirtualLabel(label)) {
    throw new Error(
      `${kind}必须是虚拟设备（当前：${label}）。请安装 VB-Cable/SysVAD，或勾选「允许物理设备」仅作调试。`
    );
  }
  if (isBannedCableLabel(label)) {
    throw new Error(
      `${kind}不能选 Default 或 CABLE In 16ch（当前：${label}）。请选「CABLE Output」采集、「CABLE Input」播放。`
    );
  }
}

function stopMeter() {
  if (meterTimer) clearInterval(meterTimer);
  meterTimer = null;
  $("level").style.width = "0%";
}

async function openInput() {
  await closeInput();
  const deviceId = $("inputDevice").value;
  if (!deviceId) throw new Error("未选择虚拟采集设备");
  const label = selectedLabel("inputDevice");
  assertVirtualOrAllowed("采集（应为 CABLE Output）", label);
  slog("INFO", "Capture", "打开采集设备", { label, deviceId: deviceId.slice(0, 32) });

  inputStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    }
  });
  const tracks = inputStream.getAudioTracks().map((t) => ({
    label: t.label,
    enabled: t.enabled,
    muted: t.muted,
    readyState: t.readyState,
    settings: t.getSettings?.()
  }));
  slog("INFO", "Capture", "getUserMedia 成功", { tracks });
  inCtx = new AudioContext();
  if (inCtx.state === "suspended") await inCtx.resume();
  slog("INFO", "Capture", "AudioContext", { sampleRate: inCtx.sampleRate, state: inCtx.state });
  const src = inCtx.createMediaStreamSource(inputStream);
  analyser = inCtx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let peakLogAt = 0;
  lastSpeechRmsAt = Date.now();
  lowLevelWarnAt = 0;
  meterTimer = setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    $("level").style.width = Math.min(100, Math.round(rms * 400)) + "%";
    const now = Date.now();
    const inCableInject = now < suppressCableInjectUntil;
    const inHostTts = now < hostSpeakingUntil;

    if (rms > 0.025) {
      lastSpeechRmsAt = now;
      if (listening && !inCableInject) {
        setChip("chipMeetingAudio", true, "good");
      }
      if (rms > 0.04 && now - peakLogAt > 2000) {
        peakLogAt = now;
        slog("DEBUG", "Capture", "检测到输入电平", {
          rms: Number(rms.toFixed(4)),
          listening,
          hostTts: inHostTts,
          cableInject: inCableInject
        });
      }
    } else if (listening) {
      setChip("chipMeetingAudio", false);
      // 听会中持续近静音：仅在「长期无 ASR」时提示路由；句间停顿不算断 Cable
      const quietMs = now - lastSpeechRmsAt;
      const sinceAsr = lastAsrFinalAt ? now - lastAsrFinalAt : Infinity;
      const asrHealthy = asrAcceptedCount >= 2 && sinceAsr < 90000;
      if (
        quietMs > 20000 &&
        sinceAsr > 45000 &&
        !asrHealthy &&
        now - lowLevelWarnAt > 30000 &&
        !inHostTts
      ) {
        lowLevelWarnAt = now;
        showAlert(
          "会场声长时间过低：请确认腾讯会议「AI」账号扬声器=CABLE Input，且「测试」正在说话。自检哔声有电平≠会议声已进 Cable。",
          "bad"
        );
        slog("WARN", "Capture", "听会中采集近静音过久", {
          quietMs,
          sinceAsr,
          asrFinalCount,
          hint: "AI扬声器应=CABLE Input"
        });
        setStatus("会场声过低 — 检查 AI 扬声器是否接到 CABLE Input", "bad");
      } else if (quietMs > 20000 && asrHealthy && now - lowLevelWarnAt > 60000) {
        // 有近期转写：只记 debug，不弹红条吓用户
        lowLevelWarnAt = now;
        slog("DEBUG", "Capture", "句间静音（已有转写，忽略路由告警）", {
          quietMs,
          sinceAsr,
          asrFinalCount
        });
      }
    }
  }, 80);
}

async function closeInput() {
  stopMeter();
  captureNode?.disconnect();
  captureNode = null;
  inputStream?.getTracks().forEach((t) => t.stop());
  inputStream = null;
  if (inCtx) {
    await inCtx.close().catch(() => {});
    inCtx = null;
  }
}

async function playWavToDevice(wavAb, sinkId, label) {
  const blob = new Blob([wavAb], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let sinkOk = false;
  if (sinkId && audio.setSinkId) {
    try {
      await audio.setSinkId(sinkId);
      sinkOk = true;
    } catch (e) {
      slog("ERROR", "Play", "setSinkId 失败", {
        label,
        error: e.message || String(e)
      });
    }
  }
  try {
    await audio.play();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  await new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    setTimeout(resolve, 2500);
  });
  return sinkOk;
}

async function makeBeepWav(durationSec = 1.0, hz = 880, gain = 0.55) {
  const sampleRate = 48000;
  const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * durationSec), sampleRate);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = hz;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(durationSec);
  const rendered = await ctx.startRendering();
  return audioBufferToWav(rendered);
}

/** 测量采集设备在 windowMs 内的峰值 RMS（不改变 listening 状态则恢复） */
async function measureCapturePeak(windowMs = 1200) {
  const wasListening = listening;
  let openedHere = false;
  try {
    if (!inputStream || !analyser) {
      await openInput();
      openedHere = true;
    }
    if (inCtx?.state === "suspended") await inCtx.resume();
    const data = new Uint8Array(analyser.fftSize);
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < windowMs) {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > peak) peak = rms;
      await new Promise((r) => setTimeout(r, 40));
    }
    return { peak, ok: peak > 0.015 };
  } finally {
    if (openedHere && !wasListening) {
      await closeInput();
    }
  }
}

async function playBeepToSink() {
  const sinkId = $("outputDevice").value;
  const outLabel = selectedLabel("outputDevice");
  assertVirtualOrAllowed("播放（应为 CABLE Input）", outLabel);
  const localMon = !!$("localMonitor")?.checked;
  slog("INFO", "Beep", "开始测虚拟麦", {
    outLabel,
    sinkId: (sinkId || "").slice(0, 40),
    localMonitor: localMon,
    snapshot: deviceSnapshot()
  });
  if (/default/i.test(outLabel)) {
    slog("WARN", "Beep", "播放设备名含 Default，setSinkId 常失败，请改选不带 Default 的 CABLE Input");
  }

  const wav = await makeBeepWav(1.0, 880, 0.55);
  slog("INFO", "Beep", "WAV 已生成", { bytes: wav.byteLength, durationSec: 1.0, hz: 880, gain: 0.55 });

  // 先开采集，便于环回检测电平
  const needTempCapture = !inputStream;
  if (needTempCapture) {
    try {
      await openInput();
    } catch (e) {
      slog("WARN", "Beep", "临时打开采集失败，跳过环回电平检测", { error: e.message || String(e) });
    }
  }

  const measurePromise = inputStream
    ? measureCapturePeak(1400)
    : Promise.resolve({ peak: 0, ok: false, skipped: true });

  const cableOk = await playWavToDevice(wav, sinkId, outLabel);
  slog("INFO", "Beep", "已播放到虚拟播放端", {
    sinkOk: cableOk,
    listenHint: "会议里听：AI 必须开麦且麦克风=CABLE Output；本机默认听不到"
  });

  if (localMon) {
    try {
      await playWavToDevice(wav, null, "本机默认输出");
      slog("INFO", "Beep", "本机监听已播放（真耳机/音箱应能直接听到哔声）");
    } catch (e) {
      slog("ERROR", "Beep", "本机监听播放失败", { error: e.message || String(e) });
    }
  }

  const peak = await measurePromise;
  slog("INFO", "Beep", "环回采集峰值", peak);
  if (peak.ok) {
    showAlert(
      `环路 OK：播放进 CABLE 后采集峰值 RMS=${peak.peak.toFixed(3)}。这只证明 EXE↔CABLE；会议转写还要 AI 扬声器=CABLE Input。`,
      "ok"
    );
  } else if (!peak.skipped) {
    showAlert(
      `环路异常：播放后采集几乎无电平 (RMS=${Number(peak.peak || 0).toFixed(4)})。请确认「播放=CABLE Input、采集=CABLE Output」且为同一条 Cable。`,
      "bad"
    );
  } else if (!localMon) {
    showAlert(
      "已送入虚拟麦链路。勾选「本机同时听」可先确认 EXE 出声；会议无声请开 AI 麦克风。",
      "warn"
    );
  }

  if (needTempCapture && !listening) {
    await closeInput();
  }
  return { cableOk, peak, localMon };
}

function audioBufferToWav(buffer) {
  const numChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const dataLength = samples * numChan * 2;
  const ab = new ArrayBuffer(44 + dataLength);
  const view = new DataView(ab);
  const writeStr = (o, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChan * 2, true);
  view.setUint16(32, numChan * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  const ch0 = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, ch0[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return ab;
}

let monitorCtx = null;
let monitorNext = 0;

async function ensureMonitorCtx() {
  if (!$("localMonitor")?.checked) return null;
  if (monitorCtx) {
    if (monitorCtx.state === "suspended") await monitorCtx.resume();
    return monitorCtx;
  }
  monitorCtx = new AudioContext({ sampleRate: 24000 });
  if (monitorCtx.state === "suspended") await monitorCtx.resume();
  monitorNext = 0;
  slog("INFO", "Monitor", "本机监听 AudioContext 已创建（不绑 CABLE，走系统默认输出）");
  return monitorCtx;
}

function playPcmToMonitor(audioBuf) {
  if (!monitorCtx || !$("localMonitor")?.checked) return;
  const src = monitorCtx.createBufferSource();
  src.buffer = audioBuf;
  src.connect(monitorCtx.destination);
  const now = monitorCtx.currentTime;
  if (monitorNext < now + 0.02) monitorNext = now + 0.05;
  src.start(monitorNext);
  monitorNext += audioBuf.duration;
}

async function ensurePlayCtx() {
  if (playCtx) {
    if (playCtx.state === "suspended") {
      await playCtx.resume();
      slog("INFO", "PlayCtx", "已 resume suspended context");
    }
    return playCtx;
  }
  playCtx = new AudioContext({ sampleRate: 24000 });
  const sink = $("outputDevice").value;
  const outLabel = selectedLabel("outputDevice");
  assertVirtualOrAllowed("播放（应为 CABLE Input）", outLabel);
  slog("INFO", "PlayCtx", "创建播放 AudioContext", {
    outLabel,
    sampleRate: playCtx.sampleRate,
    state: playCtx.state,
    hasSetSinkId: typeof playCtx.setSinkId === "function"
  });
  if (playCtx.state === "suspended") await playCtx.resume();
  if (sink && typeof playCtx.setSinkId === "function") {
    try {
      await playCtx.setSinkId(sink);
      slog("INFO", "PlayCtx", "setSinkId 成功", { sink: sink.slice(0, 40) });
    } catch (e) {
      slog("ERROR", "PlayCtx", "setSinkId 失败，Host TTS 可能进不了虚拟麦", {
        error: e.message || String(e)
      });
      showAlert("播放设备 setSinkId 失败：Host 声音可能进不了会议。请改选非 Default 的 CABLE Input。", "bad");
    }
  }
  nextPlay = 0;
  await ensureMonitorCtx();
  return playCtx;
}

function playPcm16Base64(b64, sampleRate) {
  if (!playCtx) {
    slog("WARN", "TTS", "收到音频但 playCtx 为空，丢弃");
    return;
  }
  if (playCtx.state === "suspended") {
    playCtx.resume().catch(() => {});
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const samples = Math.floor(bytes.length / 2);
  if (!samples) return;
  const view = new DataView(bytes.buffer);
  const audioBuf = playCtx.createBuffer(1, samples, sampleRate);
  const ch = audioBuf.getChannelData(0);
  for (let i = 0; i < samples; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
  const src = playCtx.createBufferSource();
  src.buffer = audioBuf;
  src.connect(playCtx.destination);
  const now = playCtx.currentTime;
  if (nextPlay < now + 0.02) nextPlay = now + 0.05;
  src.start(nextPlay);
  nextPlay += audioBuf.duration;
  const remainMs = Math.ceil((nextPlay - playCtx.currentTime) * 1000) + 400;
  extendHostMute(remainMs, "tts-queue");

  // 本机监听：复制同一缓冲到默认音箱，方便确认 TTS 有声
  if ($("localMonitor")?.checked) {
    void ensureMonitorCtx().then(() => {
      if (!monitorCtx) return;
      const copy = monitorCtx.createBuffer(1, samples, sampleRate);
      copy.copyToChannel(ch, 0);
      playPcmToMonitor(copy);
    });
  }

  ttsPlayCount += 1;
  if (ttsPlayCount === 1 || ttsPlayCount % 15 === 0) {
    slog("INFO", "TTS", "本地播放 TTS 分片", {
      count: ttsPlayCount,
      samples,
      sampleRate,
      playLabel: selectedLabel("outputDevice"),
      localMonitor: !!$("localMonitor")?.checked,
      ctxState: playCtx.state
    });
  }
  if (ttsPlayCount === 1) {
    showAlert(
      "已向虚拟麦发送 Host 语音。若本机勾了监听应能听到；会议无声请确认 AI 账号已开麦。",
      "warn"
    );
  }
}

function renderTranscript() {
  const finals = transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const live = partialAsr ? `\n会场(识别中): ${partialAsr}` : "";
  $("transcript").textContent =
    (finals || "（等待会场发言…）") + live;
  const stats = $("asrStats");
  if (stats) {
    stats.textContent = listening
      ? `已确认句 ${asrFinalCount} · 中间结果 ${asrDeltaCount} · ${
          partialAsr ? "正在识别…" : "等待下一句"
        }`
      : "启动听会后，此处显示实时转写（含中间结果）";
    stats.className = "status " + (asrFinalCount > 0 ? "ok" : "warn");
  }
}

function handleAsrEvent(msg) {
  if (msg.final) {
    let text = displayCorrectAsr(msg.text || partialAsr || "");
    partialAsr = "";
    if (!text) {
      renderTranscript();
      return;
    }
    const speaking = duplexPhase === PHASE.SPEAKING;
    const inMuteHold = Date.now() < hostSpeakingUntil;
    const bargeIn =
      msg.bargeIn === true || looksLikeBargeInLocal(text);
    // P1：播报中仅放行打断/续说口令；打断占麦中放行全部会场句
    if (msg.likelyEcho && !bargeIn) {
      echoDiscardCount += 1;
      slog("DEBUG", "ASR", "丢弃播报期疑似回灌", { text: text.slice(0, 60) });
      renderTranscript();
      renderDuplexStats();
      return;
    }
    if ((speaking || inMuteHold) && !agentHoldListening && !bargeIn) {
      echoDiscardCount += 1;
      slog("DEBUG", "ASR", "丢弃 TTS/回灌窗口内转写", {
        text: text.slice(0, 60),
        phase: duplexPhase,
        holdLeft: Math.max(0, hostSpeakingUntil - Date.now())
      });
      renderTranscript();
      renderDuplexStats();
      return;
    }
    if (bargeIn && (speaking || inMuteHold)) {
      // 口令到达：缩短 mute，立刻巡检
      hostSpeakingUntil = Math.min(hostSpeakingUntil, Date.now() + 400);
      slog("INFO", "ASR", "barge-in 口令放行", { text: text.slice(0, 60), phase: duplexPhase });
    }
    const echo = looksLikeHostEcho(text);
    if (echo.echo && !bargeIn && !agentHoldListening) {
      echoDiscardCount += 1;
      slog("WARN", "ASR", "丢弃疑似 Host 自语回灌", {
        text: text.slice(0, 80),
        score: echo.score,
        reason: echo.reason
      });
      extendHostMute(echo.reason.startsWith("post-hold") || echo.reason === "faq-theme" ? 3500 : 4000, "echo-final");
      renderTranscript();
      renderDuplexStats();
      return;
    }
    const last = transcriptLines[transcriptLines.length - 1];
    if (last && last.speaker === "会场") {
      if (last.text === text) {
        slog("DEBUG", "ASR", "忽略重复 final", { text });
        renderTranscript();
        return;
      }
      const within2s = lastAsrFinalAt && Date.now() - lastAsrFinalAt < 2000;
      if (
        within2s &&
        !bargeIn &&
        !looksLikeBargeInLocal(text) &&
        text.length < 48 &&
        last.text.length < 80 &&
        !/[？?]$/.test(last.text)
      ) {
        last.text = last.text.replace(/[。．]$/, "") + text;
        asrFinalCount += 1;
        asrAcceptedCount += 1;
        lastAsrFinalAt = Date.now();
        renderTranscript();
        lastSpeechRmsAt = Date.now();
        setChip("chipMeetingAudio", true, "good");
        slog("INFO", "ASR", "合并短句", { text: last.text, total: asrFinalCount, within2s });
        if (shouldImmediatePatrol(last.text) || looksLikeBargeInLocal(last.text)) {
          void runPatrol(looksLikeBargeInLocal(last.text) ? "barge-in" : "wake");
        } else if (agentHoldListening) {
          void runPatrol("hold");
        } else {
          schedulePatrol();
        }
        renderDuplexStats();
        return;
      }
    }
    asrFinalCount += 1;
    asrAcceptedCount += 1;
    lastAsrFinalAt = Date.now();
    transcriptLines.push({ speaker: "会场", text });
    try {
      window.bridge?.sessionAppend?.({ speaker: "会场", text });
    } catch (_) {}
    renderTranscript();
    lastSpeechRmsAt = Date.now();
    setChip("chipMeetingAudio", true, "good");
    slog("INFO", "ASR", "会场转写(final)", {
      text,
      total: asrFinalCount,
      bargeIn,
      hold: agentHoldListening
    });
    if (bargeIn || looksLikeBargeInLocal(text)) {
      slog("INFO", "Strategy", "检测到打断/续说口令，立即巡检", { text: text.slice(0, 80) });
      void runPatrol("barge-in");
    } else if (shouldImmediatePatrol(text)) {
      slog("INFO", "Strategy", "检测到大智口令/追问，立即巡检", { text: text.slice(0, 80) });
      void runPatrol("wake");
    } else if (agentHoldListening) {
      void runPatrol("hold");
    } else {
      schedulePatrol();
      // HH：多句后可做静默总结询问，不必立刻答
      if (transcriptLines.filter((l) => l.speaker === "会场").length - lastLineCountAtPatrol >= 4) {
        void runPatrol("lines");
      }
    }
    renderDuplexStats();
  } else {
    if (
      (Date.now() < hostSpeakingUntil || duplexPhase === PHASE.SPEAKING) &&
      !agentHoldListening
    ) {
      return;
    }
    const t = displayCorrectAsr(msg.text || "");
    if (!t) return;
    const echo = looksLikeHostEcho(t);
    if (echo.echo) {
      if (asrDeltaCount % 20 === 0) {
        slog("DEBUG", "ASR", "中间结果疑似回灌，已忽略", {
          text: t.slice(0, 60),
          reason: echo.reason
        });
      }
      return;
    }
    partialAsr = t;
    asrDeltaCount += 1;
    renderTranscript();
    lastSpeechRmsAt = Date.now();
    if (asrDeltaCount === 1 || asrDeltaCount % 8 === 0) {
      slog("DEBUG", "ASR", "中间结果", { text: t.slice(0, 80), n: asrDeltaCount });
    }
  }
}

function setAudioTestEnabled(enabled) {
  const dis = !enabled;
  if ($("beep")) $("beep").disabled = dis;
  if ($("selfTest")) $("selfTest").disabled = dis;
  if ($("loop")) $("loop").disabled = dis || !$("loopStop").disabled;
}

function renderA2a(events) {
  if (!events?.length) {
    $("a2a").textContent = "尚无 A2A 事件";
    return;
  }
  $("a2a").textContent = events
    .slice()
    .reverse()
    .map((e) => `${e.sender} → ${e.target}: ${e.action}`)
    .join("\n");
}

function renderTodos(todos) {
  $("todos").innerHTML = "";
  (todos || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    $("todos").appendChild(li);
  });
}

function schedulePatrol() {
  if (!$("autoPatrol").checked || !listening) return;
  if (Date.now() < hostSpeakingUntil || duplexPhase !== PHASE.IDLE) {
    if (silenceTimer) clearTimeout(silenceTimer);
    const delay = Math.max(
      SILENCE_PATROL_MS,
      hostSpeakingUntil - Date.now() + 2000,
      (cooldownUntil || 0) - Date.now() + 1000
    );
    silenceTimer = setTimeout(() => void runPatrol("silence"), delay);
    return;
  }
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => void runPatrol("silence"), SILENCE_PATROL_MS);
}

async function runPatrol(reason) {
  if (!listening) return;
  const isBarge = reason === "barge-in" || reason === "hold";
  if (patrolInFlight) {
    if (reason === "wake" || reason === "manual" || isBarge) {
      pendingPatrolReason = reason;
      slog("INFO", "Strategy", "巡检忙，问答已排队", { reason, queue: 1 });
      renderDuplexStats();
    } else {
      slog("DEBUG", "Strategy", "巡检进行中，single-flight 跳过", { reason });
    }
    return;
  }
  // P1：barge-in / 打断占麦巡检不受 TTS hold 阻挡（主进程已 cancel）
  if (
    !isBarge &&
    (Date.now() < hostSpeakingUntil || duplexPhase === PHASE.SPEAKING)
  ) {
    slog("DEBUG", "Strategy", "Host 播报/回灌期，跳过巡检", { reason, phase: duplexPhase });
    if (reason === "wake" || reason === "manual") {
      pendingPatrolReason = reason;
      const delay = Math.max(800, hostSpeakingUntil - Date.now() + 400);
      setTimeout(() => {
        if (!patrolInFlight && pendingPatrolReason) {
          const r = pendingPatrolReason;
          pendingPatrolReason = null;
          void runPatrol(r);
        }
      }, delay);
      renderDuplexStats();
    }
    return;
  }
  const now = Date.now();
  const minGap = reason === "wake" || reason === "manual" || isBarge ? 800 : 5000;
  if (now - lastPatrolAt < minGap) {
    slog("DEBUG", "Strategy", "巡检节流跳过", { reason, msSince: now - lastPatrolAt, minGap });
    if (reason === "wake" || isBarge) {
      pendingPatrolReason = reason;
      setTimeout(() => {
        if (!patrolInFlight && pendingPatrolReason) {
          const r = pendingPatrolReason;
          pendingPatrolReason = null;
          void runPatrol(r);
        }
      }, minGap - (now - lastPatrolAt) + 50);
      renderDuplexStats();
    }
    return;
  }
  // 仅冷场/多句巡检受唤起冷却限制；明确问句立即答
  if (
    reason !== "manual" &&
    reason !== "wake" &&
    !isBarge &&
    now - lastWakeSpeakAt < 16000
  ) {
    slog("DEBUG", "Strategy", "唤起冷却中，跳过自动巡检", {
      reason,
      sinceMs: now - lastWakeSpeakAt
    });
    return;
  }

  patrolInFlight = true;
  lastPatrolAt = now;
  lastLineCountAtPatrol = transcriptLines.length;
  setStatus(reason === "wake" ? "对话思考中…" : "策略巡检中…", "warn");
  setChip("chipPatrol", true);
  if (reason === "wake") setThinkingUi(true, "思考中");
  renderDuplexStats();

  const floorLines = transcriptLines
    .filter((l) => l.speaker === "会场")
    .slice(-6)
    .filter((l) => !looksLikeHostEcho(l.text).echo);
  const hostLines = transcriptLines
    .filter((l) => l.speaker === "大智" || l.speaker === "李老师" || l.speaker === "AI 主席")
    .slice(-1);
  const forEval = [...hostLines, ...floorLines];
  const textLog = forEval.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const quietMs = lastSpeechRmsAt ? now - lastSpeechRmsAt : null;

  slog("INFO", "Strategy", "发起巡检", {
    reason,
    phase: duplexPhase,
    lines: forEval.length,
    floor: floorLines.length,
    chars: textLog.length,
    quietMs,
    echoDiscardCount,
    asrAcceptedCount,
    pending: pendingPatrolReason
  });

  try {
    const evaluate = window.bridge.strategyEvaluate;
    const res = await evaluate({
      transcript: textLog || "（会场暂无转写，检测冷场）",
      agenda: $("agenda").value,
      quietMs,
      reason
    });
    setChip("chipPatrol", false);
    if (res.agent) {
      interactionModeUi = res.agent.mode || interactionModeUi;
      interactionModeLabel = res.agent.label || interactionModeLabel;
      if (res.agent.lifecycle) {
        meetingLifeUi = res.agent.lifecycle;
        meetingLifeLabel = res.agent.lifeLabel || meetingLifeUi;
      }
      if (res.agent.meetingId) meetingIdUi = res.agent.meetingId;
      renderDuplexStats();
    }
    if (res.duplex) {
      duplexPhase = res.duplex.phase || duplexPhase;
      if (res.duplex.holdUntil) holdUntil = res.duplex.holdUntil;
      if (res.duplex.cooldownUntil) cooldownUntil = res.duplex.cooldownUntil;
      renderDuplexStats();
    }
    if (!res.ok) {
      setStatus("巡检失败", "bad");
      slog("ERROR", "Strategy", res.error || "evaluate failed");
      return;
    }
    const r = res.result;
    renderA2a(r.a2aTrace);
    renderTodos(r.latestToDos);
    if (r.arkBillingOverdue) {
      showAlert(
        "Ark 账号欠费/过期（AccountOverdueError）：控场已改用启发式模板。请到火山方舟充值或更换 ARK_API_KEY。",
        "bad"
      );
      setChip("chipArk", true, "bad");
      slog("ERROR", "Strategy", "Ark 欠费，启发式控场", { error: r.arkError, mode: r.arkMode });
    } else if (r.arkMode === "heuristic") {
      slog("WARN", "Strategy", "本轮走启发式（非 LLM）", { mode: r.arkMode });
    } else {
      setChip("chipArk", true, "good");
    }
    if (r.wake?.echoSkipped || r.reason === "ECHO_SKIP" || r.reason === "DEDUP_SKIP") {
      slog("INFO", "Strategy", "策略跳过", { reason: r.reason, wake: r.wake });
    }
    // P1：打断占麦 / 续说状态
    if (r.holdToEnd || r.reason === "INTERRUPT" || r.reason === "HOLDING") {
      agentHoldListening = true;
      meetingLifeUi = "HOLD";
      meetingLifeLabel = "占麦中";
      hostSpeakingUntil = Math.min(hostSpeakingUntil, Date.now() + 400);
      setStatus("已打断 · 请说，说完「请继续」", "ok");
    } else if (r.reason === "MEETING_START") {
      agentHoldListening = false;
      meetingLifeUi = "OPENING";
      meetingLifeLabel = "开场中";
      if (r.meetingId) meetingIdUi = r.meetingId;
      setStatus(`会议开始 ${meetingIdUi || ""} · 开场白后静默`, "ok");
    } else if (r.reason === "MEETING_END") {
      agentHoldListening = false;
      meetingLifeUi = "CLOSING";
      meetingLifeLabel = "收尾中";
      setStatus("会末总结播报中，随后将停止听会并沉淀", "warn");
      if (r.closing) {
        const c = r.closing;
        showAlert(
          ["会末纪要草稿：", `结论：${c.conclusions || ""}`, `分歧：${c.disputes || ""}`, `待办：${c.todos || ""}`, `下一步：${c.nextStep || ""}`]
            .filter(Boolean)
            .join("\n"),
          "ok"
        );
      }
    } else if (
      r.reason === "CONTINUE" ||
      r.reason === "STOP" ||
      (r.shouldIntervene && r.interventionText)
    ) {
      agentHoldListening = false;
      if (r.reason === "STOP") {
        meetingLifeUi = "SILENT";
        meetingLifeLabel = "静默";
      }
    }
    if (r.silenceGate && !r.silenceGate.ok) {
      slog("INFO", "Strategy", "冷场门控", r.silenceGate);
    }

    if (r.shouldIntervene) {
      const label = "大智";
      const speakOk =
        res.speakResult?.ok === true ||
        res.speakResult?.queued ||
        res.speakResult?.earlyOnly;
      const speakBlocked =
        res.speakResult?.error === "listen_not_started" ||
        res.speakResult?.error === "not_open";
      const speakSuppressed = res.speakResult?.suppressed || r.suppressed;
      const showText = r.displayText || r.fullAnswer || r.interventionText || "";
      if (speakSuppressed) {
        suppressSpeakCount += 1;
        setStatus("已抑制播报（半双工/回灌防护）", "warn");
        slog("WARN", "Strategy", "主进程已抑制播报", {
          reason: r.reason,
          error: res.speakResult?.error
        });
        renderDuplexStats();
        return;
      }
      if (!speakOk && !speakBlocked && showText) {
        const echoOfPending = looksLikeHostEcho(showText);
        if (echoOfPending.echo && Date.now() - lastWakeSpeakAt < 60000) {
          suppressSpeakCount += 1;
          slog("WARN", "Strategy", "跳过与近期 Host 话术重复的播报", {
            reason: r.reason,
            echo: echoOfPending,
            text: String(showText || "").slice(0, 60)
          });
          setStatus("已抑制重复自语（疑似回灌）", "warn");
          renderDuplexStats();
          return;
        }
      }
      if (speakBlocked) {
        setStatus(`${label} 话术已定，但听会通道未就绪，未合成语音`, "warn");
        showAlert("控场话术已生成，请先「启动听会」后再发言/试播。", "warn");
        transcriptLines.push({
          speaker: label,
          text: showText + "（未播报：通道未就绪）"
        });
        renderTranscript();
      } else if (showText) {
        if (
          r.reason === "WAKE_ANSWER" ||
          r.reason === "SUMMARY" ||
          r.reason === "WAKE_ACK" ||
          r.reason === "STEER" ||
          r.reason === "SUMMARY_ASK"
        ) {
          lastWakeSpeakAt = Date.now();
        }
        rememberHostUtterance(showText);
        setStatus(`${label} 发言：` + showText, "ok");
        const last = transcriptLines[transcriptLines.length - 1];
        if (
          !(
            last &&
            last.speaker === label &&
            last.text.replace(/（合成中…）$/, "").replace(/（首句已播）$/, "") === showText
          )
        ) {
          transcriptLines.push({
            speaker: label,
            text: showText + (speakOk ? "（合成中…）" : "")
          });
          renderTranscript();
        }
        if (!$("localMonitor")?.checked) {
          $("localMonitor").checked = true;
          slog("INFO", "Host", "发言时自动勾选本机同时听");
        }
      }
      slog("INFO", "Strategy", "需要发言", {
        reason: r.reason,
        text: showText,
        speakResult: res.speakResult,
        arkMode: r.arkMode,
        wake: r.wake,
        questionFp: r.questionFp,
        earlyCovered: r.earlyCovered
      });
    } else {
      setStatus(
        "巡检完成 · 无需干预" + (r.arkMode === "heuristic" ? "（启发式）" : ""),
        "ok"
      );
      slog("INFO", "Strategy", "无需干预", {
        trigger: reason,
        arkMode: r.arkMode,
        reason: r.reason
      });
    }
  } finally {
    patrolInFlight = false;
    setThinkingUi(false);
    setChip("chipPatrol", false);
    renderDuplexStats();
    // 忙完后冲刷排队问答
    if (pendingPatrolReason && listening) {
      const r = pendingPatrolReason;
      pendingPatrolReason = null;
      setTimeout(() => void runPatrol(r), 450);
    }
  }
}

function startCaptureToListen() {
  const src = inCtx.createMediaStreamSource(inputStream);
  const proc = inCtx.createScriptProcessor(4096, 1, 1);
  const mute = inCtx.createGain();
  mute.gain.value = 0;
  proc.onaudioprocess = (ev) => {
    if (!listening) return;
    const muteReal =
      !agentHoldListening &&
      (Date.now() < hostSpeakingUntil || duplexPhase === PHASE.SPEAKING || duplexPhase === PHASE.COOLDOWN);
    const f32 = muteReal
      ? new Float32Array(ev.inputBuffer.length)
      : ev.inputBuffer.getChannelData(0);
    const pcm = downsampleTo16k(f32, inCtx.sampleRate);
    if (!pcm.length) return;
    const bytes = new Uint8Array(pcm.buffer);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    window.bridge.listenAudio(btoa(bin));
  };
  src.connect(proc);
  proc.connect(mute);
  mute.connect(inCtx.destination);
  captureNode = proc;
}

/** 二阶低通，去掉 8 kHz 以上后再抽取，避免 zh/z 混叠 */
function lowpassBiquad(f32, sampleRate, cutoffHz) {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * 0.707);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const out = new Float32Array(f32.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < f32.length; i++) {
    const x0 = f32[i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function downsampleTo16k(f32, rateIn) {
  if (rateIn === 16000) return floatTo16(f32);
  let filtered = f32;
  for (let stage = 0; stage < 3; stage++) filtered = lowpassBiquad(filtered, rateIn, 6800);
  const ratio = rateIn / 16000;
  const outLen = Math.floor(filtered.length / ratio);
  const out = new Float32Array(outLen);
  const last = filtered.length - 1;
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const s0 = filtered[i0] || 0;
    const s1 = filtered[Math.min(i0 + 1, last)] || 0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return floatTo16(out);
}

function floatTo16(f32) {
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm;
}

$("refresh").onclick = () => refreshDevices().catch((e) => slog("ERROR", "Device", e.message || String(e)));
$("virtualOnly").onchange = () => {
  slog("INFO", "Device", "切换仅虚拟列表", { virtualOnly: $("virtualOnly").checked });
  applyDeviceFilter();
};
$("allowPhysical").onchange = () => {
  slog("WARN", "Device", "允许物理设备", { allowPhysical: $("allowPhysical").checked });
  updateRouteHint();
};
$("inputDevice").onchange = () => {
  updateRouteHint();
  slog("INFO", "Device", "用户更改采集设备", deviceSnapshot());
  try {
    localStorage.setItem(
      "ece_bridge_devices",
      JSON.stringify({ input: $("inputDevice").value, output: $("outputDevice").value })
    );
  } catch (_) {}
};
$("outputDevice").onchange = () => $("inputDevice").onchange();
["chkHost", "chkAiSpk", "chkAiMic"].forEach((id) => {
  $(id).onchange = () => {
    slog("INFO", "Checklist", "双账号核对变更", {
      host: $("chkHost").checked,
      aiSpk: $("chkAiSpk").checked,
      aiMic: $("chkAiMic").checked
    });
    updateMeetingGate();
  };
});

$("beep").onclick = async () => {
  if (listening) {
    showAlert("听会进行中禁止测虚拟麦（会干扰 ASR）。请先点「停止」。", "warn");
    slog("WARN", "Beep", "听会中拒绝测麦");
    return;
  }
  try {
    if (!$("loopStop").disabled) {
      slog("WARN", "Beep", "环路仍在运行，建议先停环路再测");
    }
    suppressCableInjectUntil = Date.now() + 4000;
    const r = await playBeepToSink();
    if (r?.peak?.ok) {
      setStatus("测试音 OK：环路有电平；请确认会议 AI 已开麦", "ok");
    } else if (r?.localMon) {
      setStatus("本机应已听到哔声；会议无声=AI 未开麦或麦不是 CABLE Output", "warn");
    } else {
      setStatus("测试音已送入虚拟麦；建议勾选「本机同时听」再测", "warn");
    }
    slog("INFO", "Beep", "流程结束", r);
  } catch (e) {
    setStatus("测试音失败", "bad");
    slog("ERROR", "Beep", e.message || String(e), { stack: e.stack });
  }
};

$("selfTest").onclick = async () => {
  if (listening) {
    showAlert("听会进行中禁止一键自检（哔声会污染转写）。请先点「停止」。", "warn");
    slog("WARN", "SelfTest", "听会中拒绝自检");
    return;
  }
  try {
    setStatus("一键自检中…", "warn");
    slog("INFO", "SelfTest", "开始", deviceSnapshot());
    if (!$("localMonitor").checked) {
      $("localMonitor").checked = true;
      slog("INFO", "SelfTest", "已自动勾选本机同时听");
    }
    suppressCableInjectUntil = Date.now() + 5000;
    const r = await playBeepToSink();
    if (r.peak?.ok) {
      try {
        localStorage.setItem("ece_selftest_ok", "1");
      } catch (_) {}
      setStatus(`自检通过：环回 RMS=${r.peak.peak.toFixed(3)}。下一步核对 AI 扬声器=CABLE Input`, "ok");
      showAlert(
        "EXE↔CABLE 环路正常。转写还需：腾讯会议 AI 扬声器=CABLE Input，「测试」说话时输入电平应跳动。AI 出声还需取消静音。",
        "ok"
      );
    } else {
      try {
        localStorage.setItem("ece_selftest_ok", "0");
      } catch (_) {}
      setStatus("自检失败：CABLE 环回无电平", "bad");
      showAlert(
        "播放后采集无信号。请确认：播放选 CABLE Input、采集选 CABLE Output（同一条 Cable），不要选 Default。",
        "bad"
      );
    }
  } catch (e) {
    setStatus("自检失败", "bad");
    slog("ERROR", "SelfTest", e.message || String(e));
  }
};

$("loop").onclick = async () => {
  if (listening) {
    slog("WARN", "Loop", "请先停止控场再测环路");
    showAlert("听会中禁止环路测试，请先停止听会。", "warn");
    return;
  }
  try {
    slog("INFO", "Loop", "开始环路测试", deviceSnapshot());
    await openInput();
    loopCtx = new AudioContext();
    const sink = $("outputDevice").value;
    assertVirtualOrAllowed("播放", selectedLabel("outputDevice"));
    if (sink && loopCtx.setSinkId) {
      try {
        await loopCtx.setSinkId(sink);
        slog("INFO", "Loop", "环路 setSinkId 成功");
      } catch (e) {
        slog("ERROR", "Loop", "环路 setSinkId 失败", { error: e.message || String(e) });
      }
    }
    loopCtx.createMediaStreamSource(inputStream).connect(loopCtx.destination);
    $("loop").disabled = true;
    $("loopStop").disabled = false;
    setStatus("环路测试中（测完请停，避免回授）", "warn");
  } catch (e) {
    setStatus("环路失败", "bad");
    slog("ERROR", "Loop", e.message || String(e));
  }
};

$("loopStop").onclick = async () => {
  slog("INFO", "Loop", "停止环路");
  if (loopCtx) await loopCtx.close().catch(() => {});
  loopCtx = null;
  await closeInput();
  $("loop").disabled = false;
  $("loopStop").disabled = true;
  setStatus("环路已停", "ok");
  updateMeetingGate();
};

$("start").onclick = async () => {
  if (!$("loopStop").disabled) {
    slog("WARN", "Listen", "请先停止环路测试");
    return;
  }
  updateMeetingGate();
  if ($("start").disabled) {
    slog("WARN", "Listen", "核对未通过，拒绝启动", deviceSnapshot());
    return;
  }
  const capL = selectedLabel("inputDevice");
  const playL = selectedLabel("outputDevice");
  if (isBannedCableLabel(capL) || isBannedCableLabel(playL)) {
    showAlert("采集请选 CABLE Output、播放请选 CABLE Input，不要选 Default 或 16ch。", "bad");
    slog("WARN", "Listen", "拒绝禁用设备", deviceSnapshot());
    return;
  }
  if (!$("allowPhysical").checked && localStorage.getItem("ece_selftest_ok") !== "1") {
    showAlert("请先点「一键自检」并通过环回，再启动听会。", "warn");
    slog("WARN", "Listen", "自检未通过，拒绝启动");
    return;
  }
  try {
    setStatus("启动虚拟环路听会…", "warn");
    slog("INFO", "Listen", "启动听会+控场", deviceSnapshot());
    ttsPlayCount = 0;
    asrFinalCount = 0;
    asrDeltaCount = 0;
    lastAsrFinalAt = 0;
    echoDiscardCount = 0;
    asrAcceptedCount = 0;
    suppressSpeakCount = 0;
    duplexPhase = PHASE.IDLE;
    holdUntil = 0;
    cooldownUntil = 0;
    hostSpeakingUntil = 0;
    agentHoldListening = false;
    meetingLifeUi = "OFF";
    meetingLifeLabel = "未开会";
    meetingIdUi = "";
    recentHostUtterances = [];
    lastWakeSpeakAt = 0;
    listenStartedAtUi = Date.now();
    patrolInFlight = false;
    pendingPatrolReason = null;
    thinkingUi = false;
    setThinkingUi(false);
    partialAsr = "";
    transcriptLines = [];
    lastSpeechRmsAt = Date.now();
    lowLevelWarnAt = 0;
    renderTranscript();
    renderDuplexStats();
    setAudioTestEnabled(false);
    await openInput();
    await ensurePlayCtx();
    unlisten?.();
    unlisten = window.bridge.onEvent((msg) => {
      if (msg.type === "listen-ready") {
        if (msg.ok) {
          setStatus("虚拟环路听会中 · 请让「测试」说话并观察「会场声」灯", "ok");
          setChip("chipListen", true, "good");
          setChip("chipReconnect", true, "good");
          slog("INFO", "Listen", "听会通道就绪", { sessionId: msg.sessionId });
          slog(
            "WARN",
            "Meeting",
            "转写条件：AI 扬声器=CABLE Input；出声条件：AI 麦开麦且=CABLE Output"
          );
          showAlert(
            "听会已启动。请用「测试」账号说话：输入电平与「会场声」应跳动。若不跳 → 腾讯会议 AI 扬声器未选 CABLE Input。",
            "warn"
          );
        } else {
          setStatus("听会失败", "bad");
          setChip("chipReconnect", false, "bad");
          slog("ERROR", "Listen", msg.error || "listen failed");
        }
      } else if (msg.type === "asr") {
        handleAsrEvent(msg);
      } else if (msg.type === "host-interrupted") {
        agentHoldListening = true;
        duplexPhase = PHASE.IDLE;
        hostSpeakingUntil = Date.now() + 400;
        holdUntil = Date.now() + 400;
        setStatus("已打断播报 · 请讲，说完请说「请继续」", "ok");
        slog("INFO", "Host", "口令打断", {
          reason: msg.reason,
          preview: String(msg.interruptBuffer?.fullText || "").slice(0, 40)
        });
        renderDuplexStats();
      } else if (msg.type === "duplex-phase") {
        duplexPhase = msg.phase || duplexPhase;
        if (msg.holdUntil) holdUntil = msg.holdUntil;
        if (msg.cooldownUntil) cooldownUntil = msg.cooldownUntil;
        // 打断回 IDLE：不要用长 hold 盖住 barge-in 后的会场句
        if (msg.why && /barge-in|interrupt|INTERRUPT/i.test(String(msg.why))) {
          hostSpeakingUntil = Math.min(hostSpeakingUntil, msg.holdUntil || Date.now() + 400);
          agentHoldListening = true;
        } else if (msg.holdUntil) {
          hostSpeakingUntil = Math.max(hostSpeakingUntil, msg.holdUntil);
        }
        slog("INFO", "DuplexPhase", `${msg.prev || "?"} → ${msg.phase}`, {
          holdLeft: msg.holdUntil ? Math.max(0, msg.holdUntil - Date.now()) : 0,
          coolLeft: msg.cooldownUntil ? Math.max(0, msg.cooldownUntil - Date.now()) : 0,
          why: msg.why || msg.ok
        });
        renderDuplexStats();
      } else if (msg.type === "tts-audio") {
        extendHostMute(8000, "tts-audio");
        playPcm16Base64(msg.audio, 24000);
      } else if (msg.type === "tts-started") {
        rememberHostUtterance(msg.text);
        const pred = estimateHoldMsLocal(msg.text || "", 0);
        extendHostMute(pred, "tts-started");
        duplexPhase = PHASE.SPEAKING;
        setStatus("Host TTS 首包已到 → CABLE / 本机监听", "ok");
        slog("INFO", "TTS", "首包到达", { text: msg.text, predHold: pred });
        const last = transcriptLines[transcriptLines.length - 1];
        if (last && last.speaker && /合成中/.test(last.text) && msg.text) {
          last.text = msg.text;
          renderTranscript();
        }
        renderDuplexStats();
      } else if (msg.type === "host-speaking") {
        rememberHostUtterance(msg.text);
        lastWakeSpeakAt = Date.now();
        duplexPhase = PHASE.SPEAKING;
        const pred = estimateHoldMsLocal(msg.text || "", 0);
        extendHostMute(pred, "host-speaking");
        setStatus(
          `李老师发言中，转写暂缓约 ${Math.ceil(pred / 1000)}s…`,
          "warn"
        );
        slog("INFO", "Host", "Host→虚拟麦播报请求", {
          text: msg.text,
          retry: msg.retry,
          mode: msg.mode
        });
        showAlert(
          "正在合成 Host 语音… 请确认「本机同时听」；会议里听需 AI 开麦且麦=CABLE Output。",
          "warn"
        );
        renderDuplexStats();
      } else if (msg.type === "tts-failed") {
        hostSpeakingUntil = Math.min(hostSpeakingUntil, Date.now() + 1500);
        duplexPhase = PHASE.IDLE;
        setStatus("TTS 失败：豆包未返回语音", "bad");
        showAlert(
          "Host TTS 失败。若日志曾出现 unknown event / 45000000，请确认已重启应用后重试。",
          "bad"
        );
        slog("ERROR", "TTS", "合成失败", msg);
        const last = transcriptLines[transcriptLines.length - 1];
        if (last && /（合成中…）$/.test(last.text)) {
          last.text = last.text.replace(/（合成中…）$/, "（合成失败）");
          renderTranscript();
        }
        renderDuplexStats();
      } else if (msg.type === "host-speak-done") {
        if (msg.holdUntil) {
          applyHoldUntil(msg.holdUntil, "host-speak-done");
        } else {
          const hold = msg.holdMs || estimateHoldMsLocal(msg.text || "", msg.chunks || 0);
          extendHostMute(hold, "host-speak-done");
        }
        if (msg.cooldownUntil) cooldownUntil = msg.cooldownUntil;
        duplexPhase = msg.phase || PHASE.COOLDOWN;
        if (msg.ok) {
          rememberHostUtterance(msg.text);
          const holdLeft = Math.max(0, (msg.holdUntil || hostSpeakingUntil) - Date.now());
          setStatus(
            `播报完成 · 转写约 ${Math.max(1, Math.round(holdLeft / 1000))}s 后恢复（防回灌）`,
            "ok"
          );
          slog("INFO", "Host", "播报完成", {
            chunks: msg.chunks,
            holdMs: msg.holdMs,
            holdUntil: msg.holdUntil,
            phase: duplexPhase,
            text: msg.text
          });
          showAlert(
            `Host 已播完。半双工 COOLDOWN 中不把 AI 自语当会场；请用「测试」账号提问。`,
            "ok"
          );
          const last = transcriptLines[transcriptLines.length - 1];
          if (last && /（合成中…）$/.test(last.text) && msg.text) {
            last.text = msg.text;
            renderTranscript();
          } else if (last && /（合成中…）$/.test(last.text)) {
            last.text = last.text.replace(/（合成中…）$/, "");
            renderTranscript();
          }
        } else {
          setStatus("Host 播报失败（无 TTS 音频）", "bad");
          slog("ERROR", "Host", "播报失败", msg);
          const last = transcriptLines[transcriptLines.length - 1];
          if (last && /（合成中…）$/.test(last.text)) {
            last.text = last.text.replace(/（合成中…）$/, "（合成失败）");
            renderTranscript();
          }
        }
        renderDuplexStats();
      } else if (msg.type === "error") {
        const em =
          typeof msg.message === "string"
            ? msg.message
            : formatDetail(msg.message || msg);
        slog("ERROR", "Bridge", em, msg.code ? { code: msg.code } : undefined);
      } else if (msg.type === "closed") {
        setChip("chipListen", false);
        setChip("chipReconnect", false, "bad");
        setStatus(`听会通道断开 (code=${msg.code ?? "?"})，尝试自动重连…`, "warn");
        slog("WARN", "Listen", "听会通道关闭", { code: msg.code, reason: msg.reason });
      } else if (msg.type === "reconnecting") {
        setChip("chipReconnect", true);
        setStatus(`Duplex 自动重连中 (#${msg.attempt}，${msg.delayMs}ms)…`, "warn");
        slog("WARN", "Duplex", "自动重连中", msg);
      } else if (msg.type === "reconnected") {
        setChip("chipListen", true, "good");
        setChip("chipReconnect", true, "good");
        setStatus("听会通道已重连 · 继续控场", "ok");
        slog("INFO", "Duplex", "自动重连成功", { sessionId: msg.sessionId });
      } else if (msg.type === "reconnect-failed") {
        setChip("chipReconnect", false, "bad");
        setStatus("自动重连失败，请点「停止」后重新「启动听会」", "bad");
        showAlert("Seeduplex 多次重连失败。请停止听会后重试，并检查语音 Key / 网络。", "bad");
        slog("ERROR", "Duplex", "重连失败", msg);
      } else if (msg.type === "interaction-mode" || msg.type === "agent-mode") {
        interactionModeUi = msg.mode || interactionModeUi;
        interactionModeLabel = msg.label || interactionModeLabel;
        if (msg.lifecycle) {
          meetingLifeUi = msg.lifecycle;
          meetingLifeLabel = msg.lifeLabel || meetingLifeUi;
        }
        if (msg.meetingId) meetingIdUi = msg.meetingId;
        renderDuplexStats();
        slog("INFO", "大智", "模式切换", {
          mode: msg.mode,
          label: msg.label,
          lifecycle: msg.lifecycle,
          meetingId: msg.meetingId
        });
      } else if (msg.type === "meeting-closing") {
        meetingLifeUi = "CLOSING";
        meetingLifeLabel = "收尾中";
        if (msg.meetingId) meetingIdUi = msg.meetingId;
        setStatus(`会末收尾中，约 ${Math.ceil((msg.closeInMs || 0) / 1000)}s 后停止听会`, "warn");
        renderDuplexStats();
        slog("INFO", "Meeting", "会末收尾", msg);
      } else if (msg.type === "meeting-ended") {
        meetingLifeUi = "OFF";
        meetingLifeLabel = "未开会";
        agentHoldListening = false;
        listening = false;
        if (silenceTimer) clearTimeout(silenceTimer);
        unlisten?.();
        unlisten = null;
        void closeInput();
        setChip("chipListen", false);
        setChip("chipPatrol", false);
        setChip("chipReconnect", false);
        setChip("chipMeetingAudio", false);
        if ($("stop")) $("stop").disabled = true;
        if ($("patrol")) $("patrol").disabled = true;
        if ($("forceSpeak")) $("forceSpeak").disabled = true;
        if ($("loop")) $("loop").disabled = false;
        setAudioTestEnabled(true);
        setStatus(`会议已结束 ${msg.meetingId || meetingIdUi || ""} · 纪要已写入 sessions`, "ok");
        showAlert("会议已结束：听会已停，纪要与转写在「打开本场记录」。可重新「启动听会」。", "ok");
        renderDuplexStats();
        slog("INFO", "Meeting", "会议结束", msg);
      } else if (msg.type === "ark-billing") {
        showAlert(
          "Ark 账号欠费/过期：LLM 控场不可用，已用启发式模板。请充值或更换 Key。",
          "bad"
        );
        setChip("chipArk", true, "bad");
        slog("ERROR", "Strategy", "收到 ark-billing 事件", msg);
      } else if (msg.type === "biz-plan") {
        const steps = Array.isArray(msg.steps) ? msg.steps : [];
        const tier = msg.tier || "";
        const label =
          tier === "L3" ? "深度分析" : tier === "L2" ? "标准方案" : "经营顾问";
        renderTodos(steps.map((s, i) => `${i + 1}. ${s}`));
        setStatus(`${label}已生成（口播短抓手，步骤见待办）`, "ok");
        slog("INFO", "BusinessAdvisor", "经营方案", {
          tier,
          arkMode: msg.arkMode,
          tts: msg.tts,
          steps: steps.length,
          risks: msg.risks,
          hasAnalysis: Boolean(msg.analysis)
        });
        const parts = [`${label}步骤：`];
        if (msg.analysis) parts.push(`分析：${String(msg.analysis).slice(0, 200)}`, "");
        parts.push(...steps.map((s, i) => `${i + 1}. ${s}`));
        if (steps.length || msg.analysis) {
          showAlert(parts.join("\n"), "ok");
        }
      } else if (msg.type === "strategy-thinking") {
        setThinkingUi(true, "思考中");
        setStatus("大智思考中：" + (msg.text || "嗯，我想一下。"), "warn");
        slog("INFO", "Strategy", "思考占位", { text: msg.text });
      } else if (msg.type === "strategy-early") {
        setThinkingUi(true, "首句中");
        setStatus("大智首句：" + String(msg.text || "").slice(0, 60), "ok");
        if (msg.text) rememberHostUtterance(msg.text);
        slog("INFO", "Strategy", "首句提前", { text: msg.text });
      } else if (msg.type === "strategy-status") {
        if (msg.phase === "thinking") {
          const deep = msg.reason === "HA_BIZ_DEEP" || msg.tier === "L3";
          setThinkingUi(true, deep ? "深度分析中" : "思考中");
        } else if (msg.phase === "early") setThinkingUi(true, "首句中");
        else if (msg.phase === "idle") setThinkingUi(false);
        renderDuplexStats();
      } else if (msg.type === "asr-stalled") {
        const healthy =
          msg.healthy === true || asrFinalCount > 0 || asrAcceptedCount > 0 || (msg.finals || 0) > 0;
        const inHost =
          duplexPhase === PHASE.SPEAKING ||
          Date.now() < hostSpeakingUntil ||
          Date.now() < holdUntil;
        slog(healthy || inHost ? "DEBUG" : "WARN", "ASR", "识别开始后长时间无 final", {
          ...msg,
          healthy,
          inHost
        });
        // P0：已有转写 / 播报期 → 不弹「会场声太弱」误导告警
        if (healthy || inHost) return;
        const now = Date.now();
        if (now - lastAsrStallAlertAt > 45000) {
          lastAsrStallAlertAt = now;
          showAlert(
            "ASR 长时间无完整句且尚无成功转写：请确认腾讯会议 AI 扬声器=CABLE Input，并提高会议音量。",
            "warn"
          );
          setStatus("等待首句转写 — 检查 AI 扬声器路由", "warn");
        }
      }
    });

    const res = await window.bridge.listenStart();
    if (!res.ok) {
      const why = res.message || res.error || "启动失败";
      setStatus(why, "bad");
      showAlert(why, "bad");
      slog("ERROR", "Listen", "listenStart 失败", res);
      await closeInput();
      setAudioTestEnabled(true);
      return;
    }
    setChip("chipArk", res.ark);
    setChip("chipSpeech", res.speech);
    listening = true;
    startCaptureToListen();
    slog("INFO", "Listen", "已开始向 Duplex 推送 PCM");
    $("start").disabled = true;
    $("stop").disabled = false;
    $("patrol").disabled = false;
    $("forceSpeak").disabled = false;
    $("loop").disabled = true;
    schedulePatrol();
    if (!res.ark) slog("WARN", "Strategy", "未检测到 Ark Key，巡检将走启发式");
  } catch (e) {
    setStatus("启动失败", "bad");
    setAudioTestEnabled(true);
    slog("ERROR", "Listen", e.message || String(e), { stack: e.stack });
  }
};

$("stop").onclick = async () => {
  slog("INFO", "Listen", "用户停止");
  listening = false;
  if (silenceTimer) clearTimeout(silenceTimer);
  await window.bridge.listenStop();
  unlisten?.();
  unlisten = null;
  await closeInput();
  if (playCtx) await playCtx.close().catch(() => {});
  playCtx = null;
  if (monitorCtx) await monitorCtx.close().catch(() => {});
  monitorCtx = null;
  monitorNext = 0;
  partialAsr = "";
  renderTranscript();
  $("stop").disabled = true;
  $("patrol").disabled = true;
  $("forceSpeak").disabled = true;
  $("loop").disabled = false;
  setAudioTestEnabled(true);
  setChip("chipListen", false);
  setChip("chipPatrol", false);
  setChip("chipReconnect", false);
  setChip("chipMeetingAudio", false);
  setStatus("已停止", "ok");
  updateMeetingGate();
};

$("patrol").onclick = () => void runPatrol("manual");

$("btnSessions")?.addEventListener("click", async () => {
  try {
    const res = await window.bridge.sessionOpenDir();
    slog("INFO", "Session", "打开本场记录目录", res);
  } catch (e) {
    slog("ERROR", "Session", e.message || String(e));
  }
});

$("forceSpeak").onclick = async () => {
  const text = $("manualText").value.trim() || "请各位围绕当前教研议程发言。";
  if (!$("localMonitor").checked) {
    $("localMonitor").checked = true;
    slog("INFO", "Host", "试播时自动勾选本机同时听");
  }
  await ensureMonitorCtx();
  slog("INFO", "Host", "手动试播", { text });
  const res = await window.bridge.hostSpeak(text);
  if (!res?.ok) {
    slog("ERROR", "Host", res?.error || "试播失败");
    showAlert(res?.error || "试播失败", "bad");
    return;
  }
  if (res.queued) {
    showAlert("上一条 Host 还在播，本句已排队。", "warn");
  }
  const last = transcriptLines[transcriptLines.length - 1];
  if (!(last && last.speaker === "AI 主席" && last.text.replace(/（合成中…）$/, "") === text)) {
    transcriptLines.push({ speaker: "AI 主席", text: text + "（合成中…）" });
    renderTranscript();
  }
};

$("btnClearLog")?.addEventListener("click", () => {
  $("log").innerHTML = "";
  slog("INFO", "Log", "界面日志已清空（文件日志保留）");
});

$("btnCopyLog")?.addEventListener("click", async () => {
  const text = Array.from($("log").childNodes)
    .map((n) => n.textContent)
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    slog("INFO", "Log", "已复制界面日志到剪贴板", { chars: text.length });
  } catch (e) {
    slog("ERROR", "Log", "复制失败", { error: e.message || String(e) });
  }
});

$("btnOpenLogDir")?.addEventListener("click", async () => {
  const res = await window.bridge.logOpenDir();
  slog("INFO", "Log", "打开日志目录", res);
});

(async () => {
  try {
    if (!window.bridge) {
      console.error("[App] window.bridge 缺失：preload 未注入");
      if ($("kbStatus")) {
        $("kbStatus").textContent = "桥接未注入（preload 失败）。请完全退出后重启桌面端。";
        $("kbStatus").className = "status bad";
      }
      setStatus("桥接未就绪", "bad");
      return;
    }
    renderArch();
    unsubMainLog = window.bridge.onLog((entry) => {
      appendLogLine(entry.level || "INFO", entry.tag || "Main", entry.message, entry.detail);
    });
    const st = await window.bridge.envStatus();
    setChip("chipArk", st.ark);
    setChip("chipSpeech", st.speech);
    if (st.agendaDefault && $("agenda") && !$("agenda").dataset.userEdited) {
      $("agenda").value = st.agendaDefault;
    }
    const kb = st.knowledge || {};
    $("keyStatus").textContent = `Ark: ${st.ark ? "已配置" : "缺失"} · 语音: ${st.speech ? "已配置" : "缺失"} · 大智知识库: ${
      kb.kbOk ? `已加载(${kb.kbChars || 0}字/${kb.sections || 0}节)` : "缺失"
    }`;
    $("keyStatus").className = "status " + (st.ark && kb.kbOk ? "ok" : "bad");
    if ($("kbStatus")) {
      $("kbStatus").textContent = kb.kbOk
        ? `知识库就绪：FAQ ${kb.faqSections || 0} 条优先 · 详版 ${kb.sections || 0} 节 · 议程「${st.agendaDefault || ""}」`
        : "知识库未加载：请确认 desktop/knowledge/quan-yuan-meiyu.txt";
      $("kbStatus").className = "status " + (kb.kbOk ? "ok" : "bad");
    }
    if (st.logFile) {
      $("logPath").textContent = "日志文件: " + st.logFile;
    }
    slog("INFO", "App", "渲染进程启动", { env: st });
    await refreshDevices().catch((e) => slog("ERROR", "Device", e.message || String(e)));
    renderTranscript();
    renderDuplexStats();
    updateMeetingGate();
  } catch (e) {
    console.error("[App] 初始化失败", e);
    if ($("kbStatus")) {
      $("kbStatus").textContent = "初始化失败: " + (e.message || String(e));
      $("kbStatus").className = "status bad";
    }
    setStatus("初始化失败", "bad");
  }
})();

$("agenda")?.addEventListener("input", () => {
  if ($("agenda")) $("agenda").dataset.userEdited = "1";
});

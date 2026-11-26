/**
 * 大智会议管理台：侧栏会议/专家/议题/记录 + 会中控条
 * 数据经 bridge → 根 server /api/meeting-admin（product=dazhi）
 */
import { $ } from "../state.js";

const state = {
  tab: "meeting",
  experts: [],
  topics: [],
  sessions: [],
  selectedExpertId: null,
  audiences: ["园长"],
  sessionId: null,
  openingPrompt: "",
  status: "prep",
  aiSpeaking: false,
  currentTopicTitle: "",
  topicIds: [],
  agendaIndex: 0
};

function toast(msg, ok = true) {
  const el = $("adminToast");
  if (!el) return;
  el.textContent = msg;
  el.className = "admin-toast " + (ok ? "ok" : "bad");
}

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll("[data-admin-nav]").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-admin-nav") === tab);
  });
  document.querySelectorAll("[data-admin-pane]").forEach((p) => {
    p.classList.toggle("active", p.getAttribute("data-admin-pane") === tab);
  });
  if (tab === "experts") void loadExperts();
  if (tab === "topics") void loadTopics();
  if (tab === "records") void loadSessions();
  if (tab === "meeting") void loadExperts().then(() => loadTopics());
}

async function loadExperts() {
  const res = await window.bridge?.meetingAdminExperts?.();
  if (!res?.ok) {
    toast(res?.error || "专家列表失败：请先 npm run dev", false);
    return;
  }
  state.experts = res.data?.experts || [];
  if (!state.selectedExpertId && state.experts[0]) {
    state.selectedExpertId = state.experts[0].id;
  }
  renderExperts();
  renderExpertPick();
}

async function loadTopics() {
  const audience = state.audiences[0] || "";
  const res = await window.bridge?.meetingAdminTopics?.({ audience });
  if (!res?.ok) {
    toast(res?.error || "议题加载失败", false);
    return;
  }
  state.topics = res.data?.topics || [];
  renderTopics();
  renderMeetingTopics();
}

async function loadSessions() {
  const res = await window.bridge?.meetingAdminSessions?.();
  if (!res?.ok) {
    toast(res?.error || "记录加载失败", false);
    return;
  }
  state.sessions = res.data?.sessions || [];
  renderSessions();
}

function renderExpertPick() {
  const box = $("adminExpertList");
  if (!box) return;
  box.innerHTML = state.experts
    .filter((e) => e.enabled)
    .map(
      (e) => `<button type="button" class="admin-expert ${
        e.id === state.selectedExpertId ? "selected" : ""
      }" data-expert-id="${e.id}">
      <strong>${escapeHtml(e.name)}</strong>
      <span>${escapeHtml(e.intro || e.category || "")}</span>
    </button>`
    )
    .join("");
  box.querySelectorAll("[data-expert-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedExpertId = btn.getAttribute("data-expert-id");
      renderExpertPick();
    });
  });
}

function renderExperts() {
  const tb = $("adminExpertTable");
  if (!tb) return;
  tb.innerHTML = state.experts
    .map(
      (e) => `<tr>
      <td>${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.intro)}</td>
      <td>${escapeHtml(e.knowledgeBase)}</td>
      <td>${escapeHtml(e.voice)}</td>
      <td><label class="admin-switch"><input type="checkbox" data-en="${e.id}" ${
        e.enabled ? "checked" : ""
      }/></label></td>
    </tr>`
    )
    .join("");
  tb.querySelectorAll("[data-en]").forEach((inp) => {
    inp.addEventListener("change", async () => {
      const id = inp.getAttribute("data-en");
      await window.bridge.meetingAdminSetExpertEnabled({ id, enabled: inp.checked });
      await loadExperts();
    });
  });
}

function renderTopics() {
  const tb = $("adminTopicTable");
  if (!tb) return;
  tb.innerHTML = state.topics
    .map(
      (t) => `<tr>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.discussion || "—")}</td>
      <td>${escapeHtml((t.audiences || []).join("、"))}</td>
      <td><button type="button" class="ghost" data-del-topic="${t.id}">删除</button></td>
    </tr>`
    )
    .join("");
  tb.querySelectorAll("[data-del-topic]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await window.bridge.meetingAdminDeleteTopic({ id: btn.getAttribute("data-del-topic") });
      await loadTopics();
    });
  });
}

function renderMeetingTopics() {
  const el = $("adminMeetingTopics");
  if (!el) return;
  if (!state.topics.length) {
    el.textContent = "没有符合当前参会对象的议题";
    return;
  }
  el.innerHTML = state.topics
    .map(
      (t) => `<label class="admin-topic-row"><input type="checkbox" data-topic-id="${t.id}" checked /> ${escapeHtml(t.title)}</label>`
    )
    .join("");
}

function renderSessions() {
  const el = $("adminSessionList");
  if (!el) return;
  el.innerHTML = state.sessions
    .map(
      (s) => `<div class="admin-session-row">
      <strong>${escapeHtml(s.title)}</strong>
      <span>${escapeHtml(s.status)} · ${escapeHtml(s.id)}</span>
    </div>`
    )
    .join("") || "<p class='hint'>暂无会场记录</p>";
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syncControlBar() {
  const bar = $("meetingControlBar");
  const banner = $("meetingAgendaBanner");
  const status = $("meetingLiveStatus");
  const badge = $("adminLiveBadge");
  const cur = $("adminCurrentAgenda");
  const part = $("adminPartStatus");
  const ai = $("adminAiStatus");
  const showChrome = state.status === "waiting" || state.status === "live";
  if (bar) bar.classList.toggle("hidden", !showChrome);
  const agendaTitle =
    state.currentTopicTitle || $("agenda")?.value || $("adminMeetingName")?.value || "本次会议";
  if (banner) {
    banner.classList.toggle("hidden", !showChrome);
    banner.textContent = `本次议题 · ${agendaTitle}`;
  }
  if (cur) cur.textContent = `本次议题 · ${agendaTitle}`;
  if (badge) {
    badge.textContent =
      state.status === "live" ? "会议进行中" : state.status === "waiting" ? "会前等待" : "未开始";
    badge.style.borderColor = state.status === "live" ? "#93c5fd" : "#cbd5e1";
    badge.style.color = state.status === "live" ? "#1d4ed8" : "#64748b";
  }
  if (part) {
    part.textContent = state.status === "live" ? (state.aiSpeaking ? "聆听中" : "聆听中") : "轮候中";
  }
  if (ai) {
    ai.textContent =
      state.status === "live" ? (state.aiSpeaking ? "正在发言" : "轮候中") : "轮候中";
  }
  if (status) {
    status.textContent =
      state.status === "live"
        ? state.aiSpeaking
          ? "小智 · 正在发言"
          : "参会者 · 聆听中"
        : state.status === "waiting"
          ? "轮候中"
          : "未开始";
    status.className = "meeting-live-status " + (state.aiSpeaking ? "speaking" : "");
  }
}

async function enterMeeting() {
  const title = ($("adminMeetingName")?.value || "").trim() || "讨论会议";
  const meetingType = $("adminMeetingType")?.value || "讨论会议";
  const topicIds = [...document.querySelectorAll("[data-topic-id]:checked")].map((el) =>
    el.getAttribute("data-topic-id")
  );
  const res = await window.bridge.meetingAdminCreateSession({
    title,
    meetingType,
    audiences: state.audiences,
    expertId: state.selectedExpertId,
    topicIds
  });
  if (!res?.ok) {
    toast(res?.error || "创建会场失败", false);
    return;
  }
  const session = res.data?.session;
  const view = res.data?.view;
  state.sessionId = session?.id;
  state.openingPrompt = view?.session?.openingPrompt || session?.openingPrompt || "";
  state.currentTopicTitle = view?.currentTopic?.title || "";
  state.topicIds = session?.topicIds || topicIds;
  state.agendaIndex = session?.agendaIndex || 0;
  state.status = "waiting";
  const openEl = $("adminOpeningPrompt");
  if (openEl) openEl.textContent = state.openingPrompt;
  const idEl = $("adminSessionIdLine");
  if (idEl) idEl.textContent = `${session?.title || ""} · ${session?.id || ""}`;
  setTab("live");
  syncControlBar();
  const agenda = $("agenda");
  if (agenda && view?.currentTopic?.title) agenda.value = view.currentTopic.title;
  toast("已进入会前等待");
}

async function startLive() {
  if (!state.sessionId) return toast("请先进入会议", false);
  await window.bridge.meetingAdminPatchSession({ id: state.sessionId, status: "live" });
  state.status = "live";
  syncControlBar();
  const listen = await window.bridge.listenStart?.();
  if (listen && listen.ok === false) toast(listen.error || "听会启动失败", false);
  else toast("会议进行中");
}

async function remindOpening() {
  const text = state.openingPrompt || $("adminOpeningPrompt")?.textContent || "";
  if (!text) return toast("无开场提示", false);
  state.aiSpeaking = true;
  syncControlBar();
  const res = await window.bridge.hostSpeak?.(text);
  state.aiSpeaking = false;
  syncControlBar();
  toast(res?.ok ? "已口播会前提醒" : res?.error || "口播失败", Boolean(res?.ok));
}

async function wakeAi() {
  toast("已唤起小智（可继续听会问答）");
  state.aiSpeaking = false;
  syncControlBar();
}

async function interruptAi() {
  const roomId = ($("rtcRoomId")?.value || "").trim();
  if (roomId && window.bridge.rtcVoiceChatInterrupt) {
    await window.bridge.rtcVoiceChatInterrupt({ roomId });
  }
  state.aiSpeaking = false;
  syncControlBar();
  toast("已打断");
}

async function muteLocal() {
  const mon = $("localMonitor");
  if (mon) mon.checked = false;
  toast("已关本机同时听（静音侧）");
}

async function nextAgenda() {
  if (!state.sessionId) return toast("请先进入会议", false);
  const next = (state.agendaIndex || 0) + 1;
  const res = await window.bridge.meetingAdminPatchSession({
    id: state.sessionId,
    agendaIndex: next
  });
  if (!res?.ok) return toast(res?.error || "切换失败", false);
  state.agendaIndex = res.data?.session?.agendaIndex ?? next;
  state.currentTopicTitle = res.data?.view?.currentTopic?.title || state.currentTopicTitle;
  if ($("agenda") && state.currentTopicTitle) $("agenda").value = state.currentTopicTitle;
  syncControlBar();
  const line = `请进入下一项：${state.currentTopicTitle || "下一议程"}`;
  await window.bridge.hostSpeak?.(line);
  toast("已切下一议程");
}

async function endMeeting() {
  if (state.sessionId) {
    await window.bridge.meetingAdminPatchSession({ id: state.sessionId, status: "ended" });
  }
  await window.bridge.listenStop?.();
  state.status = "ended";
  state.aiSpeaking = false;
  syncControlBar();
  toast("会议已结束");
  setTab("records");
  await loadSessions();
}

export function bindAdminConsole() {
  const root = $("adminConsole");
  if (!root) return;

  $("btnOpenAdmin")?.addEventListener("click", () => {
    root.classList.remove("hidden");
    setTab("meeting");
  });
  $("btnCloseAdmin")?.addEventListener("click", () => root.classList.add("hidden"));

  document.querySelectorAll("[data-admin-nav]").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.getAttribute("data-admin-nav")));
  });

  $("adminAudience")?.addEventListener("change", async (e) => {
    const v = e.target.value;
    state.audiences = v ? [v] : [];
    await loadTopics();
  });

  $("adminEnterMeeting")?.addEventListener("click", () => void enterMeeting());
  $("adminStartLive")?.addEventListener("click", () => void startLive());
  $("adminNextAgenda")?.addEventListener("click", () => void nextAgenda());
  $("adminTraffic")?.addEventListener("click", async () => {
    const res = await window.bridge.meetingOpsCost?.();
    const c = res?.data?.cost || {};
    toast(
      res?.ok
        ? `流量/计数 · join=${c.rtcJoin ?? 0} bot=${c.botCreate ?? 0} events=${c.eventsAccepted ?? 0}`
        : res?.error || "费用计数不可用",
      Boolean(res?.ok)
    );
  });
  $("adminOpsHealth")?.addEventListener("click", async () => {
    const el = $("adminSystemLine");
    const res = await window.bridge.meetingOpsHealth?.();
    const d = res?.data || {};
    if (el) {
      el.textContent = res?.ok
        ? `ops ok · gray=${d.gray?.percent ?? "?"}% · rtc=${d.rtc?.ready ? "ready" : "no"} · botDry=${d.bot?.dryRun ? "1" : "0"}`
        : `不可用：${res?.error || "请先 npm run dev"}`;
    }
  });
  $("adminOpsAudit")?.addEventListener("click", async () => {
    const el = $("adminSystemLine");
    const res = await window.bridge.meetingOpsAudit?.({
      meeting_id: state.sessionId || undefined,
      limit: 6
    });
    const entries = res?.data?.entries || [];
    if (el) {
      el.textContent = res?.ok
        ? `审计 ${entries.length} · 脱敏=${res.data?.textRedacted !== false ? "是" : "否"} · ${entries
            .slice(-4)
            .map((e) => e.action)
            .join(" · ") || "(空)"}`
        : res?.error || "审计失败";
    }
  });
  $("ctrlRemind")?.addEventListener("click", () => void remindOpening());
  $("ctrlWake")?.addEventListener("click", () => void wakeAi());
  $("ctrlInterrupt")?.addEventListener("click", () => void interruptAi());
  $("ctrlMute")?.addEventListener("click", () => void muteLocal());
  $("ctrlEnd")?.addEventListener("click", () => void endMeeting());

  $("adminAddTopic")?.addEventListener("click", async () => {
    const title = ($("adminNewTopicTitle")?.value || "").trim();
    if (!title) return toast("请填写议题标题", false);
    await window.bridge.meetingAdminUpsertTopic({
      title,
      discussion: ($("adminNewTopicDisc")?.value || "").trim(),
      audiences: state.audiences,
      projectTag: ($("adminTopicProject")?.value || "默认").trim()
    });
    ($("adminNewTopicTitle").value = ""), ($("adminNewTopicDisc").value = "");
    await loadTopics();
    toast("议题已保存");
  });

  $("adminAddExpert")?.addEventListener("click", async () => {
    const name = ($("adminNewExpertName")?.value || "").trim();
    if (!name) return toast("请填写专家名称", false);
    await window.bridge.meetingAdminUpsertExpert({
      name,
      category: ($("adminNewExpertCat")?.value || "其他").trim(),
      intro: ($("adminNewExpertIntro")?.value || "").trim(),
      knowledgeBase: ($("adminNewExpertKb")?.value || "").trim(),
      voice: ($("adminNewExpertVoice")?.value || "默认").trim(),
      enabled: true
    });
    await loadExperts();
    toast("专家已保存");
  });

  syncControlBar();
}

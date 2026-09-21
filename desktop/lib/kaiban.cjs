/**
 * Desktop Kaiban A2A (Director → Host → Secretary → Researcher stub).
 * Uses Ark Chat Completions — meeting control, not free chat.
 */
async function arkChat(system, user) {
  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  const model =
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-2-1-turbo-260628";
  if (!apiKey) return null;

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ark HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

function parseJsonLoose(raw) {
  const clean = String(raw || "")
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();
  return JSON.parse(clean);
}

function offTopicHeuristic(transcript) {
  return /粽子|预算|采购|报销|场地|礼品|礼盒|福利/.test(transcript);
}

function newEvent(sender, target, action, payload = {}) {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    sender,
    target,
    action,
    payload
  };
}

/**
 * @param {string} recentTranscript
 * @param {string} currentAgenda
 */
async function runMeetingAnalysis(recentTranscript, currentAgenda) {
  const a2aTrace = [];
  const transcript = (recentTranscript || "").trim();
  const agenda = currentAgenda || "幼教数字化教研议程";

  let director = {
    shouldIntervene: false,
    reason: "OK",
    nextStageRecommendation: null
  };

  try {
    const directorRaw = await arkChat(
      "You are DirectorAgent in a KaibanJS A2A team. Output raw JSON only.",
      `Agenda: ${agenda}\nTranscript:\n${transcript}\n\nDecide if intervention is needed (off-topic: 粽子/采购/报销/礼品; silence monopoly; cold field). JSON: {"shouldIntervene":boolean,"reason":"OFF_TOPIC"|"SILENCE"|"OK","nextStageRecommendation":"IceBreaking"|"MainDiscussion"|"Conclusion"|null}`
    );
    if (!directorRaw) throw new Error("empty director");
    const parsed = parseJsonLoose(directorRaw);
    director = {
      shouldIntervene: Boolean(parsed.shouldIntervene),
      reason: String(parsed.reason || "OK"),
      nextStageRecommendation: parsed.nextStageRecommendation || null
    };
  } catch {
    const off = offTopicHeuristic(transcript);
    const lines = (transcript.match(/\n/g) || []).length;
    director = {
      shouldIntervene: off || lines === 0,
      reason: off ? "OFF_TOPIC" : lines === 0 ? "SILENCE" : "OK",
      nextStageRecommendation: null
    };
  }

  a2aTrace.push(
    newEvent(
      "DirectorAgent",
      "HostAgent",
      director.shouldIntervene ? "INTERVENTION_REQUIRED" : "STATUS_OK",
      { reason: director.reason, nextStageRecommendation: director.nextStageRecommendation }
    )
  );

  let interventionText = "";
  if (director.shouldIntervene) {
    try {
      const hostRaw = await arkChat(
        "You are HostAgent (大地教研总督导). Output ONE Chinese intervention under 40 chars. No quotes. Do NOT restate what people said; give a control command.",
        `Reason: ${director.reason}\nAgenda: ${agenda}\nTranscript:\n${transcript}\nIssue a sharp academic redirect or call on a speaker.`
      );
      interventionText = (hostRaw || "").trim().replace(/^["「]|["」]$/g, "").slice(0, 48);
    } catch {
      /* fallback */
    }
    if (!interventionText) {
      interventionText =
        director.reason === "OFF_TOPIC"
          ? "请停止非学术闲聊，立刻回到托班数字化议题！"
          : "请相关园长继续汇报注意力检测与硬件方案！";
    }
    a2aTrace.push(
      newEvent("HostAgent", "AudioBridge", "PLAY_INTERVENTION", {
        ttsText: interventionText,
        reason: director.reason
      })
    );
  }

  let latestToDos = [
    "1. 汇总试点托班注意力检测硬件选型指标",
    "2. 核验护眼显示设备与课堂网络部署清单",
    "3. 将非学术行政议题移出会中研讨范围"
  ];
  try {
    const secretRaw = await arkChat(
      "You are SecretaryAgent. Output raw JSON only.",
      `Transcript:\n${transcript}\nExtract 3 ECE academic TODOs. JSON: {"latestToDos":["1. ...","2. ...","3. ..."]}`
    );
    if (secretRaw) {
      const parsed = parseJsonLoose(secretRaw);
      if (Array.isArray(parsed.latestToDos) && parsed.latestToDos.length) {
        latestToDos = parsed.latestToDos.slice(0, 3);
      }
    }
  } catch {
    /* keep defaults */
  }
  a2aTrace.push(newEvent("SecretaryAgent", "LocalPanel", "UPDATE_TODOS", { latestToDos }));

  a2aTrace.push(
    newEvent("ResearcherAgent", "HostAgent", "RAG_SKIP", {
      note: "桌面 P1 暂无向量库；后续接本地 RAG"
    })
  );

  return {
    shouldIntervene: director.shouldIntervene,
    interventionText,
    reason: director.reason,
    latestToDos,
    nextStageRecommendation: director.nextStageRecommendation,
    a2aTrace,
    arkConfigured: Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim())
  };
}

function hasArkKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

module.exports = { runMeetingAnalysis, hasArkKey, arkChat };

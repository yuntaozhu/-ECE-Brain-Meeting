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

function log(line) {
  const t = new Date().toLocaleTimeString();
  $("log").textContent = `[${t}] ${line}\n` + $("log").textContent;
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

function looksPhysical(label) {
  if (isVirtualLabel(label)) return false;
  return PHYSICAL_WARN_RE.test(label || "") || /default\s*-/i.test(label || "");
}

function preferVirtual(select, list) {
  const virtual = list.filter((d) => isVirtualLabel(d.label));
  if (!virtual.length) return;
  const a = virtual.find((d) => /cable.?a|a\)/i.test(d.label));
  const b = virtual.find((d) => /cable.?b|b\)/i.test(d.label));
  if (select.id === "inputDevice" && a) select.value = a.deviceId;
  else if (select.id === "outputDevice" && b) select.value = b.deviceId;
  else select.value = virtual[0].deviceId;
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
    `内部路由：腾讯会议 AI 扬声器(虚拟输出) → <b>${inL || "未选"}</b> → EXE 采集 → Kaiban<br>` +
    `EXE 播放 → <b>${outL || "未选"}</b> → 腾讯会议 AI 麦克风(虚拟麦) → 全员听到 Host<br>` +
    (inOk && outOk
      ? '<span class="ok">已绑定虚拟设备，符合「无外接线」方案。</span>'
      : '<span class="bad">请改为虚拟设备。物理麦/显示器音频不能用于 AI 环路。</span>');

  updateMeetingGate();
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
  await ensureLabels();
  const devices = await navigator.mediaDevices.enumerateDevices();
  allInputs = devices.filter((d) => d.kind === "audioinput");
  allOutputs = devices.filter((d) => d.kind === "audiooutput");
  applyDeviceFilter();
  const vIn = allInputs.filter((d) => isVirtualLabel(d.label)).length;
  const vOut = allOutputs.filter((d) => isVirtualLabel(d.label)).length;
  log(`设备刷新：输入 ${allInputs.length}（虚拟 ${vIn}），输出 ${allOutputs.length}（虚拟 ${vOut}）。`);
  if (vIn === 0 || vOut === 0) {
    log("未检测到虚拟声卡。请安装 VB-Cable 或 SysVAD 类驱动后再刷新。");
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
    if (saved.input && [...$("inputDevice").options].some((o) => o.value === saved.input)) {
      $("inputDevice").value = saved.input;
    }
    if (saved.output && [...$("outputDevice").options].some((o) => o.value === saved.output)) {
      $("outputDevice").value = saved.output;
    }
  } catch (_) {}
  updateRouteHint();
}

function assertVirtualOrAllowed(kind, label) {
  if ($("allowPhysical").checked) return;
  if (!isVirtualLabel(label)) {
    throw new Error(
      `${kind}必须是虚拟设备（当前：${label}）。请安装 VB-Cable/SysVAD，或勾选「允许物理设备」仅作调试。`
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
  assertVirtualOrAllowed("采集（虚拟音频输出端）", label);

  inputStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    }
  });
  inCtx = new AudioContext();
  const src = inCtx.createMediaStreamSource(inputStream);
  analyser = inCtx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  meterTimer = setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    $("level").style.width = Math.min(100, Math.round(Math.sqrt(sum / data.length) * 400)) + "%";
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

async function playBeepToSink() {
  const sinkId = $("outputDevice").value;
  const outLabel = selectedLabel("outputDevice");
  assertVirtualOrAllowed("播放（虚拟麦克风端）", outLabel);

  const ctx = new OfflineAudioContext(1, 48000 * 0.5, 48000);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(0.5);
  const rendered = await ctx.startRendering();
  const wav = audioBufferToWav(rendered);
  const blob = new Blob([wav], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  if (sinkId && audio.setSinkId) {
    try {
      await audio.setSinkId(sinkId);
    } catch (e) {
      log("setSinkId 失败: " + (e.message || e) + " — 请把系统默认播放临时设为虚拟设备再试。");
    }
  }
  await audio.play();
  audio.onended = () => URL.revokeObjectURL(url);
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

async function ensurePlayCtx() {
  if (playCtx) return playCtx;
  playCtx = new AudioContext({ sampleRate: 24000 });
  const sink = $("outputDevice").value;
  const outLabel = selectedLabel("outputDevice");
  assertVirtualOrAllowed("播放（虚拟麦克风端）", outLabel);
  if (sink && typeof playCtx.setSinkId === "function") {
    try {
      await playCtx.setSinkId(sink);
    } catch (e) {
      log("AudioContext.setSinkId: " + (e.message || e));
    }
  }
  nextPlay = 0;
  return playCtx;
}

function playPcm16Base64(b64, sampleRate) {
  if (!playCtx) return;
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
}

function renderTranscript() {
  $("transcript").textContent =
    transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join("\n") || "（等待会场发言经虚拟输出进入…）";
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
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    void runPatrol("silence");
  }, 8000);
}

async function runPatrol(reason) {
  if (!listening) return;
  const now = Date.now();
  if (now - lastPatrolAt < 4000) return;
  lastPatrolAt = now;
  lastLineCountAtPatrol = transcriptLines.length;
  setStatus("Kaiban 巡检中…", "warn");
  setChip("chipPatrol", true);
  const textLog = transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const res = await window.bridge.kaibanEvaluate({
    transcript: textLog || "（会场暂无转写，检测冷场）",
    agenda: $("agenda").value
  });
  setChip("chipPatrol", false);
  if (!res.ok) {
    setStatus("巡检失败", "bad");
    log(res.error || "evaluate failed");
    return;
  }
  const r = res.result;
  renderA2a(r.a2aTrace);
  renderTodos(r.latestToDos);
  if (r.shouldIntervene) {
    setStatus("Host 经虚拟麦干预：" + r.interventionText, "ok");
    transcriptLines.push({ speaker: "AI 主席", text: r.interventionText });
    renderTranscript();
    log(`[${reason}] 干预 ${r.reason}: ${r.interventionText}`);
  } else {
    setStatus("巡检完成 · 无需干预", "ok");
    log(`[${reason}] STATUS_OK`);
  }
}

function startCaptureToListen() {
  const src = inCtx.createMediaStreamSource(inputStream);
  const proc = inCtx.createScriptProcessor(4096, 1, 1);
  const mute = inCtx.createGain();
  mute.gain.value = 0;
  proc.onaudioprocess = (ev) => {
    if (!listening) return;
    const f32 = ev.inputBuffer.getChannelData(0);
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

function downsampleTo16k(f32, rateIn) {
  if (rateIn === 16000) return floatTo16(f32);
  const ratio = rateIn / 16000;
  const outLen = Math.floor(f32.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = f32[Math.floor(i * ratio)];
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

$("refresh").onclick = () => refreshDevices().catch((e) => log(e.message || String(e)));
$("virtualOnly").onchange = () => applyDeviceFilter();
$("allowPhysical").onchange = () => updateRouteHint();
$("inputDevice").onchange = () => {
  updateRouteHint();
  try {
    localStorage.setItem(
      "ece_bridge_devices",
      JSON.stringify({ input: $("inputDevice").value, output: $("outputDevice").value })
    );
  } catch (_) {}
};
$("outputDevice").onchange = () => $("inputDevice").onchange();
["chkHost", "chkAiSpk", "chkAiMic"].forEach((id) => {
  $(id).onchange = () => updateMeetingGate();
});

$("beep").onclick = async () => {
  try {
    await playBeepToSink();
    setStatus("测试音已送入虚拟麦克风链路", "ok");
    log("若 AI 账号麦克风选对虚拟设备，腾讯会议里应听到哔声。");
  } catch (e) {
    setStatus("测试音失败", "bad");
    log(e.message || String(e));
  }
};

$("loop").onclick = async () => {
  if (listening) {
    log("请先停止控场再测环路。");
    return;
  }
  try {
    await openInput();
    loopCtx = new AudioContext();
    const sink = $("outputDevice").value;
    assertVirtualOrAllowed("播放", selectedLabel("outputDevice"));
    if (sink && loopCtx.setSinkId) {
      try {
        await loopCtx.setSinkId(sink);
      } catch (e) {
        log("环路 setSinkId: " + (e.message || e));
      }
    }
    loopCtx.createMediaStreamSource(inputStream).connect(loopCtx.destination);
    $("loop").disabled = true;
    $("loopStop").disabled = false;
    setStatus("环路测试中（测完请停，避免回授）", "warn");
  } catch (e) {
    setStatus("环路失败", "bad");
    log(e.message || String(e));
  }
};

$("loopStop").onclick = async () => {
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
    log("请先停止环路测试。");
    return;
  }
  updateMeetingGate();
  if ($("start").disabled) {
    log("请先完成双账号核对并绑定虚拟设备。");
    return;
  }
  try {
    setStatus("启动虚拟环路听会…", "warn");
    await openInput();
    await ensurePlayCtx();
    unlisten?.();
    unlisten = window.bridge.onEvent((msg) => {
      if (msg.type === "listen-ready") {
        if (msg.ok) {
          setStatus("虚拟环路听会中 · Kaiban 待命", "ok");
          setChip("chipListen", true);
          log("听会通道就绪 " + (msg.sessionId || ""));
        } else {
          setStatus("听会失败", "bad");
          log(msg.error || "listen failed");
        }
      } else if (msg.type === "asr") {
        if (msg.final) {
          const text = (msg.text || partialAsr || "").trim();
          partialAsr = "";
          if (text) {
            transcriptLines.push({ speaker: "会场", text });
            renderTranscript();
            schedulePatrol();
            if (transcriptLines.length - lastLineCountAtPatrol >= 3) {
              void runPatrol("lines");
            }
          }
        } else {
          partialAsr = msg.text || partialAsr;
        }
      } else if (msg.type === "tts-audio") {
        playPcm16Base64(msg.audio, 24000);
      } else if (msg.type === "host-speaking") {
        log("Host→虚拟麦: " + msg.text);
      } else if (msg.type === "error") {
        log("错误: " + msg.message);
      } else if (msg.type === "closed") {
        setChip("chipListen", false);
        log("听会通道关闭");
      }
    });

    const res = await window.bridge.listenStart();
    if (!res.ok) {
      setStatus("启动失败", "bad");
      await closeInput();
      return;
    }
    setChip("chipArk", res.ark);
    setChip("chipSpeech", res.speech);
    listening = true;
    startCaptureToListen();
    $("start").disabled = true;
    $("stop").disabled = false;
    $("patrol").disabled = false;
    $("forceSpeak").disabled = false;
    $("loop").disabled = true;
    schedulePatrol();
    if (!res.ark) log("警告：未检测到 Ark Key，巡检将走启发式。");
  } catch (e) {
    setStatus("启动失败", "bad");
    log(e.message || String(e));
  }
};

$("stop").onclick = async () => {
  listening = false;
  if (silenceTimer) clearTimeout(silenceTimer);
  await window.bridge.listenStop();
  unlisten?.();
  unlisten = null;
  await closeInput();
  if (playCtx) await playCtx.close().catch(() => {});
  playCtx = null;
  $("stop").disabled = true;
  $("patrol").disabled = true;
  $("forceSpeak").disabled = true;
  $("loop").disabled = false;
  setChip("chipListen", false);
  setChip("chipPatrol", false);
  setStatus("已停止", "ok");
  updateMeetingGate();
};

$("patrol").onclick = () => void runPatrol("manual");

$("forceSpeak").onclick = async () => {
  const text = $("manualText").value.trim() || "请各位围绕当前教研议程发言。";
  await window.bridge.hostSpeak(text);
  transcriptLines.push({ speaker: "AI 主席", text });
  renderTranscript();
};

(async () => {
  renderArch();
  const st = await window.bridge.envStatus();
  setChip("chipArk", st.ark);
  setChip("chipSpeech", st.speech);
  $("keyStatus").textContent = `Ark 控场: ${st.ark ? "已配置" : "缺失"} · 语音: ${st.speech ? "已配置" : "缺失"} · 模式: 无外接线虚拟环路`;
  $("keyStatus").className = "status " + (st.ark ? "ok" : "bad");
  await refreshDevices().catch((e) => log(e.message || String(e)));
  renderTranscript();
  updateMeetingGate();
})();

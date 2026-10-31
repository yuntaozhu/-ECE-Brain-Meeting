import { $, S, VIRTUAL_RE, PHYSICAL_WARN_RE } from "../state.js";
import { slog } from "../ui/log.js";
import { setChip, setStatus } from "../ui/status.js";

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
  if (select.id === "meDevice") {
    // Me：优先物理麦，便于与 Others 环路分离
    const physical = list.filter((d) => !isVirtualLabel(d.label) && !isBannedCableLabel(d.label));
    if (physical.length) {
      select.value = physical[0].deviceId;
      return;
    }
    if (virtual.length) select.value = virtual[0].deviceId;
    return;
  }
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
    listening: S.listening,
    loopActive: !$("loopStop").disabled
  };
}

function updateRouteHint() {
  const inL = selectedLabel("inputDevice");
  const outL = selectedLabel("outputDevice");
  const inOk = isVirtualLabel(inL);
  const outOk = isVirtualLabel(outL);
  setChip("chipVirtual", inOk && outOk, inOk && outOk ? "good" : "bad");

  const meOn = Boolean($("dualTrackMe")?.checked);
  const meL = selectedLabel("meDevice");
  const othersMode = $("othersSource")?.value || "cable";
  $("routeHint").innerHTML =
    `<b>双通道</b>：Others=会场环路（${othersMode === "display" ? "系统内录实验" : "CABLE Output"}）；` +
    `Me=本机麦（${meOn ? meL || "未选" : "关闭"}）。<br>` +
    `VB-Cable：<b>CABLE Input=播放端</b>，<b>CABLE Output=录音端</b>。<br>` +
    `听会 Others：AI 扬声器=<b>CABLE Input</b> → EXE 采集 <b>${inL || "未选"}</b> → ASR[Others]<br>` +
    `出声：EXE→<b>${outL || "未选"}</b>（CABLE Input）→ AI 麦=CABLE Output。<br>` +
    `Me 口令（谢谢大智/唤醒）走本机麦，不与会场混音；普通 Me 发言只上屏不定策略。<br>` +
    (inOk && outOk
      ? '<span class="ok">虚拟环路已绑定。正式开会建议 Cable-A 听会 + Cable-B 出声。</span>'
      : '<span class="bad">Others/出声请用虚拟设备；Me 可用物理麦。</span>');

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
    $("start").disabled = S.listening;
  } else {
    const miss = [];
    if (!$("chkHost").checked) miss.push("主持人真麦真箱");
    if (!$("chkAiSpk").checked) miss.push("AI 扬声器=虚拟输出");
    if (!$("chkAiMic").checked) miss.push("AI 麦克风=虚拟麦");
    if (!devicesOk) miss.push("EXE 两侧选虚拟设备");
    gate.textContent = "待完成：" + miss.join("；");
    gate.className = "status warn";
    if (!S.listening) $("start").disabled = true;
  }
}

async function ensureLabels() {
  const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
  tmp.getTracks().forEach((t) => t.stop());
}

async function refreshDevices() {
  slog("INFO", "Device", "开始刷新设备列表…");
  await ensureLabels();
  const devices = await navigator.mediaDevices.enumerateDevices();
  S.allInputs = devices.filter((d) => d.kind === "audioinput");
  S.allOutputs = devices.filter((d) => d.kind === "audiooutput");
  applyDeviceFilter();
  const vIn = S.allInputs.filter((d) => isVirtualLabel(d.label)).length;
  const vOut = S.allOutputs.filter((d) => isVirtualLabel(d.label)).length;
  slog("INFO", "Device", "刷新完成", {
    inputs: S.allInputs.length,
    outputs: S.allOutputs.length,
    virtualIn: vIn,
    virtualOut: vOut,
    inputLabels: S.allInputs.map((d) => d.label),
    outputLabels: S.allOutputs.map((d) => d.label),
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
        output: $("outputDevice").value,
        me: $("meDevice")?.value || "",
        dualTrackMe: Boolean($("dualTrackMe")?.checked),
        othersSource: $("othersSource")?.value || "cable"
      })
    );
  } catch (_) {}
}

function applyDeviceFilter() {
  const only = $("virtualOnly").checked;
  let inputs = S.allInputs;
  let outputs = S.allOutputs;
  if (only) {
    inputs = S.allInputs.filter((d) => isVirtualLabel(d.label));
    outputs = S.allOutputs.filter((d) => isVirtualLabel(d.label));
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
  // Me：列表含物理麦（不受 virtualOnly 限制），便于双通道
  if ($("meDevice")) {
    fill($("meDevice"), S.allInputs, "无本机麦");
  }
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
    const meOk =
      saved.me &&
      $("meDevice") &&
      [...$("meDevice").options].some((o) => o.value === saved.me);
    if (inOk) $("inputDevice").value = saved.input;
    if (outOk) $("outputDevice").value = saved.output;
    if (meOk) $("meDevice").value = saved.me;
    if (saved.dualTrackMe != null && $("dualTrackMe")) {
      $("dualTrackMe").checked = Boolean(saved.dualTrackMe);
    }
    if (saved.othersSource && $("othersSource")) {
      $("othersSource").value = saved.othersSource;
    }
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


export {
  isVirtualLabel,
  isBannedCableLabel,
  looksPhysical,
  preferVirtual,
  fill,
  selectedLabel,
  deviceSnapshot,
  updateRouteHint,
  updateMeetingGate,
  ensureLabels,
  refreshDevices,
  applyDeviceFilter,
  selectedLabelFromValue,
  assertVirtualOrAllowed
};

/* 小星驾驶舱：双轨采音 + 会议半双工；策略经主进程 meetingIngest / voiceTurn */
(() => {
  const api = window.xiaoxing;
  if (!api) {
    document.body.innerHTML = "<p style='padding:24px;color:#fff'>preload 未注入</p>";
    return;
  }

  const el = {
    status: document.getElementById("statusPill"),
    micSelect: document.getElementById("micSelect"),
    othersSelect: document.getElementById("othersSelect"),
    levelBar: document.getElementById("levelBar"),
    othersLevelBar: document.getElementById("othersLevelBar"),
    hint: document.getElementById("deviceHint"),
    btnMic: document.getElementById("btnMic"),
    q: document.getElementById("q"),
    btnAsk: document.getElementById("btnAsk"),
    ttsMeta: document.getElementById("ttsMeta"),
    meetingMeta: document.getElementById("meetingMeta"),
    log: document.getElementById("log"),
    turns: document.getElementById("statTurns"),
    gaps: document.getElementById("statGaps"),
    refuse: document.getElementById("statRefuse"),
    boardList: document.getElementById("boardList"),
    suggestList: document.getElementById("suggestList"),
    followupList: document.getElementById("followupList"),
    followupTitle: document.getElementById("followupTitle"),
    btnFollowup: document.getElementById("btnFollowup"),
    btnFollowupAdd: document.getElementById("btnFollowupAdd"),
    marketList: document.getElementById("marketList"),
    marketSpark: document.getElementById("marketSpark"),
    marketAlerts: document.getElementById("marketAlerts"),
    btnMarket: document.getElementById("btnMarket"),
    btnMarketSeed: document.getElementById("btnMarketSeed"),
    btnBoard: document.getElementById("btnBoard"),
    btnSessions: document.getElementById("btnSessions"),
    btnLogDir: document.getElementById("btnLogDir"),
    btnSysLogClear: document.getElementById("btnSysLogClear"),
    btnSysLogCopy: document.getElementById("btnSysLogCopy"),
    btnSysLogOpen: document.getElementById("btnSysLogOpen"),
    sysLog: document.getElementById("sysLog"),
    logPathHint: document.getElementById("logPathHint"),
    btnStart: document.getElementById("btnStart"),
    btnStop: document.getElementById("btnStop"),
    btnMeeting: document.getElementById("btnMeeting"),
    btnMeetingStop: document.getElementById("btnMeetingStop"),
    btnPush: document.getElementById("btnPush"),
    chkWake: document.getElementById("chkWake"),
    chkTop: document.getElementById("chkTop"),
    btnCapsule: document.getElementById("btnCapsule"),
    modeHint: document.getElementById("modeHint"),
    othersText: document.getElementById("othersText"),
    btnOthersIngest: document.getElementById("btnOthersIngest"),
    btnOthersMic: document.getElementById("btnOthersMic"),
    btnOthersShare: document.getElementById("btnOthersShare"),
    btnOthersStop: document.getElementById("btnOthersStop"),
    btnRefreshDevices: document.getElementById("btnRefreshDevices"),
    btnBriefing: document.getElementById("btnBriefing"),
    btnBriefingLive: document.getElementById("btnBriefingLive"),
    briefingCard: document.getElementById("briefingCard")
  };

  const stats = { turns: 0, gaps: 0, refuse: 0 };
  let speaking = false;
  let continuous = false;
  let meetingOn = false;
  let busy = false;
  let meStream = null;
  let othersStream = null;
  let audioCtx = null;
  let meAnalyser = null;
  let othersAnalyser = null;
  let othersProc = null;
  let othersSource = null;
  let othersGain = null;
  let meProc = null;
  let meSource = null;
  let meGain = null;
  let raf = 0;
  let recog = null;
  let finalText = "";
  let lastTurn = { query: "", reply: "" };
  let asrCloudOk = false;
  let meCloudOk = false;
  let preferMeCloud = false;
  let meForceAsk = false;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setStatus(text, cls) {
    el.status.textContent = text;
    el.status.className = "pill" + (cls ? " " + cls : "");
    api.broadcastStatus({ text, cls, phase: cls || "idle" });
  }

  function esc(s) {
    return String(s || "").replace(/</g, "&lt;");
  }

  function slog(level, tag, message, detail) {
    if (window.XiaoxingLog?.slog) window.XiaoxingLog.slog(level, tag, message, detail);
  }

  function pushBubble(who, text, meta, actions) {
    const div = document.createElement("div");
    div.className = "bubble";
    div.innerHTML =
      `<div class="who">${esc(who)}</div><div>${esc(text)}</div>` +
      (meta ? `<div class="m">${esc(meta)}</div>` : "");
    if (actions) div.appendChild(actions);
    el.log.insertBefore(div, el.log.firstChild);
  }

  function refreshStats() {
    el.turns.textContent = String(stats.turns);
    el.gaps.textContent = String(stats.gaps);
    el.refuse.textContent = String(stats.refuse);
  }

  function renderBriefingCard(card) {
    if (!el.briefingCard) return;
    el.briefingCard.innerHTML = "";
    if (!card || card.empty || card.ok === false) {
      el.briefingCard.textContent = "暂无会前卡 · 点「刷新会前卡」生成";
      return;
    }
    const head = document.createElement("div");
    head.className = "hint";
    head.textContent = `${card.day || ""} · ${card.itemCount || 0} 条标题（公开摘要，非规程）`;
    el.briefingCard.appendChild(head);
    const list = (card.items || []).slice(0, 8);
    if (!list.length) {
      const p = document.createElement("div");
      p.textContent = card.speak || "暂无条目";
      el.briefingCard.appendChild(p);
      return;
    }
    for (const it of list) {
      const row = document.createElement("div");
      row.className = "bubble";
      row.innerHTML = `<div class="who">${esc(it.sourceTitle || it.sourceId || "")}</div><div>${esc(
        it.headline || ""
      )}</div>`;
      el.briefingCard.appendChild(row);
    }
  }

  async function refreshBriefing(live) {
    if (!api.briefingLatest || !api.briefingRefresh) return;
    try {
      let card = null;
      if (live) {
        card = await api.briefingRefresh({ live: true });
      } else {
        card = await api.briefingLatest();
        if (!card || !card.ok || card.empty) {
          card = await api.briefingRefresh({ live: false });
        }
      }
      renderBriefingCard(card);
    } catch (err) {
      if (el.briefingCard) el.briefingCard.textContent = String(err.message || err);
    }
  }

  function updateMeetingMeta(m) {
    if (!m) {
      el.meetingMeta.textContent = "会议：未开始";
      return;
    }
    const focusBit = m.focus?.query
      ? ` · Focus「${String(m.focus.query).slice(0, 18)}」`
      : "";
    el.meetingMeta.textContent = `会议：${m.id} · ${m.phase}${m.armed ? " · 说完即问" : " · 旁听(需叫小星)"} · 行 ${m.lines || 0}${focusBit}`;
  }

  async function playTts(data) {
    if (data.tts?.ok && data.tts.audioBase64) {
      const bin = atob(data.tts.audioBase64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: data.tts.mime || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      speaking = true;
      await api.meetingSpeaking({ on: true });
      setStatus("播报中", "speaking");
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
      speaking = false;
      await api.meetingSpeaking({ on: false });
      URL.revokeObjectURL(url);
      return;
    }
    if ("speechSynthesis" in window && data.reply) {
      speaking = true;
      await api.meetingSpeaking({ on: true });
      setStatus("浏览器朗读", "speaking");
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(data.reply);
        u.lang = "zh-CN";
        u.onend = resolve;
        u.onerror = resolve;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      });
      speaking = false;
      await api.meetingSpeaking({ on: false });
    }
  }

  function afterConsultUi(data, query) {
    const askPart = data.ask || data;
    const reply = askPart.reply || data.reply || "";
    const display =
      askPart.replyDisplay ||
      data.replyDisplay ||
      reply;
    const moreQuestions = askPart.moreQuestions || data.moreQuestions || [];
    const layer = askPart.layer || data.layer || "";
    lastTurn = { query, reply };
    stats.turns += 1;
    if (layer === "gap") stats.gaps += 1;
    if (layer === "refuse") stats.refuse += 1;
    refreshStats();
    const meta = [layer, askPart.score ?? data.score, data.tts?.ok ? "tts" : ""]
      .filter(Boolean)
      .join(" · ");
    const actions = document.createElement("div");
    if (moreQuestions.length) {
      const wrap = document.createElement("div");
      wrap.className = "more-qs";
      const lab = document.createElement("div");
      lab.className = "more-qs-lab";
      lab.textContent = "还可以问";
      wrap.appendChild(lab);
      for (const mq of moreQuestions) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tiny ghost more-q";
        b.textContent = mq;
        b.onclick = () => {
          el.q.value = mq;
          runQuery(mq);
        };
        wrap.appendChild(b);
      }
      actions.appendChild(wrap);
    }
    const bad = document.createElement("button");
    bad.className = "tiny ghost";
    bad.textContent = "答得不好 · 进复盘";
    bad.onclick = async () => {
      await api.markBad({ query, reply, reason: "user_bad" });
      bad.textContent = "已进看板";
      bad.disabled = true;
      refreshBoard();
    };
    actions.appendChild(bad);
    // 气泡正文用口播句；推荐问在 actions 可点，避免和编号列表重复刷屏
    const body = reply || data.error || "(无答复)";
    pushBubble("小星", body, meta, actions);
    if (display && display !== reply && !moreQuestions.length) {
      // 兜底：无结构化列表时仍展示 replyDisplay
      pushBubble("小星·延伸", display.slice(reply.length).trim(), "more");
    }
  }

  function pushSuggestCard(query, suggest) {
    if (!el.suggestList || !suggest?.reply) return;
    const card = document.createElement("div");
    card.className = "suggest-card";
    card.innerHTML =
      `<div class="tag">建议 · ${esc(suggest.layer)} · ${esc(suggest.score)}</div>` +
      `<div class="q">会场：${esc(query)}</div>` +
      `<div>${esc(suggest.reply)}</div>`;
    if (suggest.moreQuestions?.length) {
      const mq = document.createElement("div");
      mq.className = "more-qs";
      mq.innerHTML =
        `<div class="more-qs-lab">还可以问</div>` +
        suggest.moreQuestions
          .slice(0, 4)
          .map((q) => `<div class="q">· ${esc(q)}</div>`)
          .join("");
      card.appendChild(mq);
    }
    const btn = document.createElement("button");
    btn.className = "tiny accent";
    btn.textContent = "口播这条";
    btn.onclick = async () => {
      if (speaking || busy) return;
      busy = true;
      try {
        const turn = await api.voiceTurn({
          query: query || "suggest",
          speak: true,
          preAnswer: {
            ok: true,
            layer: suggest.layer || "suggest",
            reply: suggest.reply,
            score: suggest.score
          },
          writeGap: false,
          session: false
        });
        pushBubble("小星·建议", suggest.reply, "copilot-no-barge");
        await playTts(turn);
      } catch (err) {
        pushBubble("系统", String(err.message || err));
      } finally {
        busy = false;
        setStatus(meetingOn ? "听会中" : "待命", meetingOn ? "meeting" : "");
      }
    };
    card.appendChild(btn);
    el.suggestList.insertBefore(card, el.suggestList.firstChild);
  }

  async function runMeetingIngest(track, text, opts = {}) {
    const raw = String(text || "").trim();
    if (!raw || busy) return;
    busy = true;
    try {
      if (track === "me") pushBubble("我", raw);
      else pushBubble("会场", raw, "others");

      const handled = await api.meetingIngest({
        track,
        text: raw,
        forceAsk: Boolean(opts.forceAsk),
        speak: opts.speak !== false
      });
      updateMeetingMeta(handled.meeting);
      if (handled.suggest) pushSuggestCard(handled.text || raw, handled.suggest);

      if (handled.action === "consult" && handled.turn) {
        afterConsultUi(handled.turn, handled.query || raw);
        await playTts(handled.turn);
      } else if (
        (handled.action === "sleep" ||
          handled.action === "focus_recall" ||
          handled.action === "focus_gap") &&
        handled.turn
      ) {
        pushBubble("小星", handled.reply || "", "meta");
        await playTts(handled.turn);
      } else if (handled.action === "listen_only") {
        setStatus(meetingOn ? "听会旁听" : "待命", meetingOn ? "meeting" : "");
      } else if (handled.action === "wake_deferred") {
        setStatus("已唤醒·播报中", "armed");
      }

      if (meetingOn && handled.meeting?.armed) setStatus("听会·已唤醒", "armed");
      else if (meetingOn) setStatus("听会中", "meeting");
    } catch (err) {
      pushBubble("系统", String(err.message || err));
    } finally {
      busy = false;
      if ((continuous || meetingOn) && !speaking) restartContinuousSoon();
    }
  }

  async function runQuery(raw) {
    const query = String(raw || "").trim();
    if (!query || speaking || busy) return;
    if (meetingOn) {
      await runMeetingIngest("me", query, { forceAsk: true });
      return;
    }
    busy = true;
    setStatus("思考中", "thinking");
    pushBubble("你", query);
    try {
      const data = await api.voiceTurn({ query, speak: true });
      afterConsultUi(data, query);
      await playTts(data);
      setStatus(continuous ? "连续听中" : "待命", continuous ? "listening" : "");
    } catch (err) {
      pushBubble("系统", String(err.message || err));
      setStatus(continuous ? "连续听中" : "待命", continuous ? "listening" : "");
    } finally {
      busy = false;
      if (continuous) restartContinuousSoon();
    }
  }

  function fillDeviceSelects(mics) {
    for (const sel of [el.micSelect, el.othersSelect]) {
      if (!sel) continue;
      const prev = sel.value;
      sel.innerHTML = "";
      if (!mics.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "（未检测到输入设备）";
        sel.appendChild(opt);
        continue;
      }
      mics.forEach((d, i) => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `麦克风 ${i + 1}`;
        sel.appendChild(opt);
      });
      if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
      else if (sel === el.othersSelect) {
        const cable = mics.find((d) => /cable|vb-audio|virtual/i.test(d.label || ""));
        if (cable) sel.value = cable.deviceId;
      }
    }
  }

  async function listMics() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      el.hint.textContent = "当前环境无法枚举音频设备。";
      fillDeviceSelects([]);
      return;
    }
    let granted = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      granted = true;
      for (const t of stream.getTracks()) t.stop();
    } catch (err) {
      el.hint.textContent =
        "无法访问麦克风：" +
        (err?.name || "") +
        " " +
        (err?.message || err) +
        "。请在系统设置允许麦克风，并点「刷新设备」。";
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      fillDeviceSelects(mics);
      if (granted && mics.length) {
        const unlabeled = mics.every((d) => !d.label);
        if (unlabeled) {
          el.hint.textContent = "已枚举到设备但无标签，请重新授权麦克风后点「刷新设备」。";
        }
      } else if (!mics.length) {
        el.hint.textContent = "未检测到音频输入。检查设备连接后点「刷新设备」。";
      }
    } catch (err) {
      fillDeviceSelects([]);
      el.hint.textContent = "枚举设备失败：" + (err?.message || err);
    }
  }

  function stopMeterLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function tickMeters() {
    stopMeterLoop();
    const dataMe = meAnalyser ? new Uint8Array(meAnalyser.frequencyBinCount) : null;
    const dataOt = othersAnalyser ? new Uint8Array(othersAnalyser.frequencyBinCount) : null;
    const tick = () => {
      if (meAnalyser && dataMe) {
        meAnalyser.getByteFrequencyData(dataMe);
        let sum = 0;
        for (const v of dataMe) sum += v;
        el.levelBar.style.width = `${Math.min(100, Math.round((sum / dataMe.length / 80) * 100))}%`;
      }
      if (othersAnalyser && dataOt) {
        othersAnalyser.getByteFrequencyData(dataOt);
        let sum = 0;
        for (const v of dataOt) sum += v;
        el.othersLevelBar.style.width = `${Math.min(100, Math.round((sum / dataOt.length / 80) * 100))}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  async function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    return audioCtx;
  }

  async function attachMeUplink(stream) {
    const ctx = await ensureAudioCtx();
    meSource = ctx.createMediaStreamSource(stream);
    meAnalyser = ctx.createAnalyser();
    meAnalyser.fftSize = 256;
    meSource.connect(meAnalyser);
    meProc = ctx.createScriptProcessor(4096, 1, 1);
    meProc.onaudioprocess = (ev) => {
      if (!meCloudOk || speaking) return;
      const input = ev.inputBuffer.getChannelData(0);
      const b64 = floatTo16kPcmBase64(input, ctx.sampleRate);
      api.mePcm({ pcmBase64: b64 }).catch(() => {});
    };
    meGain = ctx.createGain();
    meGain.gain.value = 0;
    meSource.connect(meProc);
    meProc.connect(meGain);
    meGain.connect(ctx.destination);
    tickMeters();
  }

  async function startMeCloudListen(opts = {}) {
    stopMeCapture(false);
    meForceAsk = Boolean(opts.forceAsk);
    const deviceId = el.micSelect.value || undefined;
    meStream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    await attachMeUplink(meStream);
    const r = await api.meAsrStart({ forceAsk: meForceAsk });
    meCloudOk = Boolean(r?.ok);
    if (!meCloudOk) {
      el.hint.textContent =
        "Me 云 ASR 未启动（" + (r?.reason || "fail") + "），将尝试浏览器识别降级。";
      return false;
    }
    await api.meetingTracks({ meConnected: true });
    return true;
  }

  async function startMeMeter(opts = {}) {
    if (preferMeCloud && !opts.forceBrowser) {
      return startMeCloudListen({ forceAsk: Boolean(opts.forceAsk) });
    }
    // 浏览器识别降级：只采电平，不启云会话
    meCloudOk = false;
    try {
      api.meAsrStop();
    } catch (_) {}
    if (meStream) {
      for (const t of meStream.getTracks()) t.stop();
      meStream = null;
    }
    const deviceId = el.micSelect.value || undefined;
    meStream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    const ctx = await ensureAudioCtx();
    const src = ctx.createMediaStreamSource(meStream);
    meAnalyser = ctx.createAnalyser();
    meAnalyser.fftSize = 256;
    src.connect(meAnalyser);
    tickMeters();
    await api.meetingTracks({ meConnected: true });
  }

  function stopMeCapture(updateTrack = true) {
    meCloudOk = false;
    try {
      api.meAsrStop();
    } catch (_) {}
    try {
      meProc?.disconnect();
      meSource?.disconnect();
      meGain?.disconnect();
    } catch (_) {}
    meProc = null;
    meSource = null;
    meGain = null;
    if (meStream) {
      for (const t of meStream.getTracks()) t.stop();
      meStream = null;
    }
    meAnalyser = null;
    el.levelBar.style.width = "0%";
    if (!othersAnalyser) stopMeterLoop();
    if (updateTrack) api.meetingTracks({ meConnected: false });
  }

  function floatTo16kPcmBase64(input, inputRate) {
    const ratio = inputRate / 16000;
    const outLen = Math.max(1, Math.floor(input.length / ratio));
    const pcm = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const idx = Math.min(input.length - 1, Math.floor(i * ratio));
      let s = input[idx];
      if (s > 1) s = 1;
      if (s < -1) s = -1;
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  async function attachOthersUplink(stream) {
    const ctx = await ensureAudioCtx();
    othersSource = ctx.createMediaStreamSource(stream);
    othersAnalyser = ctx.createAnalyser();
    othersAnalyser.fftSize = 256;
    othersSource.connect(othersAnalyser);

    const bufSize = 4096;
    othersProc = ctx.createScriptProcessor(bufSize, 1, 1);
    othersProc.onaudioprocess = (ev) => {
      if (!asrCloudOk) return;
      const input = ev.inputBuffer.getChannelData(0);
      const b64 = floatTo16kPcmBase64(input, ctx.sampleRate);
      api.othersPcm({ pcmBase64: b64 }).catch(() => {});
    };
    othersGain = ctx.createGain();
    othersGain.gain.value = 0;
    othersSource.connect(othersProc);
    othersProc.connect(othersGain);
    othersGain.connect(ctx.destination);
    tickMeters();
  }

  async function startOthersCloudAsr() {
    const r = await api.othersAsrStart();
    asrCloudOk = Boolean(r?.ok);
    if (!asrCloudOk) {
      el.hint.textContent =
        "云 ASR 未启动：" +
        (r?.reason === "missing_speech_key"
          ? "请配置 DOUBAO_SPEECH_API_KEY（与 TTS 同源即可）"
          : r?.reason || "连接失败") +
        "；仍可手动记入会场转写。";
      return false;
    }
    return true;
  }

  async function startOthersMic() {
    stopOthersCapture(false);
    const deviceId = el.othersSelect.value || undefined;
    othersStream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    await attachOthersUplink(othersStream);
    el.btnOthersStop.disabled = false;
    const ok = await startOthersCloudAsr();
    if (ok) {
      el.hint.textContent = "Others 麦 + 豆包云 ASR 已开（非本地 Whisper）。";
    }
    await api.meetingTracks({ othersConnected: true });
  }

  async function startOthersShare() {
    stopOthersCapture(false);
    try {
      othersStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
    } catch (err) {
      el.hint.textContent = "系统内录未授权：" + String(err.message || err);
      return;
    }
    const audioTracks = othersStream.getAudioTracks();
    if (!audioTracks.length) {
      el.hint.textContent = "未拿到系统音频轨，请勾选「分享音频」或改用 CABLE 麦。";
      stopOthersCapture();
      return;
    }
    for (const v of othersStream.getVideoTracks()) v.stop();
    await attachOthersUplink(othersStream);
    el.btnOthersStop.disabled = false;
    const ok = await startOthersCloudAsr();
    if (ok) {
      el.hint.textContent = "Others 系统内录 + 豆包云 ASR 已开。";
    }
    await api.meetingTracks({ othersConnected: true });
  }

  function stopOthersCapture(updateTrack = true) {
    asrCloudOk = false;
    try {
      api.othersAsrStop();
    } catch (_) {}
    try {
      othersProc?.disconnect();
      othersSource?.disconnect();
      othersGain?.disconnect();
    } catch (_) {}
    othersProc = null;
    othersSource = null;
    othersGain = null;
    if (othersStream) {
      for (const t of othersStream.getTracks()) t.stop();
      othersStream = null;
    }
    othersAnalyser = null;
    el.othersLevelBar.style.width = "0%";
    el.btnOthersStop.disabled = true;
    if (!meAnalyser) stopMeterLoop();
    if (updateTrack) api.meetingTracks({ othersConnected: false });
  }
  function stopRecognition() {
    try {
      recog && recog.stop();
    } catch (_) {}
  }

  function restartContinuousSoon() {
    // 云 ASR 为长连接，无需反复 start；仅浏览器识别需要续听
    if (preferMeCloud && meCloudOk) return;
    if ((!continuous && !meetingOn) || speaking || busy) return;
    setTimeout(() => {
      if ((continuous || meetingOn) && !speaking && !busy) startRecognition(true);
    }, 350);
  }

  async function startRecognition(isContinuous) {
    if (speaking || busy) return;
    finalText = "";
    if (!isContinuous) el.btnMic.classList.add("hot");
    setStatus(
      meetingOn ? (isContinuous ? "听会中" : "聆听 Me") : isContinuous ? "连续听中" : "聆听中",
      meetingOn ? "meeting" : "listening"
    );

    if (preferMeCloud) {
      const ok = await startMeCloudListen({
        forceAsk: !isContinuous || (!meetingOn && !el.chkWake.checked)
      });
      if (ok) return;
    }

    if (!recog) return;
    await startMeMeter({ forceBrowser: true }).catch(() => {});
    try {
      recog.start();
    } catch (_) {}
  }

  function setupRecognition() {
    // 浏览器识别仅作无云密钥时的降级
    if (SR) {
      recog = new SR();
      recog.lang = "zh-CN";
      recog.interimResults = true;
      recog.continuous = false;
      recog.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalText += t;
          else interim += t;
        }
        el.q.value = (finalText || interim).trim();
      };
      recog.onerror = () => {
        el.btnMic.classList.remove("hot");
        if (!preferMeCloud) stopMeCapture(false);
        if (continuous || meetingOn) restartContinuousSoon();
        else setStatus("待命");
      };
      recog.onend = async () => {
        el.btnMic.classList.remove("hot");
        if (preferMeCloud && meCloudOk) return;
        stopMeCapture(false);
        const raw = (finalText || el.q.value || "").trim();
        finalText = "";
        if (speaking || busy) {
          if (continuous || meetingOn) restartContinuousSoon();
          return;
        }
        if (!raw) {
          if (continuous || meetingOn) restartContinuousSoon();
          else setStatus("待命");
          return;
        }
        if (meetingOn) {
          await runMeetingIngest("me", raw, { forceAsk: false });
          return;
        }
        const needWake = el.chkWake.checked;
        const q =
          needWake && continuous ? (/小星|晓星|小行/.test(raw) ? raw : "") : raw;
        if (q) await runQuery(q);
        else if (continuous) restartContinuousSoon();
        else setStatus("待命");
      };
    } else if (!preferMeCloud) {
      el.hint.textContent = "无云 ASR 且无 SpeechRecognition，请用输入框。";
    }

    let pttHolding = false;
    const holdStart = async (e) => {
      if (e) e.preventDefault();
      if (speaking || busy || pttHolding) return;
      pttHolding = true;
      el.btnMic.classList.add("hot");
      setStatus("按住聆听 Me", meetingOn ? "meeting" : "listening");
      try {
        if (preferMeCloud) {
          await api.meAsrForceAsk(true);
          if (!meCloudOk) {
            const ok = await startMeCloudListen({ forceAsk: true });
            if (!ok) {
              // 云失败则浏览器降级
              await startMeMeter({ forceBrowser: true, forceAsk: true }).catch(() => {});
              if (recog) {
                try {
                  recog.start();
                } catch (_) {}
              }
            }
          }
        } else {
          await startMeMeter({ forceBrowser: true }).catch(() => {});
          if (recog) {
            try {
              recog.start();
            } catch (_) {}
          } else {
            el.hint.textContent = "无识别引擎：请用输入框「提问并播报」。";
          }
        }
      } catch (err) {
        el.hint.textContent = "按住说话失败：" + (err?.message || err);
        pttHolding = false;
        el.btnMic.classList.remove("hot");
      }
    };
    const holdStop = async () => {
      if (!pttHolding) return;
      pttHolding = false;
      el.btnMic.classList.remove("hot");
      stopRecognition();
      try {
        await api.meAsrForceAsk(false);
      } catch (_) {}
      // 听会/连续听保持 Me 云会话；非听会态松开后收尾
      if (preferMeCloud && !continuous && !meetingOn) {
        setTimeout(() => {
          if (!pttHolding && !continuous && !meetingOn) stopMeCapture();
        }, 1000);
      }
      if (!continuous && !meetingOn && !speaking) setStatus("待命");
      else if (meetingOn) setStatus("听会中", "meeting");
      else if (continuous) setStatus("连续听中", "listening");
    };
    el.btnMic.addEventListener("pointerdown", holdStart);
    el.btnMic.addEventListener("pointerup", holdStop);
    el.btnMic.addEventListener("pointerleave", holdStop);
    el.btnMic.addEventListener("pointercancel", holdStop);
  }

  async function refreshBoard() {
    const cols = await api.board();
    el.boardList.innerHTML = "";
    for (const st of ["pending", "reviewing", "ready", "done"]) {
      for (const item of cols[st] || []) {
        const card = document.createElement("div");
        card.className = "board-card";
        card.innerHTML = `<div class="tag">${st}</div><div>${esc(item.query || "")}</div>`;
        const sel = document.createElement("select");
        for (const s of ["pending", "reviewing", "ready", "done"]) {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = s;
          if (s === item.status) o.selected = true;
          sel.appendChild(o);
        }
        sel.onchange = async () => {
          await api.boardSet({ id: item.id, status: sel.value });
          refreshBoard();
        };
        card.appendChild(sel);
        el.boardList.appendChild(card);
      }
    }
    if (!el.boardList.children.length) el.boardList.textContent = "暂无缺口卡";
  }

  async function refreshMarket() {
    if (!el.marketList) return;
    const data =
      (api.marketDashboard && (await api.marketDashboard({ quoteLimit: 10 }))) ||
      (api.marketQuotes && (await api.marketQuotes({ limit: 10 }))) ||
      { quotes: [] };
    const quotes = data.quotes || [];

    if (el.marketSpark) {
      el.marketSpark.innerHTML = "";
      for (const sp of data.sparklines || []) {
        const row = document.createElement("div");
        row.className = "spark-row";
        const bars = (sp.series || [])
          .map((s, i) => {
            const h = sp.points && sp.points[i] != null ? Math.max(8, sp.points[i]) : 0;
            const title = s.avg != null ? `${s.date} ${s.avg}` : `${s.date} —`;
            return `<span class="spark-bar${s.avg == null ? " empty" : ""}" style="height:${h}%" title="${esc(title)}"></span>`;
          })
          .join("");
        row.innerHTML =
          `<div class="spark-lab">${esc(sp.product)} · 近${esc(sp.days)}日</div>` +
          `<div class="spark-bars">${bars}</div>`;
        el.marketSpark.appendChild(row);
      }
    }

    if (el.marketAlerts) {
      el.marketAlerts.innerHTML = "";
      const lines = [];
      for (const a of (data.alerts && data.alerts.cross_market) || []) {
        lines.push(`跨市 ${a.product} ${a.a} vs ${a.b} 差 ${a.spread}`);
      }
      for (const a of (data.alerts && data.alerts.farmgate) || []) {
        lines.push(`地头 ${a.product} ${a.farmgate} vs ${a.wholesale} 差 ${a.spread}`);
      }
      for (const f of data.followups || []) {
        lines.push(`[${f.kind}] ${f.title}`);
      }
      if (lines.length) {
        el.marketAlerts.innerHTML = lines
          .slice(0, 4)
          .map((t) => `<div class="alert-line">${esc(t)}</div>`)
          .join("");
      }
    }

    el.marketList.innerHTML = "";
    for (const q of quotes) {
      const card = document.createElement("div");
      card.className = "board-card";
      const avg = q.price_avg != null ? q.price_avg : "—";
      const badge = q.badge || (q.quote_kind === "farmgate" ? "地头" : "批发");
      card.innerHTML =
        `<div class="tag"><span class="badge-${badge === "地头" ? "farm" : "whole"}">${esc(badge)}</span> ` +
        `${esc(q.publish_date || "")} · ${esc(q.market_or_region || "")}</div>` +
        `<div><strong>${esc(q.product_name || "")}</strong> ${esc(q.specification || "")}</div>` +
        `<div class="q">${esc(q.kind_label || "均价")} ${esc(avg)} 元/斤` +
        (q.needs_review ? " · 待复核" : "") +
        `</div>`;
      el.marketList.appendChild(card);
    }
    if (!quotes.length) el.marketList.textContent = "暂无行情，可点「装载种子价」";
  }

  async function refreshFollowup() {
    if (!el.followupList || !api.followupBoard) return;
    const data = await api.followupBoard();
    const cols = data.columns || {};
    const labels = data.labels || {};
    el.followupList.innerHTML = "";
    const order = ["todo", "doing", "review", "done"];
    for (const st of order) {
      for (const item of cols[st] || []) {
        const card = document.createElement("div");
        card.className = "board-card";
        const kindText = item.kind_label || item.kind || "";
        const srcs = (item.meta && item.meta.suggested_source_ids) || [];
        const srcLine = srcs.length ? `<div class="muted">源：${esc(srcs.join(", "))}</div>` : "";
        card.innerHTML =
          `<div class="tag follow-tag-${st}">${esc(labels[st] || st)}` +
          (kindText ? ` · ${esc(kindText)}` : "") +
          `</div>` +
          `<div>${esc(item.title || "")}</div>` +
          srcLine;
        const sel = document.createElement("select");
        for (const s of order) {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = labels[s] || s;
          if (s === item.status) o.selected = true;
          sel.appendChild(o);
        }
        sel.onchange = async () => {
          await api.followupSet({ id: item.id, status: sel.value });
          refreshFollowup();
        };
        card.appendChild(sel);
        el.followupList.appendChild(card);
      }
    }
    if (!el.followupList.children.length) el.followupList.textContent = "暂无跟进任务";
  }

  el.btnAsk.addEventListener("click", () => runQuery(el.q.value));
  el.q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runQuery(el.q.value);
  });
  el.btnOthersIngest.addEventListener("click", async () => {
    const t = el.othersText.value.trim();
    if (!t) return;
    if (!meetingOn) await api.meetingStart({});
    meetingOn = true;
    el.btnMeeting.disabled = true;
    el.btnMeetingStop.disabled = false;
    await runMeetingIngest("others", t);
    el.othersText.value = "";
  });
  el.btnOthersMic.addEventListener("click", () => startOthersMic().catch((e) => {
    el.hint.textContent = String(e.message || e);
  }));
  el.btnOthersShare.addEventListener("click", () => startOthersShare());
  el.btnOthersStop.addEventListener("click", () => stopOthersCapture());

  el.btnMeeting.addEventListener("click", async () => {
    const r = await api.meetingStart({ meConnected: true });
    meetingOn = true;
    continuous = false;
    el.btnMeeting.disabled = true;
    el.btnMeetingStop.disabled = false;
    el.btnStart.disabled = true;
    el.btnStop.disabled = true;
    updateMeetingMeta(r.meeting);
    const brief = r.briefing;
    if (brief && brief.empty === false && brief.text) {
      el.modeHint.textContent = `听会中 · 前情：${String(brief.card?.headline || "").slice(0, 36) || "见卡片"}`;
      pushBubble(
        "小星·前情",
        brief.text,
        `跨会记忆 · ${brief.card?.previousMeetingId || ""} · 模式 ${brief.assistantMode || "content"}`
      );
    } else {
      el.modeHint.textContent = preferMeCloud
        ? "听会中（Me 云 ASR）：说完即问；「谢谢小星」转旁听，再叫「小星」恢复；Others 开云转写"
        : "听会中：说完即问；浏览器识别降级";
    }
    const ind = r.industryBriefing;
    if (ind && ind.ok && ind.speak) {
      pushBubble("小星·会前", ind.speak, `会前动态 ${ind.day || ""} · ${ind.itemCount || 0} 条`);
      renderBriefingCard(ind);
    }
    setStatus(r.meeting?.armed ? "听会·说完即问" : "听会中", r.meeting?.armed ? "armed" : "meeting");
    startRecognition(true);
  });
  el.btnMeetingStop.addEventListener("click", async () => {
    meetingOn = false;
    stopRecognition();
    stopMeCapture();
    stopOthersCapture();
    const r = await api.meetingStop();
    updateMeetingMeta(null);
    el.btnMeeting.disabled = false;
    el.btnMeetingStop.disabled = true;
    el.btnStart.disabled = false;
    setStatus("待命");
    el.modeHint.textContent = "已结束听会。可用「开始听会」或「仅连续听」。";
    if (r.meeting) {
      const s = r.summary;
      const meta = s?.ok
        ? `行 ${r.meeting.lines} · 摘要已写 · 缺口 ${s.gaps || 0}`
        : `行 ${r.meeting.lines}`;
      pushBubble("系统", `会议已结束 · ${r.meeting.id}`, meta);
    }
  });

  el.btnStart.addEventListener("click", () => {
    if (meetingOn) return;
    continuous = true;
    el.btnStart.disabled = true;
    el.btnStop.disabled = false;
    el.modeHint.textContent = preferMeCloud
      ? el.chkWake.checked
        ? "连续听（云 ASR）：请说「小星…」；播报中暂停识别"
        : "连续听（云 ASR）：说完一句即问"
      : el.chkWake.checked
        ? "连续听中：请说「小星…」；播报中不抢麦"
        : "连续听中：说完一句即问；播报中不抢麦";
    startRecognition(true);
  });
  el.btnStop.addEventListener("click", () => {
    continuous = false;
    el.btnStart.disabled = false;
    el.btnStop.disabled = true;
    stopRecognition();
    stopMeCapture();
    setStatus("待命");
    el.modeHint.textContent = "已停止连续听。仍可用按住说话 / Push-to-Ask / 开始听会。";
  });
  el.btnPush.addEventListener("click", async () => {
    if (speaking || busy) return;
    // 听会中也可 Push：临时 forceAsk，说完一句即咨询
    try {
      if (preferMeCloud) await api.meAsrForceAsk(true);
      await startRecognition(false);
      if (preferMeCloud && (continuous || meetingOn)) {
        setTimeout(() => api.meAsrForceAsk(false).catch(() => {}), 12000);
      }
    } catch (err) {
      el.hint.textContent = String(err.message || err);
    }
  });
  el.chkTop.addEventListener("change", () => api.setAlwaysOnTop(el.chkTop.checked));
  el.btnCapsule.addEventListener("click", () => api.capsuleToggle());
  el.btnSessions.addEventListener("click", () => api.openSessions());
  async function openLogDir() {
    if (!api.logOpenDir) return;
    // 主进程已打 INFO，此处不再 slog，避免双写
    await api.logOpenDir();
  }
  if (el.btnLogDir) el.btnLogDir.addEventListener("click", () => openLogDir().catch(() => {}));
  if (el.btnSysLogOpen) el.btnSysLogOpen.addEventListener("click", () => openLogDir().catch(() => {}));
  if (el.btnSysLogClear) {
    el.btnSysLogClear.addEventListener("click", () => {
      if (el.sysLog) el.sysLog.innerHTML = "";
      slog("INFO", "Log", "界面系统日志已清空（文件保留）");
    });
  }
  if (el.btnSysLogCopy) {
    el.btnSysLogCopy.addEventListener("click", async () => {
      const text = Array.from(el.sysLog?.childNodes || [])
        .map((n) => n.textContent || "")
        .join("\n");
      try {
        await navigator.clipboard.writeText(text);
        slog("INFO", "Log", "已复制系统日志", { chars: text.length });
      } catch (e) {
        slog("ERROR", "Log", "复制失败", { error: e.message || String(e) });
      }
    });
  }
  el.btnBoard.addEventListener("click", refreshBoard);
  if (el.btnBriefing) el.btnBriefing.addEventListener("click", () => refreshBriefing(false).catch(() => {}));
  if (el.btnBriefingLive)
    el.btnBriefingLive.addEventListener("click", () => refreshBriefing(true).catch(() => {}));
  if (el.btnMarket) el.btnMarket.addEventListener("click", () => refreshMarket().catch(() => {}));
  if (el.btnMarketSeed) {
    el.btnMarketSeed.addEventListener("click", async () => {
      if (!api.marketIngestSeed) return;
      await api.marketIngestSeed();
      await refreshMarket();
      el.hint.textContent = "已装载批发+地头种子价，可问「新发地草莓」或「一亩田产地价」。";
    });
  }
  if (el.btnFollowup) el.btnFollowup.addEventListener("click", refreshFollowup);
  if (el.btnFollowupAdd) {
    el.btnFollowupAdd.addEventListener("click", async () => {
      const title = String(el.followupTitle?.value || "").trim();
      if (!title) return;
      await api.followupCreate({ title, kind: "manual" });
      el.followupTitle.value = "";
      await refreshFollowup();
    });
  }

  api.onEvent(async (msg) => {
    if (msg.type === "system-log" && msg.entry) {
      const e = msg.entry;
      if (window.XiaoxingLog?.appendSysLogLine) {
        window.XiaoxingLog.appendSysLogLine(e.level, e.tag, e.message, e.detail);
      }
      return;
    }
    if (msg.type === "hotkey-push-ask") {
      if (speaking || busy) return;
      try {
        if (preferMeCloud) await api.meAsrForceAsk(true);
        await startRecognition(false);
        if (preferMeCloud && (continuous || meetingOn)) {
          setTimeout(() => api.meAsrForceAsk(false).catch(() => {}), 12000);
        }
      } catch (_) {}
    }
    if (msg.type === "meeting") {
      if (msg.meeting) updateMeetingMeta(msg.meeting);
      if (msg.event === "others-final" && msg.text) {
        pushBubble("会场", msg.text, "cloud-asr");
        if (msg.suggest) pushSuggestCard(msg.text, msg.suggest);
        if (msg.meeting) updateMeetingMeta(msg.meeting);
      }
      if (msg.event === "others-partial" && msg.text) {
        el.hint.textContent = "会场识别中：" + String(msg.text).slice(0, 48);
      }
      if (msg.event === "me-partial" && msg.text) {
        el.q.value = String(msg.text).slice(0, 120);
      }
      if (msg.event === "me-final" && msg.text) {
        pushBubble("我", msg.text, "cloud-asr");
        if (msg.action === "listen_only") {
          setStatus(meetingOn ? "听会旁听" : "连续听中", meetingOn ? "meeting" : "listening");
          if (msg.note) el.hint.textContent = msg.note;
        } else if (msg.action === "sleep") {
          setStatus("听会旁听", "meeting");
          el.hint.textContent = "已旁听：再说「小星…」或按住说话可提问";
        }
      }
      if (msg.event === "me-consult" && msg.turn) {
        afterConsultUi(msg.turn, msg.query || msg.text || "");
        await playTts(msg.turn);
        setStatus(
          meetingOn ? "听会·说完即问" : continuous ? "连续听中" : "待命",
          meetingOn ? "armed" : continuous ? "listening" : ""
        );
      }
      if (msg.event === "me-asr-error" || msg.event === "others-asr-error") {
        const err = msg.error || {};
        const code = err.code || "";
        if (code === "circuit_open" || code === "circuit_hold") {
          const sec = err.remainingMs
            ? Math.ceil(err.remainingMs / 1000)
            : err.backoffMs
              ? Math.ceil(err.backoffMs / 1000)
              : null;
          el.hint.textContent =
            "云 ASR 暂不可达（" +
            (err.class || "network") +
            "），已熔断" +
            (sec ? `约 ${sec}s` : "") +
            "：检查网络/DNS → openspeech.bytedance.com";
        } else if (code === "circuit_closed") {
          el.hint.textContent = "云 ASR 已恢复";
        } else {
          el.hint.textContent =
            "云 ASR：" + (err.message || err.code || "error");
        }
      }
    }
  });

  if (el.btnRefreshDevices) {
    el.btnRefreshDevices.addEventListener("click", () => {
      listMics().catch((e) => {
        el.hint.textContent = String(e.message || e);
      });
    });
  }
  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", () => {
      listMics().catch(() => {});
    });
  }

  (async () => {
    try {
      const st = await api.status();
      preferMeCloud = Boolean(st.asrConfigured);
      el.ttsMeta.textContent = st.ttsConfigured
        ? "TTS：豆包已配置"
        : "TTS：未配置密钥，将用浏览器朗读";
      if (st.asrConfigured) {
        el.hint.textContent =
          "Me/Others 默认豆包云 ASR（非本地 Whisper）+ 农服热词。选设备后开 Others；听会中也可按住说话。";
      } else {
        el.hint.textContent =
          "未检测到语音密钥：云转写不可用，Me 可降级浏览器识别；请配置 DOUBAO_SPEECH_API_KEY。";
      }
      if (el.logPathHint && (st.logMirror || st.logFile)) {
        el.logPathHint.textContent =
          "日志文件: " + (st.logMirror || st.logFile) + "（点「系统日志」打开目录）";
      }
      updateMeetingMeta(st.meeting);
      slog("INFO", "App", "渲染进程启动", {
        version: st.version,
        tts: st.ttsConfigured,
        asr: st.asrConfigured,
        logFile: st.logFile
      });
      if (api.logRecent) {
        const recent = await api.logRecent(40);
        for (const e of recent.entries || []) {
          window.XiaoxingLog?.appendSysLogLine?.(e.level, e.tag, e.message, e.detail);
        }
      }
    } catch (err) {
      el.ttsMeta.textContent = "TTS：状态读取失败";
      el.hint.textContent = "初始化失败：" + (err?.message || err);
      slog("ERROR", "App", "初始化失败", { error: err?.message || String(err) });
    }
    await listMics();
    setupRecognition();
    await refreshBoard().catch(() => {});
    await refreshFollowup().catch(() => {});
    await refreshMarket().catch(() => {});
    await refreshBriefing(false).catch(() => {});
    bindAdminConsole();
    setStatus("待命");
  })();

  function bindAdminConsole() {
    const root = document.getElementById("xxAdmin");
    if (!root) return;
    const st = {
      tab: "meeting",
      experts: [],
      topics: [],
      sessions: [],
      selectedExpertId: null,
      audiences: ["站长"],
      sessionId: null,
      opening: "",
      status: "prep"
    };
    const toast = (m, ok = true) => {
      const t = document.getElementById("xxAdminToast");
      if (t) {
        t.textContent = m;
        t.style.color = ok ? "#2e7d32" : "#c62828";
      }
    };
    const esc = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const setTab = (tab) => {
      st.tab = tab;
      document.querySelectorAll("[data-xx-nav]").forEach((b) =>
        b.classList.toggle("active", b.getAttribute("data-xx-nav") === tab)
      );
      document.querySelectorAll("[data-xx-pane]").forEach((p) =>
        p.classList.toggle("active", p.getAttribute("data-xx-pane") === tab)
      );
      if (tab === "experts" || tab === "meeting") void loadExperts();
      if (tab === "topics" || tab === "meeting") void loadTopics();
      if (tab === "records") void loadSessions();
    };
    const syncBar = () => {
      const show = st.status === "waiting" || st.status === "live";
      document.getElementById("xxControlBar")?.classList.toggle("hidden", !show);
      document.getElementById("xxAgendaBanner")?.classList.toggle("hidden", !show);
      const title =
        st.currentTopicTitle || document.getElementById("xxMeetingName")?.value || "本次会议";
      const banner = document.getElementById("xxAgendaBanner");
      if (banner) banner.textContent = `本次议题 · ${title}`;
      const cur = document.getElementById("xxCurrentAgenda");
      if (cur) cur.textContent = `本次议题 · ${title}`;
      const badge = document.getElementById("xxLiveBadge");
      if (badge) {
        badge.textContent =
          st.status === "live" ? "会议进行中" : st.status === "waiting" ? "会前等待" : "未开始";
      }
    };
    async function loadExperts() {
      const res = await api.adminExperts();
      if (!res?.ok) return toast(res?.error || "顾问列表失败（需 npm run dev）", false);
      st.experts = res.data?.experts || [];
      if (!st.selectedExpertId && st.experts[0]) st.selectedExpertId = st.experts[0].id;
      const box = document.getElementById("xxExpertList");
      if (box) {
        box.innerHTML = st.experts
          .filter((e) => e.enabled)
          .map(
            (e) =>
              `<button type="button" class="xx-expert ${e.id === st.selectedExpertId ? "selected" : ""}" data-id="${e.id}"><strong>${esc(e.name)}</strong><span>${esc(e.intro)}</span></button>`
          )
          .join("");
        box.querySelectorAll("[data-id]").forEach((b) =>
          b.addEventListener("click", () => {
            st.selectedExpertId = b.getAttribute("data-id");
            void loadExperts();
          })
        );
      }
      const table = document.getElementById("xxExpertTable");
      if (table) {
        table.innerHTML = st.experts
          .map(
            (e) =>
              `<div class="board-item"><strong>${esc(e.name)}</strong> · ${esc(e.category)} · ${esc(e.knowledgeBase)}
              <label><input type="checkbox" data-en="${e.id}" ${e.enabled ? "checked" : ""}/> 启用</label></div>`
          )
          .join("");
        table.querySelectorAll("[data-en]").forEach((inp) =>
          inp.addEventListener("change", async () => {
            await api.adminSetExpertEnabled({ id: inp.getAttribute("data-en"), enabled: inp.checked });
            await loadExperts();
          })
        );
      }
    }
    async function loadTopics() {
      const res = await api.adminTopics({ audience: st.audiences[0] || "" });
      if (!res?.ok) return toast(res?.error || "议题失败", false);
      st.topics = res.data?.topics || [];
      const meet = document.getElementById("xxMeetingTopics");
      if (meet) {
        meet.innerHTML = st.topics.length
          ? st.topics
              .map(
                (t) =>
                  `<label class="chk"><input type="checkbox" data-tid="${t.id}" checked /> ${esc(t.title)}</label>`
              )
              .join("")
          : "没有符合当前参会对象的议题";
      }
      const table = document.getElementById("xxTopicTable");
      if (table) {
        table.innerHTML = st.topics
          .map(
            (t) =>
              `<div class="board-item"><strong>${esc(t.title)}</strong><div class="hint">${esc(t.discussion || "—")}</div>
              <button type="button" class="ghost" data-del="${t.id}">删除</button></div>`
          )
          .join("");
        table.querySelectorAll("[data-del]").forEach((b) =>
          b.addEventListener("click", async () => {
            await api.adminDeleteTopic({ id: b.getAttribute("data-del") });
            await loadTopics();
          })
        );
      }
    }
    async function loadSessions() {
      const res = await api.adminSessions();
      if (!res?.ok) return toast(res?.error || "记录失败", false);
      st.sessions = res.data?.sessions || [];
      const elList = document.getElementById("xxSessionList");
      if (elList) {
        elList.innerHTML =
          st.sessions
            .map((s) => `<div class="board-item"><strong>${esc(s.title)}</strong> · ${esc(s.status)} · ${esc(s.id)}</div>`)
            .join("") || "<p class='hint'>暂无记录</p>";
      }
    }

    document.getElementById("btnAdmin")?.addEventListener("click", () => {
      root.classList.remove("hidden");
      setTab("meeting");
    });
    document.getElementById("xxCloseAdmin")?.addEventListener("click", () => root.classList.add("hidden"));
    document.querySelectorAll("[data-xx-nav]").forEach((b) =>
      b.addEventListener("click", () => setTab(b.getAttribute("data-xx-nav")))
    );
    document.getElementById("xxAudience")?.addEventListener("change", (e) => {
      st.audiences = e.target.value ? [e.target.value] : [];
      void loadTopics();
    });
    document.getElementById("xxEnter")?.addEventListener("click", async () => {
      const topicIds = [...document.querySelectorAll("[data-tid]:checked")].map((x) =>
        x.getAttribute("data-tid")
      );
      const res = await api.adminCreateSession({
        title: document.getElementById("xxMeetingName")?.value || "农服周会",
        meetingType: document.getElementById("xxMeetingType")?.value || "讨论会议",
        audiences: st.audiences,
        expertId: st.selectedExpertId,
        topicIds
      });
      if (!res?.ok) return toast(res?.error || "创建失败", false);
      st.sessionId = res.data?.session?.id;
      st.opening = res.data?.view?.session?.openingPrompt || res.data?.session?.openingPrompt || "";
      st.currentTopicTitle = res.data?.view?.currentTopic?.title || "";
      st.agendaIndex = res.data?.session?.agendaIndex || 0;
      st.status = "waiting";
      const open = document.getElementById("xxOpening");
      if (open) open.textContent = st.opening;
      const sid = document.getElementById("xxSessionId");
      if (sid) sid.textContent = `${res.data?.session?.title || ""} · ${st.sessionId || ""}`;
      setTab("live");
      syncBar();
      toast("已进入会前等待");
    });
    document.getElementById("xxStartLive")?.addEventListener("click", async () => {
      if (!st.sessionId) return toast("请先进入会议", false);
      await api.adminPatchSession({ id: st.sessionId, status: "live" });
      st.status = "live";
      syncBar();
      await api.meetingStart({});
      toast("会议进行中");
    });
    document.getElementById("xxNextAgenda")?.addEventListener("click", async () => {
      if (!st.sessionId) return toast("请先进入会议", false);
      const next = (st.agendaIndex || 0) + 1;
      const res = await api.adminPatchSession({ id: st.sessionId, agendaIndex: next });
      if (!res?.ok) return toast(res?.error || "切换失败", false);
      st.agendaIndex = res.data?.session?.agendaIndex ?? next;
      st.currentTopicTitle = res.data?.view?.currentTopic?.title || st.currentTopicTitle;
      syncBar();
      await api.meetingIngest({ text: "下一议程", track: "me" });
      toast("已切下一议程");
    });
    document.getElementById("xxRemind")?.addEventListener("click", async () => {
      if (!st.opening) return toast("无开场提示", false);
      await api.voiceTurn({
        query: "会前提醒",
        speak: true,
        preAnswer: { reply: st.opening },
        writeGap: false,
        session: false
      });
      toast("已口播会前提醒");
    });
    document.getElementById("xxWake")?.addEventListener("click", () => {
      const chk = document.getElementById("chkWake");
      if (chk) chk.checked = true;
      toast("已唤起小星（需唤醒已开）");
    });
    document.getElementById("xxInterrupt")?.addEventListener("click", async () => {
      await api.meetingSpeaking({ on: false });
      await api.meetingIngest({ text: "小星停一下", track: "me" });
      toast("已打断");
    });
    document.getElementById("xxMute")?.addEventListener("click", () => {
      const chk = document.getElementById("chkWake");
      if (chk) chk.checked = false;
      toast("静音旁听（关闭需唤醒抢答）");
    });
    document.getElementById("xxEnd")?.addEventListener("click", async () => {
      if (st.sessionId) await api.adminPatchSession({ id: st.sessionId, status: "ended" });
      await api.meetingStop();
      st.status = "ended";
      syncBar();
      toast("会议已结束");
      setTab("records");
      await loadSessions();
    });
    document.getElementById("xxAddExpert")?.addEventListener("click", async () => {
      const name = document.getElementById("xxNewExpertName")?.value?.trim();
      if (!name) return toast("请填名称", false);
      await api.adminUpsertExpert({
        name,
        category: document.getElementById("xxNewExpertCat")?.value || "其他",
        intro: document.getElementById("xxNewExpertIntro")?.value || "",
        knowledgeBase: document.getElementById("xxNewExpertKb")?.value || "",
        voice: "默认 TTS",
        enabled: true
      });
      await loadExperts();
      toast("顾问已保存");
    });
    document.getElementById("xxAddTopic")?.addEventListener("click", async () => {
      const title = document.getElementById("xxNewTopicTitle")?.value?.trim();
      if (!title) return toast("请填标题", false);
      await api.adminUpsertTopic({
        title,
        discussion: document.getElementById("xxNewTopicDisc")?.value || "",
        audiences: st.audiences,
        projectTag: "农服周会"
      });
      await loadTopics();
      toast("议题已保存");
    });
  }
})();

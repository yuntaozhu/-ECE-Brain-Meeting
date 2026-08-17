import { useEffect, useRef, useState, useCallback } from "react";
import { useMeetingStore } from "../store";
import { useGeminiLive } from "./useGeminiLive";
import { speakText } from "../lib/audioSpeech";
import { runMeetingAnalysis } from "../lib/kaibanMeetingEngine";
import { apiUrl } from "../lib/apiBase";

export interface AgendaItem {
  id: string; // 'IceBreaking' | 'MainDiscussion' | 'Conclusion'
  title: string;
  durationSeconds: number;
  description: string;
}

export function useAgendaDriver() {
  const {
    transcript,
    agendaStage,
    setAgendaStage,
    addTranscriptLine,
    joined,
    currentTopic,
    userName,
    userRole,
    agendas
  } = useMeetingStore();

  const { sendControlText, isConnected } = useGeminiLive();

  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [isMeetingActive, setIsMeetingActive] = useState<boolean>(false);
  const [silenceCounter, setSilenceCounter] = useState<number>(0);
  const [hasPromptedStart, setHasPromptedStart] = useState<boolean>(false);

  const prevTranscriptLengthRef = useRef<number>(transcript.length);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredProactiveRef = useRef<boolean>(false);

  // 1. Task 2 Section 2: Silence & Push Advance Pacemaker Trigger
  const triggerSilenceAdvanceSpeech = useCallback((reason: "silence" | "timeout") => {
    if (!joined) return;

    let triggerPrompt = "";

    if (reason === "silence") {
      addTranscriptLine("系统提示 (冷场干预)", "🎙️ 空白停顿满 8 秒！心脏起搏器已向服务端执行静默刺激，强制 AI 主持人进行话题推进...");
      triggerPrompt = `[System Event: 目前出现解疑冷场，请总结上述结论，并使用严谨学术语气点名李园长，询问他对硬件部署网关有什么顾虑。并且在此阶段，若觉得本项讨论足够充分，请以特定的断代语句词缀结束发言以激活下一个看板环节（必须包含特定短语：🗣️ [ACTION: AGENDA_NEXT]）。]`;
    } else {
      addTranscriptLine("系统提示 (议程轮流)", "📊 本议题预设时间已耗尽！心脏起搏器刺激 AI 主导强行过渡会议阶段并总结...");
      triggerPrompt = `[System Event: 时间已耗尽，请主动作一次简短深度学术总结，随后在发言末尾明确说出指令代码 [ACTION: AGENDA_NEXT]，以此引导全体进入最后的收官环节。]`;
    }

    // Phase-1: server-side Kaiban AI intervene (works on Vercel via Redis/memory store)
    const roomId = useMeetingStore.getState().meetingId || "10086";
    fetch(apiUrl("/api/ai/intervene"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, reason, hint: triggerPrompt })
    }).catch((err) => console.warn("[AgendaDriver] AI intervene notice:", err));

    if (isConnected) {
      console.log(`[Pacemaker] Sending ${reason} triggers to Gemini WS.`);
      sendControlText(triggerPrompt);
    } else {
      console.warn(`[Pacemaker] WS Disconnected. HTTP AI fallback triggered.`);
      fetch(apiUrl("/api/doubao/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: triggerPrompt,
          systemInstruction: "你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席。请对当前会议阶段作精炼主持评价，并提示下一步。"
        })
      }).then(res => res.json()).then(data => {
        const replyText = data.reply || "请各位园长注意把握时间，针对托班注意力追踪算法与硬件采购阻断阀值尽快形成共识！";
        addTranscriptLine("AI 会议主席 (豆包)", replyText);
        speakText(replyText, { rate: 1.1, pitch: 0.95 });
      }).catch(() => {
        const fallbackMsg = "请各位园长注意把握时间，针对托班注意力追踪算法与硬件采购阻断阀值尽快形成共识！";
        addTranscriptLine("AI 会议主席 (豆包)", fallbackMsg);
        speakText(fallbackMsg, { rate: 1.1, pitch: 0.95 });
      });
    }

    setSilenceCounter(0);
  }, [joined, isConnected, sendControlText, addTranscriptLine]);

  // 2. Fast forward standard countdown
  const forceAdvanceStage = useCallback(() => {
    const currentIndex = agendas.findIndex((a) => a.id === agendaStage);
    if (currentIndex !== -1 && currentIndex < agendas.length - 1) {
      const nextStage = agendas[currentIndex + 1].id;
      setAgendaStage(nextStage as any);
      triggerSilenceAdvanceSpeech("timeout");
    } else {
      addTranscriptLine("系统提示", "🔴 已经是最后一个议题，无法再向下流转。议案已全部收结。");
    }
  }, [agendaStage, agendas, setAgendaStage, triggerSilenceAdvanceSpeech, addTranscriptLine]);

  // 3. Task 2 Section 1: Opening Pacemaker Trigger
  const triggerOpeningSpeech = useCallback((participants?: { name: string; role: string }[]) => {
    if (!joined) return;

    // Detect and analyze candidate participants to decide who should first tackle the agenda
    const allCandidates = [
      { name: userName, role: userRole },
      ...(participants || [])
    ];

    console.log("[Pacemaker Analysis] Scanning available attendees lists for target first speaker...", allCandidates);

    // Filter to find the best candidate. We prefer "张园长" as requested, or anyone with "园长" in their title, or default to the first candidate.
    let selectedSpeaker = allCandidates.find(
      (c) => c.name.includes("张园长") || c.name.includes("张校董")
    );

    if (!selectedSpeaker) {
      selectedSpeaker = allCandidates.find((c) => c.name.includes("园长") || c.role.includes("园长"));
    }

    if (!selectedSpeaker && allCandidates.length > 0) {
      selectedSpeaker = allCandidates[0];
    }

    const speakerName = selectedSpeaker ? selectedSpeaker.name : "张园长";
    const speakerRole = selectedSpeaker ? selectedSpeaker.role : "学前数字融合组长";

    // Grab first agenda title to make it dynamic from Task 1
    const firstAgendaTitle = agendas[0]?.title || "研讨会开场与背景宣读";

    const openingPrompt = `[System Event: 会议正式开始！请立刻主动开口欢迎各位领导出席（大地教研高管和数字专家），宣读今天定制的 ${agendas.length} 个核心议程大纲（依次为：${agendas.map((a, i) => `${i+1}.${a.title}`).join('、')}）。随后，针对第一个议题【${firstAgendaTitle}】，向【${speakerName}】（其职务是：${speakerRole}）抛出关于“如何在该学术议题背景下，做好教研标准推进、保障幼儿健康的硬件眨眼捕捉指标”的深度探讨问题，并明确点起他的名字，引导他开始首轮发言。并在你发言认为该收尾时，可用指令标记 [ACTION: AGENDA_NEXT] 协助系统切换看板显示。]`;

    addTranscriptLine(
      "系统提示 (开场启动)", 
      `🚀 心脏起搏器极速干预！已智能研判参会人列表，锁定了首发言人：【${speakerName}】(${speakerRole})。下达精准耳返指令强推 AI 主体开始学术控场...`
    );

    const roomId = useMeetingStore.getState().meetingId || "10086";
    useMeetingStore.getState().setMeetingStarted(true);
    fetch(apiUrl(`/api/meeting/state/${encodeURIComponent(roomId)}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingStarted: true,
        isMeetingActive: true,
        currentTopic: useMeetingStore.getState().currentTopic,
        agendaStage: useMeetingStore.getState().agendaStage,
        agendas: useMeetingStore.getState().agendas
      })
    }).catch(() => {});

    fetch(apiUrl("/api/ai/intervene"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        reason: "manual",
        hint: openingPrompt,
        sender: speakerName
      })
    }).catch((err) => console.warn("[Pacemaker] AI opening intervene notice:", err));
    
    if (isConnected) {
      console.log(`[Pacemaker] Sending dynamic targeted Opening Trigger for ${speakerName} silently to Gemini WS.`);
      sendControlText(openingPrompt);
    }

    setIsMeetingActive(true);
    setHasPromptedStart(true);
    setSilenceCounter(0);
  }, [joined, isConnected, sendControlText, addTranscriptLine, userName, userRole, agendas]);

  // 4. Proactive Transition Analysis for 'MainDiscussion' phase
  const triggerProactiveAnalysis = useCallback(async () => {
    if (hasTriggeredProactiveRef.current) return;
    hasTriggeredProactiveRef.current = true;

    console.log("[Pacemaker Proactive] MainDiscussion stage timer running low (<15s)!");
    addTranscriptLine(
      "系统提示 (主动研判)", 
      "📊 本议题讨论时间仅剩 15 秒！大地 AI 大脑与 KaibanJS 团队正在实时提炼该阶段的注意力算法与硬件讨论共识，为 AI 主席定制智能收尾汇报词..."
    );

    try {
      const textLog = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
      const currentAgendaContext = `当前议程阶段: ${agendaStage}. 核心主题: ${currentTopic}. 【系统提示：主讨论阶段即将结束，请提炼本次讨论的注意力捕捉算法(如眨眼率计算、传感)及设备网关部署，并推荐行动待办】`;

      const result = await runMeetingAnalysis(textLog, currentAgendaContext);

      // Extract the generated summary points or fallback to default high-fidelity tech items
      const summaryBulletPoints = result.latestToDos && result.latestToDos.length > 0
        ? result.latestToDos.slice(0, 2).map(todo => todo.replace(/^\d+\.\s*/, "")).join("，和")
        : "托班儿童眨眼注意力频率阻断算法以及防眩光传感器网关硬件的指标数据";

      addTranscriptLine(
        "系统提示 (专家智囊)",
        `💡 大地 AI 大脑已通过 KaibanJS 团队顺利合成本阶段核心学术结论：已锁定【${summaryBulletPoints}】。高频脉冲耳返信号已挂载，强推 AI 主席进行总结并宣布本议程完结收官。`
      );

      // Now prepare a custom formulated instruction system event prompt
      const proactiveTransitionPrompt = `[System Event: 议论时间即刻截止！请针对我们刚才讨论到的【${summaryBulletPoints}】等注意力大模型与护眼传感器硬件关键指标，发表一轮极具权威和穿透力的深度学术总结（言简意赅，2-3句话）。随后在发言末尾，务必口头宣布【我们现在立刻无缝流转到最后的收官议程：${agendas[2]?.title || "待办清单确立"}】并打上过渡标记 [ACTION: AGENDA_NEXT]，以此命令系统推进 Kanban 板。最后，点名李园长并邀请他做好承接！。]`;

      if (isConnected) {
        console.log("[Pacemaker Proactive] Directing HostAgent via sendControlText:", proactiveTransitionPrompt);
        sendControlText(proactiveTransitionPrompt);
      } else {
        console.warn("[Pacemaker Proactive] Live WebSocket not active. Local simulated call triggered.");
      }
    } catch (err: any) {
      console.error("[Pacemaker Proactive] Error during proactive KaibanJS analysis:", err);
    }
  }, [transcript, agendaStage, currentTopic, isConnected, sendControlText, addTranscriptLine, agendas]);

  // UseEffects
  
  // Reset flag when agenda stage changes
  useEffect(() => {
    hasTriggeredProactiveRef.current = false;
  }, [agendaStage]);

  // Sync timer duration with selected agenda stage
  useEffect(() => {
    const currentAgenda = agendas.find((a) => a.id === agendaStage);
    if (currentAgenda) {
      setTimeLeft(currentAgenda.durationSeconds);
    }
  }, [agendaStage, agendas]);

  // Monitor conversation transcript updates to reset silence count immediately & scan for triggers
  useEffect(() => {
    if (transcript.length !== prevTranscriptLengthRef.current) {
      console.log("[Pacemaker VAD] Speech registered. Resetting silence counter to 0.");
      setSilenceCounter(0);

      // Watch for the forced AI path transition cue: [ACTION: AGENDA_NEXT]
      const nextCount = transcript.length;
      if (nextCount > prevTranscriptLengthRef.current) {
        const latestLine = transcript[nextCount - 1];
        if (
          latestLine && 
          latestLine.text && 
          latestLine.speaker.includes("AI") &&
          (latestLine.text.includes("[ACTION: AGENDA_NEXT]") || latestLine.text.includes("ACTION: AGENDA_NEXT"))
        ) {
          console.log("[Pacemaker Watchdog] Detected [ACTION: AGENDA_NEXT] token from Host! Advancing agenda...");
          
          // Clean the transcript line text representation
          latestLine.text = latestLine.text
            .replace(/\[ACTION:\s*AGENDA_NEXT\]/gi, "")
            .replace(/ACTION:\s*AGENDA_NEXT/gi, "");

          addTranscriptLine(
            "系统提示 (指令触发)", 
            "📊 AI 主席已在发言音频中宣布了断代进阶指令 `[ACTION: AGENDA_NEXT]`！系统已为您自动切换当前议题泳道，Kanban看板同步生成位移动画。"
          );

          setTimeout(() => {
            forceAdvanceStage();
          }, 1000);
        }
      }

      prevTranscriptLengthRef.current = transcript.length;
    }
  }, [transcript, addTranscriptLine, forceAdvanceStage]);

  // Core Orchestration Timer Loop (Runs once per second when meeting is active)
  useEffect(() => {
    if (!joined || !isMeetingActive) {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
      return;
    }

    intervalTimerRef.current = setInterval(() => {
      // 1. Tick silence counter
      setSilenceCounter((prev) => {
        const nextSilence = prev + 1;
        if (nextSilence >= 8) {
          console.warn("[Pacemaker Activator] 8 Seconds silence threshold breached!");
          triggerSilenceAdvanceSpeech("silence");
          return 0; // reset
        }
        return nextSilence;
      });

      // 2. Tick stage timer countdown
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          // Transition to next agenda stage automatically
          const currentIndex = agendas.findIndex((a) => a.id === agendaStage);
          if (currentIndex !== -1 && currentIndex < agendas.length - 1) {
            const nextStage = agendas[currentIndex + 1].id;
            console.log(`[Pacemaker Timer] Time's up! Advancing stage to ${nextStage}`);
            setAgendaStage(nextStage as any);
            triggerSilenceAdvanceSpeech("timeout");
          } else {
            console.log("[Pacemaker Timer] All agendas fully traversed. Shutting down active driver.");
            setIsMeetingActive(false);
            addTranscriptLine("系统提示", "🔴 本局研讨会计时器行程已跑完。所有会议子环节已顺利收归结论。");
          }
          return 0;
        }

        const nextTime = prevTime - 1;
        // Task: When the meeting is in 'MainDiscussion' and the timer is running low (<= 15 seconds), proactively trigger KaibanJS analysis
        if (agendaStage === "MainDiscussion" && nextTime === 15) {
          setTimeout(() => {
            triggerProactiveAnalysis();
          }, 0);
        }

        return nextTime;
      });
    }, 1000);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [joined, isMeetingActive, agendaStage, agendas, setAgendaStage, triggerSilenceAdvanceSpeech, addTranscriptLine, triggerProactiveAnalysis]);

  return {
    agendas,
    timeLeft,
    silenceCounter,
    isMeetingActive,
    hasPromptedStart,
    triggerOpeningSpeech,
    forceAdvanceStage,
    setIsMeetingActive
  };
}

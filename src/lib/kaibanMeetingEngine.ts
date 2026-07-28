import { KaibanAnalysisResult } from "../types";

// ============================================================================
// TASK 3: KaibanJS Multi-Agent Orchestration Blueprint (KaibanJS Team configuration)
// ============================================================================
// Below is the industry-standard enterprise-grade KaibanJS Multi-Agent definition
// mapping the HostAgent (AI Chairman) and SecretaryAgent with the specialized MeetingDirectorTask.
// ============================================================================

export interface KaibanAgentConfig {
  name: string;
  role: string;
  goal: string;
  backstory: string;
}

export interface KaibanTaskConfig {
  name: string;
  description: string;
  expectedOutput: string;
  agent: string;
  onExecutionTick?: (context: any) => void; // tick callback to trigger Task 2 Pacemaker
}

// 1. Defining the AI Chairman controlling persona as high-performance KaibanJS Agent
export const ChairmanKaibanAgent: KaibanAgentConfig = {
  name: "HostAgent",
  role: "AI 虚拟会议主席",
  goal: "维持课堂研讨学术水准，全权掌控议程流转节奏，高频启动并强力推进研讨！通过声纹与开场触发器主动执掌开幕致辞。随时监测会议沉默度（VAD音量停顿），在冷场超过 8 秒时对指定参会名册（如张园长、李园长等）进行指向性直接点名；无情干预并喝止非学术性质的形式主义闲聊（如端午节采购、粽子等），用苏格拉底追问迫使发言人回到托班智能互动屏幕或眨眼注意力检测的技术指标上。",
  backstory: "由大地 AI 大脑智慧驱动、拥有最高教研指挥权的学前学科资深督导。拒绝被动应答，秉承指令耳返机制（System Event）将指令零时差转化为流畅的口头主持动作！他能够结合多路声纹追踪与内部起搏器倒计时，在会议偏题或遇冷时瞬间做出高强度主持纠偏与直接点名，强力保障教研标准。"
};

// 2. Defining the AI Secretary keeping records and synthesizing Todo lists
export const SecretaryKaibanAgent: KaibanAgentConfig = {
  name: "SecretaryAgent",
  role: "AI 学术纪要秘书",
  goal: "实时搜集参会人关于注意力图像采集、眨眼率规则算法的合理共识，提炼高含金量学术待办事项。",
  backstory: "一丝不苟的大地数字档案专家，自动剔除客套寒暄、采购及报销流水账，全方位守护核心研讨成果物。"
};

// 3. SPECIALIZED MEETING DIRECTOR TASK: Non-conversational rhythmic assessor running periodically (10s timers)
export const MeetingDirectorTask: KaibanTaskConfig = {
  name: "MeetingDirectorTask",
  description: `
    该任务主要执行非对话式、不间断的会议心跳监测。
    评测逻辑：
    1. 巡检 recentTranscript 会议日志，统计学术密度与偏题度。
    2. 判断上一议程讨论是否达到实质性收敛。
    3. 每10秒向后端心跳注入，裁决是否需要强制扭转当前的 AgendaStage（IceBreaking -> MainDiscussion -> Conclusion）。
  `,
  expectedOutput: "输出当前的会议收敛状态指数 (State Convergence Index) 及流转判定信号。",
  agent: "HostAgent",
  // Periodic Execution Tick handler hook (every 10 seconds evaluation callback)
  onExecutionTick: (context: {
    currentTimeRemaining: number;
    silenceSeconds: number;
    currentStage: string;
    triggerPacemaker: (actionType: "timeout" | "silence") => void;
  }) => {
    console.log("[KaibanJS Engine Tick] Evaluating Meeting director state rules...");
    
    // Rule A: If silence exceeds 8 seconds, fire pacemaker trigger instantly
    if (context.silenceSeconds >= 8) {
      console.warn("[KaibanJS Director Rule] 8 seconds silence threshold reached. Launching triggerPacemaker('silence').");
      context.triggerPacemaker("silence");
    }
    
    // Rule B: If current stage duration expired or time remaining is 0, advance stage with timeout trigger
    if (context.currentTimeRemaining <= 0) {
      console.warn("[KaibanJS Director Rule] Agenda stage duration exhausted. Launching triggerPacemaker('timeout').");
      context.triggerPacemaker("timeout");
    }
  }
};

export async function runMeetingAnalysis(recentTranscript: string, currentAgenda: string): Promise<KaibanAnalysisResult> {
  // Client-side environment - forward evaluate request seamlessly to Server API route
  const res = await fetch("/api/meeting/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: recentTranscript, currentTopic: currentAgenda })
  });
  if (!res.ok) {
    throw new Error("HTTP connection error running Kaiban meeting Analysis client-side");
  }
  const data = await res.json();
  return data.result;
}

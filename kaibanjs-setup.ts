import { Agent, Task, Team } from "kaibanjs";

// A wrapper to execute the KaibanJS AI logic
export async function setupKaibanJSTeam(transcript: string, currentTopic: string) {
    if (!transcript) return { decision: "WAITING", message: "暂无输入。" };

    // As AI Chair:
    const aiChairperson = new Agent({
        name: "AI 主席 (大地教研督导)",
        role: "会议控场与深度追问",
        goal: "严格遵守会议议题，防止跑题，并在关键节点使用苏格拉底式提问深挖教研细节。",
        background: "严厉、高效的大地教研督导，拥有丰富的幼儿教育管理经验，不容忍低效的讨论。",
        tools: [],
        llmConfig: {
           provider: "google",
           model: "gemini-3.5-flash",
           apiKey: process.env.GEMINI_API_KEY
        }
    });

    // As AI Secretary:
    const aiSecretary = new Agent({
        name: "AI 秘书",
        role: "会议共识提取与待办生成",
        goal: "实时记录讨论内容，提取核心结论，并在需要时生成可执行的 To-Do List。",
        background: "细心、总结能力极强的行政助理，擅长从复杂的讨论中梳理清晰的逻辑脉络。",
        tools: [],
        llmConfig: {
           provider: "google",
           model: "gemini-3.5-flash",
           apiKey: process.env.GEMINI_API_KEY
        }
    });

    // Task 1: Evaluate transcript to see if intervention is needed
    const evaluateInterventionTask = new Task({
        description: `基于当前会议议题："${currentTopic}"，分析以下近期讨论记录："${transcript}"。如果发现严重跑题或需要深挖细节，请以“AI 主席”的身份输出一句干脆、严厉的提醒或追问。如果没有跑题且讨论顺利，请精准输出大写字母 'PROCEED'。`,
        expectedOutput: "一句中文的语音干预文案，或者大写英文 'PROCEED'。",
        agent: aiChairperson
    });

    // Task 2: Summarize
    const summarizationTask = new Task({
        description: `基于会议记录："${transcript}"，提取当前的共识，并输出3个关键要点或待办事项（To-Do）。`,
        expectedOutput: "Markdown 格式的3点核心共识或待办列表。",
        agent: aiSecretary
    });

    const managementTeam = new Team({
        name: "大地 ECE-Brain 核心控场团队",
        agents: [aiChairperson, aiSecretary],
        tasks: [evaluateInterventionTask, summarizationTask]
    });

    const output = await managementTeam.start();
    
    let interventionMessage = evaluateInterventionTask.result || "PROCEED";
    let summary = summarizationTask.result || "";

    return {
        intervention: interventionMessage,
        summary: summary,
        status: output.status
    };
}

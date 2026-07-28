# 大地 ECE-Brain 会议全生命周期管理与 KaibanJS 议程状态看板技术文档
*(Dadi ECE-Brain Lifecycle Management & KaibanJS Visual Board Specifications)*

本规范文档详细记录了第六阶段（会议全生命周期管理与看板流转）的架构设计、接口标准与具体 TypeScript 代码实现，用以打通从“会前筹备 RAG”到“会中角色控制（RBAC）”，再到“AI 主动发声与看板状态流转”的业务闭环。

---

## 核心实现模块

### 1. 会前筹备与 RAG 挂载模块 (`src/components/MeetingSetup.tsx`)
实现了会议发起人的专属筹备后台：
*   **配置表单**：允许发起高管定制会议主标题、房号以及 1-N 个独立的学术探讨子议程（可自定义限时与议题内容）。
*   **RAG 向量加载区**：支持文件拖曳或点击上传，并在后台线程（前端模拟进度）中对 PDF/Word 文档进行特征矢量切片与索引（绑定至当前 `meeting_id`），构成专属知识库。
*   **链接分发引擎**：一键生成带有安全鉴权参数的受邀人专属邀请通道（`?role=attendee&roomId=...`），并保障自动复制到剪贴板。

### 2. 严格的角色权限管控 (RBAC / `src/hooks/useRole.ts`)
设立了端到端的信息与操控壁垒：
*   **发起人高管 (Creator)**：具有开篇呼唤 AI 虚拟主席、手动/口头强制推进议程阶段、收拢会议等核心超级控制面板权限。
*   **普通参会者 (Attendee)**：通过特定专属 URL 链路匿名或实名接入，仅享有麦克风等基本媒体权限，页面中所有的议程切换、看板编辑功能均处于锁定（Read-Only）状态。

### 3. KaibanJS 议程进程看板 (`src/components/AgendaKanbanBoard.tsx`)
将原来无实际作用的静态组件改造成了中枢可视化进程看板：
*   **多维度泳道分类**：
    *   `【等待讨论 (Pending)】`：未开启的预设大纲事项。
    *   `【正在讨论 (In Progress)】`：当前聚焦的学术议题（运行动态呼吸呼吸呼吸指示灯与计时器）。
    *   `【已完成讨论 (Done)】`：已形成决策共识的议题，打上绿标并添加文字删除线。
*   **动态流转动效**：基于 `motion/react` 库构建的 `layoutId` 跨泳道穿梭动画。当状态或议题变更时，任务卡片会在泳道之间优雅滑行。

### 4. AI 强制路径与断代触发词 (`src/hooks/useAgendaDriver.ts`)
设计了 AI 主席与前端交互的“神经冲动”逻辑：
*   在系统提示词和时钟循环逻辑中注入当前的 `agendas` 列表，强制 AI 必须顺序执行议题。
*   **触发词拦截机制**：在实时语音转文字 (VAD) 的过滤管线中，监听 AI 主席口头说出或生成的特定触发词 `[ACTION: AGENDA_NEXT]`。一旦检测到，系统便会自发完成看板泳道卡片滑移，实现真正的“智能体声音导引”。

---

## 核心数据结构设计 (TypeScript)

### 1. 动态议程数据模型 (`src/types.ts`)
```typescript
export interface DynamicAgendaItem {
  id: string;             // 对应议程的标识符 (如: 'IceBreaking' | 'MainDiscussion' | 'Conclusion')
  title: string;          // 议题标题
  description: string;    // 该环节的详细讨论规范与学术干预说明
  durationSeconds: number;// 限时时间（秒）
}
```

### 2. 全局 Zustard 状态机挂载 (`src/store.ts`)
```typescript
interface MeetingState {
  userRoleType: 'creator' | 'attendee'; // 参会级别
  agendas: DynamicAgendaItem[];         // 1-N 议程链
  mountedFiles: Array<{ name: string; size: string; status: 'uploaded' | 'vectorizing' | 'done' }>;
  meetingStarted: boolean;              // 会议是否已经正式唤醒
  // ...
}
```

---

## 业务运行全景流程图

```
 [ 会前筹备: Creator ] ──> 设定议程 A/B/C ──> 挂载教研文档 (RAG 切片) ──> 生成邀请链接 
                                                                             │
 [ 普通参会: Attendee ] <── 通过链接加入 (被自动锁定为受限角色, RBAC) <───────┘
                               │
 [ 会议大本营: Creator ] ──> 点击正式开始会议 ──> 唤醒 AI 主席致辞与开篇
                               │
                               ▼
 [ AI 主席根据 RAG 约束进行学术控场 ]
                               │
            (冷场超过 8 秒 或 预设时钟耗尽)
                               ├──> 起搏器激发系统高敏脉冲 ──> 迫使 AI 主席出具阶段总结并收尾
                               │
            (AI 主席在发言中宣告转段)
                               └──> 吐出特定的口语化特征词：`[ACTION: AGENDA_NEXT]`
                                                     │
                                                     ▼
                            [ 触发前端 KaibanJS 看板泳道卡片位移动画 ]
```

---
*大地教育科研团队 · ECE-Brain 技术保障组*

# 腾讯会议 × AI 专家：纯软件虚拟音频网桥

> **原则**：不用外部连接线；电脑内部用 **虚拟音频输出 + 虚拟麦克风**（VB-Cable / 微软 SysVAD 类）对接腾讯会议与本 EXE。  
> **双通道（阶段一）**：Others=会场环路；Me=本机麦。策略只吃 Others；Me 仅口令/标定。

## 架构

```
远端/主持人发言
  → AI 扬声器 = CABLE Input
  → EXE Others 采集 (CABLE Output 或系统内录实验)
  → ASR[Others] → 策略 / 副驾驶建议卡

本机操作员真麦
  → EXE Me 采集
  → ASR[Me] → 转写标定；打断/唤醒口令可巡检

EXE Host TTS → CABLE Input → AI 麦 = CABLE Output → 会场可听
```

## 运行

```powershell
cd e:\project\-ECE-Brain-Meeting
npm run desktop
```

1. 安装 VB-Cable（建议两对）或 SysVAD。  
2. Others 选 CABLE Output；勾选「启用双通道 Me」并选本机物理麦。  
3. 可选：打开「悬浮胶囊」扫视 Option A/B/C；`Ctrl+Shift+H` 一键隐藏主窗+胶囊。  
4. 「测虚拟麦」→「启动听会」。

## 环境变量

| 变量 | 说明 |
|------|------|
| `DUAL_TRACK_ME_ASR=0` | 关闭 Me 第二路 ASR（仍可只采 Others） |
| `COPILOT_ENABLED=0` | 关闭建议卡 |

## 听不到 / 转写空

1. 先停听会，勾「本机同时听」，一键自检环路。  
2. Others 电平不跳 → AI 扬声器未进 CABLE Input，或系统内录未勾「分享系统音频」。  
3. Me 电平不跳 → 本机麦权限/设备选错。  
4. 两路 ASR 可能触达并发配额；可关 Me 或增购并发包。

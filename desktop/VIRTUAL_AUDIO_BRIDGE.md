# 腾讯会议 × AI 专家：纯软件虚拟音频网桥

> **原则**：不用外部连接线；电脑内部用 **虚拟音频输出 + 虚拟麦克风**（VB-Cable / 微软 SysVAD 类）对接腾讯会议与本 EXE。

## 架构

```
主持人账号（真麦真箱）     AI 专家账号（仅虚拟设备）        ECE-Brain EXE
真麦克风 / 真音箱     扬声器 → 虚拟音频输出 ──────────→ 采集 → ASR → 策略引擎
                      麦克风 ← 虚拟麦克风   ←────────── 播放 ← Host TTS
                           ↑  OS 内部数字环路  ↑
```

## 运行

```powershell
cd e:\project\-ECE-Brain-Meeting
npm run desktop
```

1. 安装 VB-Cable（建议两对）或 SysVAD 类驱动。  
2. 勾选「腾讯会议双账号核对」。  
3. EXE 两侧只选带 `[虚拟]` 的设备。  
4. 「测虚拟麦」→ 会里听到哔声 →「启动听会 + 策略控场」。

## 与硬件 TX 的对应

| 硬件 TX + 网线 | 本方案 |
|----------------|--------|
| 会议声送给 AI | 虚拟音频输出环路 |
| AI 声送回会议 | 虚拟麦克风环路 |

参考：[微软 Sample Audio Drivers / SysVAD](https://learn.microsoft.com/en-us/windows-hardware/drivers/audio/sample-audio-drivers)

## 听不到声音 / 转写为空时

1. **先停听会**，勾选「本机同时听」，点「一键自检环路」：本机应听到哔声，环回电平跳动 → EXE↔CABLE 正常。  
2. **再启动听会**：用「测试」账号说话，看「会场声」灯与输入电平。不跳 = 腾讯会议 **AI 扬声器未设为 CABLE Input**。  
3. 会议里听 AI：AI 账号**取消静音**，麦克风 = CABLE Output；用测试账号耳机听。试播时看日志是否出现 `TTS 首包语音已到`。  
4. 听会中不要点测麦/自检。单 Cable 建议升级为 A/B 两对。  
5. 控制台乱码以界面日志 / `desktop/logs` UTF-8 文件为准。

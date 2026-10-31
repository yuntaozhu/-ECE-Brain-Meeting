# 本地 Whisper 听写

Electron 不捆绑原生 whisper addon（ABI 易碎）。本仓库通过外挂 **whisper.cpp** 做本地转写。

## 1. 下载模型

```powershell
cd desktop
npm run whisper:model
```

模型默认落到 `desktop/models/whisper/ggml-base.bin`。

## 2. 任选一种后端

### A. HTTP Server（推荐）

按 [whisper.cpp](https://github.com/ggml-org/whisper.cpp) 编译后启动 server，例如：

```text
./whisper-server -m models/ggml-base.bin --host 127.0.0.1 --port 8080
```

`.env`：

```env
HOST_ASR_MODE=local
WHISPER_SERVER_URL=http://127.0.0.1:8080
WHISPER_LANG=zh
```

### B. CLI

```env
HOST_ASR_MODE=local
WHISPER_BIN=E:/tools/whisper.cpp/build/bin/whisper-cli.exe
WHISPER_MODEL=E:/project/-ECE-Brain-Meeting/desktop/models/whisper/ggml-base.bin
WHISPER_LANG=zh
```

## 3. 自检

```powershell
npm run whisper:smoke
```

## 4. 切回云端豆包 ASR

```env
HOST_ASR_MODE=independent
```

## 行为说明

- 采音仍是 16 kHz PCM；`vadGate` 分句后整段送 Whisper（默认能量 VAD；`VAD_BACKEND=silero` 且装好可选依赖时走 Silero 桥）。
- 转写经 `glossaryCorrect`（`dev_knowledge/glossary/project_terms.json`）后再上抛。
- 延迟高于云端流式，适合内网/涉密或配额紧张场景。
- TTS / 策略 LLM 仍可走豆包（见 BYOK：`LLM_PROVIDER=doubao`）。
- Wave A 冒烟（无 binary）：`npm run smoke:wave-a`。

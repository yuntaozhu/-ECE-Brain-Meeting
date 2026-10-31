/**
 * 可选 Windows OCR：对 PNG 路径做 WinRT OCR（无额外 npm 依赖）。
 * 失败则返回 null，不阻断截屏主路径。
 */
const fs = require("fs");
const { spawn } = require("child_process");

function ocrEnabled() {
  if (process.env.SCREEN_OCR === "0") return false;
  if (process.platform !== "win32") return false;
  return process.env.SCREEN_OCR === "1" || process.env.SCREEN_OCR === "auto";
}

function runPowershell(script, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true }
    );
    let out = "";
    let err = "";
    const t = setTimeout(() => {
      try {
        child.kill();
      } catch (_) {}
      resolve({ ok: false, error: "timeout", out, err });
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      out += d.toString("utf8");
    });
    child.stderr.on("data", (d) => {
      err += d.toString("utf8");
    });
    child.on("error", (e) => {
      clearTimeout(t);
      resolve({ ok: false, error: String(e.message || e), out, err });
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ ok: code === 0, code, out, err });
    });
  });
}

/**
 * @param {string} pngPath
 * @returns {Promise<string|null>}
 */
async function tryOcrPng(pngPath) {
  if (!ocrEnabled()) return null;
  if (!pngPath || !fs.existsSync(pngPath)) return null;

  // WinRT OCR via PowerShell；部分环境无 OCR 语言包会失败
  const escaped = String(pngPath).replace(/'/g, "''");
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,Windows.Media.Ocr,ContentType=WindowsRuntime]
function Await($WinRtTask) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.ReturnType.Name -eq 'Task\`1'
  } | Select-Object -First 1
  $netTask = $asTask.MakeGenericMethod($WinRtTask.GetType().GenericTypeArguments).Invoke($null, @($WinRtTask))
  $netTask.GetAwaiter().GetResult()
}
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('${escaped}'))
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read))
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))
$bitmap = Await ($decoder.GetSoftwareBitmapAsync())
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) { Write-Output ''; exit 0 }
$result = Await ($engine.RecognizeAsync($bitmap))
Write-Output $result.Text
`;

  const res = await runPowershell(script, Number(process.env.SCREEN_OCR_TIMEOUT_MS) || 8000);
  if (!res.ok) return null;
  const text = String(res.out || "")
    .replace(/\u0000/g, "")
    .trim();
  if (!text || text.length < 2) return null;
  return text.slice(0, 1200);
}

module.exports = {
  tryOcrPng,
  ocrEnabled
};

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

function loadXiaoxingEnv() {
  const root = path.join(__dirname, "..", "..", "..");
  const xiaoxing = path.join(__dirname, "..", "..");
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(xiaoxing, ".env"));
  try {
    require("dotenv").config({ path: path.join(root, ".env") });
    require("dotenv").config({ path: path.join(xiaoxing, ".env") });
  } catch (_) {}
}

module.exports = { loadXiaoxingEnv, loadEnvFile };

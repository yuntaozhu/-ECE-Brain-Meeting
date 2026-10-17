/**
 * 从决策 jsonl 估计 shadowMarkov。
 * 只读 winnerBucket（absent / script / doc）。空桶不计入转移。
 * 样本不足时打印全 1 矩阵并退出，不写 engine-hyperparams.json。
 *
 *   node tools/estimateMarkovFromLogs.cjs
 *   node tools/estimateMarkovFromLogs.cjs path/to/decisions
 */
const fs = require("fs");
const path = require("path");
const { decisionsDir } = require("../lib/runtime/decisionLog.cjs");

const BUCKETS = ["absent", "script", "doc"];
const MIN_PAIRS = 200;
const MIN_FROM = 20;

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => path.join(dir, name));
}

function sequence(file) {
  const rows = fs
    .readFileSync(file, "utf8")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_) {
        return null;
      }
    })
    .filter((row) => row && BUCKETS.includes(row.winnerBucket))
    .map((row) => row.winnerBucket);
  return rows;
}

function emptyMatrix() {
  const matrix = {};
  for (const from of BUCKETS) {
    matrix[from] = {};
    for (const to of BUCKETS) matrix[from][to] = 1;
  }
  return matrix;
}

function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : decisionsDir();
  const files = listFiles(dir);
  const counts = {};
  const fromCount = {};
  for (const from of BUCKETS) {
    counts[from] = {};
    fromCount[from] = 0;
    for (const to of BUCKETS) counts[from][to] = 0;
  }
  let pairs = 0;
  for (const file of files) {
    const rows = sequence(file);
    for (let i = 1; i < rows.length; i += 1) {
      const from = rows[i - 1];
      const to = rows[i];
      counts[from][to] += 1;
      fromCount[from] += 1;
      pairs += 1;
    }
  }
  const thin = BUCKETS.some((from) => fromCount[from] < MIN_FROM);
  if (pairs < MIN_PAIRS || thin) {
    console.warn(
      `[shadowMarkov] 样本不足 pairs=${pairs} from=${JSON.stringify(fromCount)}，退回全 1。未写入配置。`
    );
    console.log(JSON.stringify({ shadowMarkov: emptyMatrix() }, null, 2));
    return;
  }
  const matrix = {};
  for (const from of BUCKETS) {
    matrix[from] = {};
    const denom = fromCount[from] + BUCKETS.length;
    for (const to of BUCKETS) {
      matrix[from][to] = Number(((counts[from][to] + 1) / denom).toFixed(4));
    }
  }
  console.log(JSON.stringify({ shadowMarkov: matrix }, null, 2));
  console.warn("[shadowMarkov] 仅供审阅。未写入 engine-hyperparams.json。");
}

main();

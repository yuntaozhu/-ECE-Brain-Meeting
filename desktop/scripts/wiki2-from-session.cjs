"use strict";

/**
 * 会后：最新/指定 session → wiki2 episode（规则或 LLM）
 *   node scripts/wiki2-from-session.cjs --dry
 *   node scripts/wiki2-from-session.cjs --apply --llm
 *   node scripts/wiki2-from-session.cjs --id=mtg_xxx
 */
const { promoteSessionToWiki2 } = require("../lib/wiki2/index.cjs");

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : "";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const llm = process.argv.includes("--llm")
    ? true
    : process.argv.includes("--rule")
      ? false
      : undefined;
  const res = await promoteSessionToWiki2({
    meetingId: arg("id") || undefined,
    apply,
    llm,
    agenda: arg("agenda") || undefined,
    themes: true,
    themesWrite: apply
  });
  console.log(JSON.stringify(res, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

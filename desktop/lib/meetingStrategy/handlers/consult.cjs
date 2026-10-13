const { handleConsult } = require("../paths/consultPath.cjs");

async function handle(ctx) {
  return await handleConsult(ctx);
}

module.exports = { handle, name: "consult" };

"use strict";
const { synthesizeThemes } = require("../lib/wiki2/index.cjs");
const dry = process.argv.includes("--dry");
const res = synthesizeThemes({ dry });
console.log(JSON.stringify(res, null, 2));

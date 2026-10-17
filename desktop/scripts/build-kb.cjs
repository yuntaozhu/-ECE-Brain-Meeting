/**
 * 离线编译知识索引。不改口播路径。
 *   npm run build:kb
 */
const { compileKnowledge } = require("../lib/knowledge/compiler.cjs");

const result = compileKnowledge();
console.log("[build:kb]", result.cardCount, "cards,", result.bigramCount, "bigrams ->", result.out);

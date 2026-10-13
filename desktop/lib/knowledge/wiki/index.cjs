/**
 * knowledge/wiki — Karpathy-style LLM Wiki（Query / Ingest / Lint）
 */
const paths = require("./paths.cjs");
const parse = require("./parse.cjs");
const catalog = require("./catalog.cjs");
const query = require("./query.cjs");
const write = require("./write.cjs");
const lint = require("./lint.cjs");

module.exports = {
  ensureWikiDirs: paths.ensureWikiDirs,
  wikiReadRoot: paths.wikiReadRoot,
  wikiWriteRoot: paths.wikiWriteRoot,
  wikiMtimeKey: catalog.wikiMtimeKey,
  listConceptPages: catalog.listConceptPages,
  parseIndexEntries: catalog.parseIndexEntries,
  parseConceptMarkdown: parse.parseConceptMarkdown,
  scorePagesForQuery: query.scorePagesForQuery,
  queryWiki: query.queryWiki,
  getWikiIndexChunks: query.getWikiIndexChunks,
  getPageBySlug: catalog.getPageBySlug,
  matchConceptForQuestion: query.matchConceptForQuestion,
  appendAliasToConcept: write.appendAliasToConcept,
  appendWikiLog: write.appendWikiLog,
  faqBlockFromPage: write.faqBlockFromPage,
  lintWiki: lint.lintWiki,
  ingestInboxAliases: write.ingestInboxAliases
};

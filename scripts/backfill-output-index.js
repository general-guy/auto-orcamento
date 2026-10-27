#!/usr/bin/env node
/** Registra pares PDF+JSON existentes em output/orcamentos-index.json (idempotente). */
const outputIndex = require("../server/output-index");
const { outputDir } = require("../server/paths");

outputIndex.ensureIndexCoversDisk(outputDir);
const doc = outputIndex.readIndexDoc(outputDir);
const active = (doc.items || []).filter((item) => item?.deleted !== true).length;
const tomb = (doc.items || []).filter((item) => item?.deleted === true).length;
console.log(`orcamentos-index.json: ${active} ativo(s), ${tomb} tombstone(s).`);

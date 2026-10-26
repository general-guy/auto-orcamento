#!/usr/bin/env node
/**
 * Migra históricos em data/*.json (string[] ou {nome,valor}[]) para schema v2.
 * Uso: node scripts/migrate-data-catalogs-v2.js
 */

const path = require("node:path");
const fs = require("node:fs");
const { dataDir } = require("../server/paths");
const {
  isCatalogV2,
  parseCatalogRaw,
  writeCatalogFile,
  activeEntries,
} = require("../server/catalog-v2");

const CATALOG_FILES = [
  "pacientes.json",
  "cirurgias.json",
  "hospitais.json",
  "pagamentos.json",
  "observacoes.json",
  "extras.json",
  "tecnologias.json",
  "unimed-n.json",
];

function migrateOne(fileName) {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    const written = writeCatalogFile(filePath, { schemaVersion: 2, items: [] });
    console.log(`${fileName}: criado vazio (${activeEntries(written).length} ativos).`);
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }

  if (isCatalogV2(parsed)) {
    console.log(`${fileName}: já v2 (${activeEntries(parsed).length} ativos).`);
    return;
  }

  const migrated = parseCatalogRaw(raw);
  const written = writeCatalogFile(filePath, migrated);
  console.log(
    `${fileName}: migrado → ${activeEntries(written).length} ativos, ${written.items.length} itens no arquivo.`,
  );
}

function main() {
  console.log(`Data dir: ${dataDir}`);
  for (const fileName of CATALOG_FILES) {
    migrateOne(fileName);
  }
}

main();

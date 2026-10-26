#!/usr/bin/env node
/**
 * Migra data/pacientes.json legado (string[]) para schema v2.
 * Preferir: node scripts/migrate-data-catalogs-v2.js (todos os catálogos).
 * Uso: node scripts/migrate-pacientes-schema-v2.js
 */

const path = require("node:path");
const { dataDir } = require("../server/paths");
const fs = require("node:fs");
const {
  isCatalogV2,
  parseCatalogRaw,
  writePatientsCatalogFile,
  activeEntries,
} = require("../server/patients-catalog");

const patientsFile = path.join(dataDir, "pacientes.json");

function main() {
  if (!fs.existsSync(patientsFile)) {
    const written = writePatientsCatalogFile(patientsFile, { schemaVersion: 2, items: [] });
    console.log(`Criado ${patientsFile} (vazio).`);
    console.log(`  Entradas ativas: ${activeEntries(written).length}`);
    return;
  }

  const parsed = JSON.parse(fs.readFileSync(patientsFile, "utf8"));
  if (isCatalogV2(parsed)) {
    console.log("pacientes.json já está em schema v2.");
    console.log(`  Ativos: ${activeEntries(parsed).length}`);
    return;
  }

  const migrated = parseCatalogRaw(fs.readFileSync(patientsFile, "utf8"));
  const written = writePatientsCatalogFile(patientsFile, migrated);
  console.log("Migração concluída.");
  console.log(`  Arquivo: ${patientsFile}`);
  console.log(`  Entradas ativas: ${activeEntries(written).length}`);
  console.log(`  Tombstones: ${written.items.length - activeEntries(written).length}`);
}

main();

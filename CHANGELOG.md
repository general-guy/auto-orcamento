# Changelog

## 2026-10-27

- Consolidação SQLite só em `EXPORT_DIR` (`C:\auto-orcamento\export\` no Atlas); removida entrega a `dados-clinica/import/` (SQLite, timbrado e fontes). Docs: `export-sqlite.md`, `README.md`, `AGENTS.md`.

## 2026-10-25

- CT 100: consolidação SQLite só em axis-data `export/` (sem entrega dados-clinica); `export-sqlite.js` + `paths.js`; Node 22 + `--experimental-sqlite` (unit no `local-atlas`). Docs: `export-sqlite.md`, `axis-ct100.md`.

## 2026-10-24

- PDF e snapshot JSON no Windows passam a ficar em `C:\auto-orcamento\output\`, fora do repositório (`server/paths.js`; override `OUTPUT_DIR`). Detalhes: `docs/agent-memory/output-path.md`.


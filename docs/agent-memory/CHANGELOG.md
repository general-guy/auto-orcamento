# Agent memory — changelog

- 2026-10-25: CT 100 recriado — paths/export/unit/deploy axis-data; push + `deploy_auto_orcamento.py` executados.
- 2026-10-25: Desenho CT 100 — mutável em axis-data (`/data/auto-orcamento`), código em `/opt`; doc `axis-ct100.md`.
- 2026-10-25: Bootstrap legado `{repo}/data` atualiza `C:\auto-orcamento\data` se mtime mais novo; script `scripts/finalize-repo-data-migration.ps1` remove resíduos no clone.
- 2026-10-25: Runtime `data/` no Windows → `C:\auto-orcamento\data\` (`DATA_DIR`); seed versionado em `seed/data/`; HTTP `/data/*` e APIs usam `dataDir` (`server/paths.js`, `server/data-bootstrap.js`).
- 2026-10-25: Removidos Funnel (`iniciar-acesso-remoto.bat`, `auth-users.json`, `server/auth.js`) e pasta `tauri-fase_legado/`; histórico em `docs/legado-funnel-auth.md`, `docs/legado-tauri.md`, `docs/legado-limpeza.md`.
- 2026-10-25: Consolidação SQLite entrega cópia idêntica em `C:\auto-orcamento\export\orcamentos.sqlite` no Windows (arranque, impressão local, `npm run export:sqlite`); ver `docs/export-sqlite.md` e `output-path.md`.
- 2026-10-25: Documentação de uso diário no Atlas prioriza `data/`, `C:\auto-orcamento\output\` e espelho SQLite; redesign do CT 100 ficou fora de escopo até novo desenho.

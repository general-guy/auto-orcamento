# Candidatos a limpeza (pós-remoção Tauri / Funnel)

Removidos nesta rodada (outubro/2026):

| Item | Motivo |
|------|--------|
| `tauri-fase_legado/` | Stack congelada; ver [`legado-tauri.md`](legado-tauri.md) |
| `iniciar-acesso-remoto.bat`, `scripts/remote-access-host.js`, `server/auth.js`, `web/login.*`, `web/auth-admin.js` | Funnel legado; ver [`legado-funnel-auth.md`](legado-funnel-auth.md) |
| `web/pdf-build.js` | Montagem de PDF só no caminho Tauri |
| `scripts/copy-frontend.cjs` | Copiava `web/` → `dist/` para embed no Tauri |
| `scripts/sync-web-icons-from-tauri.ps1` | Ícones já vivem em `assets/` |

## Ainda no repo — revisar se virar lixo

| Caminho | Nota |
|---------|------|
| `docs/MIGRATION-tauri.md`, `docs/SNAPSHOT-tauri-v0.2.0-paused.md`, `docs/SNAPSHOT-node-web-v0.1.0.md` | Snapshots históricos; manter como arquivo |
| `scripts/open-snapshot-dialog.ps1` | Possível duplicata do `.py`; confirmar uso no Windows antes de apagar |
| `dist/` | Resíduo de build Tauri (gitignored); apagar localmente se existir |
| `auto-orcamento.exe` na raiz | Artefato antigo (gitignored) |
| `npm run icon:generate` | Só ícones em `assets/`; raramente necessário |
| Estilos `.auth-*` / `.guest-*` em `web/styles.css` | CSS órfão; remoção cosmética |

## Dependências

Após remover Tauri, rodar `npm install` para atualizar `package-lock.json` (sem `@tauri-apps/cli`).

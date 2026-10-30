# Agent memory — índice

Memória durável do **Auto Orçamento** (decisões, caminhos, deploy). Cada tema daqui é um stub ou aponta o runbook. O plugin Continual Learning só mexe nas seções Learned de `AGENTS.md`; esta pasta é curada no `/doc-update` e não depende do hook. Linha nova em [`CHANGELOG.md`](CHANGELOG.md).

## Fonte de verdade

| Tema | Documento |
|------|-----------|
| Dados ao vivo Windows (`C:\auto-orcamento\`) | [`output-path.md`](output-path.md) |
| Backup legado `data/` (pré-UUID) | [`../../backup-legado/README.md`](../../backup-legado/README.md) |
| Migração UUID `data/` | [`data-uuid-migration.md`](data-uuid-migration.md) |
| Schema v2 (catálogo UUID) | [`data-schema-v2.md`](data-schema-v2.md) |
| CT 100, axis-data, `/opt` vs `/data` | [`axis-ct100.md`](axis-ct100.md) |
| Sync automático Atlas ↔ Axis (dev) | [`../atlas-axis-sync.md`](../atlas-axis-sync.md) |
| `data/` ao vivo (blur, pull + reconcile) | [`axis-data-live-sync.md`](axis-data-live-sync.md) |
| Notify Axis → Atlas (pull na sessão) | [`atlas-notify.md`](atlas-notify.md) |
| Toasts + histórico na UI (preview) | [`axis-sync-ui.md`](axis-sync-ui.md) |
| Tombstones `output/` (`orcamentos-index.json`) | [`output-index-sync.md`](output-index-sync.md) |
| Log das últimas 10 sessões de sync (Atlas) | [`axis-sync-sessions.md`](axis-sync-sessions.md) |
| Narrativa Atlas/Axis no app | [`../atlas-axis.md`](../atlas-axis.md) |
| SQLite para o dados-clinica (leitura unidirecional) | [`../export-sqlite.md`](../export-sqlite.md) |
| Operação Axis (scripts, Pi, PVE) | repositório **`local-atlas`** (`axis/`, `docs/referencias/web-apps-axis.md`) |
| Skills Cursor (deploy/sync CT100, resumo operacional) | `~/.cursor/skills/ct100-webapps/` + filho `ct100-auto-orcamento/` (runbook longo continua nos `.md` acima) |

Runbooks operacionais de push/deploy manual continuam no **local-atlas**; este repo documenta o que o **Node/WebView** faz ao abrir o app no Atlas.

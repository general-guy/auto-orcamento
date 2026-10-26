# Agent memory — índice

Memória durável do **Auto Orçamento** (decisões, caminhos, deploy). O plugin Continual Learning atualiza `AGENTS.md` na raiz; temas longos ficam aqui + linha em [`CHANGELOG.md`](CHANGELOG.md).

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
| Toasts + histórico na UI (preview) | [`axis-sync-ui.md`](axis-sync-ui.md) |
| Log das últimas 10 sessões de sync (Atlas) | [`axis-sync-sessions.md`](axis-sync-sessions.md) |
| Narrativa Atlas/Axis no app | [`../atlas-axis.md`](../atlas-axis.md) |
| SQLite espelho | [`../export-sqlite.md`](../export-sqlite.md) |
| Operação Axis (scripts, Pi, PVE) | repositório **`local-atlas`** (`axis/`, `docs/referencias/web-apps-axis.md`) |

Runbooks operacionais de push/deploy manual continuam no **local-atlas**; este repo documenta o que o **Node/WebView** faz ao abrir o app no Atlas.

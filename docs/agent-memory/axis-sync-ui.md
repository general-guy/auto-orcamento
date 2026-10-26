# Sync Axis — UI no Atlas (toasts e histórico)

Só em `127.0.0.1` / `localhost` (mesma regra do `axis-sync.js`).

## Componentes

| Peça | Arquivo |
|------|---------|
| Fila + SSE | `server/axis-sync.js` — fila awaitable (`pull` antes de ler JSON, `push` após gravar); não repete toast genérico de falha se o Python já emitiu `error` |
| Toasts ao vivo | `web/sync-toasts.js` — `EventSource` `/api/sync/events`; `position: fixed` (não empurra o preview) |
| Histórico (10) | Mesmo script — botão na `preview-toolbar` (à direita de “Documento Final”); painel com horário `HH:MM:SS` |

## Wake na UI

Toasts com `phase: "wake"` vêm de `ensure_axis_online.py` (local-atlas). Amarelo de ligação dura mais na tela (`DISMISS_WAKE_MS`).

Runbook completo: [`../atlas-axis-sync.md`](../atlas-axis-sync.md). `data/` ao vivo: [`axis-data-live-sync.md`](axis-data-live-sync.md). Log de sessões Python: [`axis-sync-sessions.md`](axis-sync-sessions.md).

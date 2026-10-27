# Sync Axis — UI no Atlas (toasts e histórico)

Só em `127.0.0.1` / `localhost` (mesma regra do `axis-sync.js`).

## Componentes

| Peça | Arquivo |
|------|---------|
| Fila + SSE | `server/axis-sync.js` — `--startup` após o **primeiro** cliente SSE (fallback 90 s); `enqueueAhead` faz o startup **passar na frente** de pulls já enfileirados; replay de toasts (3 min); fila awaitable (`pull` / `push`) |
| Toasts ao vivo | `web/sync-toasts.js` — `EventSource` após `window.load` + `requestIdleCallback` (sync não atrasa a UI); `position: fixed` (não empurra o preview) |
| Histórico (10) | Mesmo script — botão na `preview-toolbar` (à direita de “Documento Final”); painel com horário `HH:MM:SS` |
| Recarregar | `web/sync-toasts.js` — botão à esquerda do histórico; `location.replace` com `?_r=`; `server/server.js` responde HTML com `Cache-Control: no-store` e `stampLocalAssets` (`?v=` no mtime de `.js`/`.css`); o script remove `_r` da URL após carregar |

## Wake na UI

Toasts com `phase: "wake"` vêm de `ensure_axis_online.py` (local-atlas). Amarelo de ligação dura mais na tela (`DISMISS_WAKE_MS`).

## Toasts no Axis (notify)

Quando o CT grava e o Atlas está acessível, a resposta JSON pode trazer `atlasNotify` (`level`: `ok` | `warn`). `web/api.js` chama `window.AutoOrcamentoSyncUi.showToast` (definido em `sync-toasts.js`). Não usa SSE — só mutações que disparam notify (`data/`, settings, impressão).

Runbook completo: [`../atlas-axis-sync.md`](../atlas-axis-sync.md). `data/` ao vivo: [`axis-data-live-sync.md`](axis-data-live-sync.md). Notify: [`atlas-notify.md`](atlas-notify.md). Log de sessões Python: [`axis-sync-sessions.md`](axis-sync-sessions.md).

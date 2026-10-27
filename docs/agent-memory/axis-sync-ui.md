# Sync Axis — UI no Atlas (toasts e histórico)

Só em `127.0.0.1` / `localhost` (mesma regra do `axis-sync.js`).

## Componentes

| Peça | Arquivo |
|------|---------|
| Fila + SSE | `server/axis-sync.js` — `--startup` após o **primeiro** cliente SSE (fallback 90 s); `enqueueAhead` faz o startup **passar na frente** de pulls já enfileirados; replay de toasts (3 min); fila awaitable (`pull` / `push`) |
| Toasts ao vivo | `web/sync-toasts.js` — `EventSource` após `window.load` + `requestIdleCallback` (sync não atrasa a UI); `position: fixed` (não empurra o preview) |
| Histórico (10) | Mesmo script — botão na `preview-toolbar` (à direita de “Documento Final”); painel com horário `HH:MM:SS` |
| Recarregar | `web/sync-toasts.js` — botão à esquerda do histórico; `location.replace` com `?_r=`; `server/server.js` responde HTML com `Cache-Control: no-store` e `stampLocalAssets` (`?v=` no mtime de `.js`/`.css`); o script remove `_r` da URL após carregar; SSE com `skipReplay=1` para não repetir toasts do buffer (3 min) |

## Replay de toasts (SSE)

Cada nova conexão em `/api/sync/events` reenvia toasts recentes (`replayRecentToasts`, até **3 min** em memória no Node) para não perder avisos do `--startup` se o WebView conectar tarde. O `--startup` **não** roda de novo no refresh (só uma vez por processo Node). Toast amarelo `/data/ N conflito(s)` após o botão de recarregar era em geral **replay** do merge na abertura, não sync novo — conferir `session-*-startup.log` ou o histórico da toolbar. O recarregar pela toolbar marca `sessionStorage` e pede `?skipReplay=1`; F5 manual ainda pode repetir replay.

## Wake na UI

Toasts com `phase: "wake"` vêm de `ensure_axis_online.py` (local-atlas). Amarelo de ligação dura mais na tela (`DISMISS_WAKE_MS`).

## Toasts no Axis (notify)

No CT, `GET /api/sync/events` usa `attachNotifyToastRoute` (sem replay em memória — só eventos ao vivo). Ao gravar com o Atlas acessível, `postNotifyToAtlas` publica toasts quando o POST NDJSON traz `phase: "received"` / `"synced"`. Atlas fechado ou POST sem resposta válida: sem toast. Replay de 3 min existe só no Atlas (`axis-sync.js`).

Runbook completo: [`../atlas-axis-sync.md`](../atlas-axis-sync.md). `data/` ao vivo: [`axis-data-live-sync.md`](axis-data-live-sync.md). Notify: [`atlas-notify.md`](atlas-notify.md). Log de sessões Python: [`axis-sync-sessions.md`](axis-sync-sessions.md).

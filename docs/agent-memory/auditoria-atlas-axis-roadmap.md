# Auditoria Atlas ↔ Axis — roadmap (consulta)

Stub de memória. Canvas vivo (IDE): `~/.cursor/projects/.../canvases/auditoria-atlas-axis.canvas.tsx`. Runbooks: [`../atlas-axis-sync.md`](../atlas-axis-sync.md), [`axis-data-live-sync.md`](axis-data-live-sync.md), [`atlas-notify.md`](atlas-notify.md). Skills: `ct100-webapps` + `ct100-auto-orcamento`.

## Veredito (2026-11-02)

O sync híbrido (merge por arquivo + notify + fila serial) está **certo para o domínio**. Não reescrever em rsync/CRDT. Ganho: menos spawn Python por blur, cache de Axis online, docs/API alinhados; depois fatiar `web/app.js` se necessário.

## Implementado (P0 + P1)

| Item | Onde |
|------|------|
| Coalesce push/pull ~400 ms; `flushNow` em pull await, notify, PDF/índice | `server/axis-sync.js` |
| Path policy unificada (push = `normalizeNotifyRelativePath`) | `axis-sync.js` + `atlas-notify.js` |
| Cache Axis online 45 s (stamp entre spawns) | `local-atlas/.../ensure_axis_online.py` → `C:\auto-orcamento\logs\axis-sync\axis-online.stamp` |
| Doc PUT: há pull; risco = UI stale | `axis-data-live-sync.md` |
| Notify canônico `:3010` | `atlas-notify.md` |
| `http-utils.js` (`normalizeText`, `collectRequestBody`) | `server/` |
| Removidos `addHistory`/`removeHistory` e `atlasNotify` no JSON (toasts só SSE) | `web/api.js`, `server.js`, `catalog-http.js` |

## Pendente (P2 / P3) — não feito

| Fase | Ideia |
|------|--------|
| P2 | Motor único autofill hospital (Regina/Sapiranga/Blanc) |
| P2 | Debounce `paginateDocument`; extrair IIFEs (`hospital-domain`, `preview`, …) sem bundler |
| P2 | Impressão: flush de histórico em batch (menos N POSTs) |
| P2 (opcional) | Refresh client após toast «Atualizado do Axis» / reorder com labels do disco |
| P3 | Worker Python persistente; heartbeat WebView para notify com Node órfão |

## Não simplificar

Reconcile por arquivo; `sync_catalog_v2.py`; `sync_output_index.py`; fila serial; wake 180 s; mtime lógico em `output/`; token + whitelist do notify.

## Changelog

Ver [`CHANGELOG.md`](CHANGELOG.md) (2026-11-02 sync).

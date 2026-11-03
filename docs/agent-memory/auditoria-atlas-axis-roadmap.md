# Auditoria Atlas ↔ Axis — roadmap (consulta)

Stub de memória. Canvas vivo (IDE): `~/.cursor/projects/.../canvases/auditoria-atlas-axis.canvas.tsx`. Runbooks: [`../atlas-axis-sync.md`](../atlas-axis-sync.md), [`axis-data-live-sync.md`](axis-data-live-sync.md), [`atlas-notify.md`](atlas-notify.md). Skills: `ct100-webapps` + `ct100-auto-orcamento`.

## Veredito (2026-11-03)

Reauditoria confirma o de 2026-11-02: o sync híbrido (merge por arquivo + notify + fila serial) está **certo para o domínio**. Não reescrever em rsync/CRDT. **P0/P1 estáveis no código.** Ganho restante: menos spawns/HTTP na impressão, debounce do preview e fatiar `web/app.js` — sem trocar o motor de merge.

Blur típico no Atlas: **2 spawns Python** (pull `flushNow` + push coalescido); wake amortizado pelo stamp 45 s.

## Implementado (P0 + P1) — reconfirmado 2026-11-03

| Item | Onde |
|------|------|
| Coalesce push/pull ~400 ms; `flushNow` em pull await, notify, PDF/índice | `server/axis-sync.js` |
| Path policy unificada (push = `normalizeNotifyRelativePath`) | `axis-sync.js` + `atlas-notify.js` |
| Cache Axis online 45 s (stamp entre spawns) | `local-atlas/.../ensure_axis_online.py` → `C:\auto-orcamento\logs\axis-sync\axis-online.stamp` |
| Doc PUT: há pull; risco = UI stale | `axis-data-live-sync.md` |
| Notify canônico `:3010` (LAN; não Tailscale) | `atlas-notify.md`, `ARCHITECTURE.md` |
| `http-utils.js` (`normalizeText`, `collectRequestBody`) | `server/` |
| Removidos `addHistory`/`removeHistory` e `atlasNotify` no JSON (toasts só SSE) | `web/api.js`, `server.js`, `catalog-http.js` |

## Pendente (P2 / P3) — ranking revisado 2026-11-03

| Prioridade | Ideia | Nota |
|------------|--------|------|
| **P2-a** | Impressão: flush de histórico em batch (menos N POSTs) | Hoje `Promise.all` de N `save*ToHistory` → satura a fila sync; maior impacto Atlas↔Axis |
| **P2-b** | Debounce `updatePreview` / `paginateDocument` | Cada `input` pagina o DOM A4; esforço baixo |
| **P2-c** | Motor único autofill hospital (Regina/Sapiranga/Blanc) | ~200–250 linhas duplicadas em `web/app.js` |
| **P2-d** | Extrair IIFEs (`hospital-domain`, `preview`, …) sem bundler | Padrão já em `api.js` / `sync-toasts.js` / `zoom.js` |
| **P2-e** (opcional) | Refresh client após toast «Atualizado do Axis» / reorder com labels do disco | Hoje só reload manual na toolbar |
| **P3-a** | Unificar pull+push num único spawn Python | Python já aceita vários flags; Node ainda separa tarefas |
| **P3-b** | Worker Python persistente | Menos cold-start; esforço alto |
| **P3-c** | Heartbeat WebView / `isAppSessionActive` real | Hoje só `server.listening`; `--keep-server` deixa notify `:3010` sem UI |

Próximo passo recomendado se for implementar: **P2-a + P2-b**.

## Achados novos (2026-11-03)

- `ARCHITECTURE.md` descrevia listener notify «na Tailscale»; canônico é LAN `:3010`.
- `POST /api/open-snapshot` + `open-snapshot-dialog.py` são legado (UI usa `#snapshotPicker`) — candidata a remoção futura.
- Canvas da auditoria atualizado com coluna Status (Feito/Pendente).

## Não simplificar

Reconcile por arquivo; `sync_catalog_v2.py`; `sync_output_index.py`; fila serial; wake 180 s; mtime lógico em `output/`; token + whitelist do notify.

## Changelog

Ver [`CHANGELOG.md`](CHANGELOG.md) (2026-11-03 reauditoria; 2026-11-02 sync P0/P1).

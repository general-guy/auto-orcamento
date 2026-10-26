# Acesso remoto

**Produção clínica:** app na tailnet via **Tailscale Serve** no Axis — `https://axis.tail5fe4b7.ts.net/` (ver [`atlas-axis.md`](atlas-axis.md)). Cliente (celular, tablet ou browser) na **mesma tailnet**. Sem Funnel.

**Desenvolvimento neste PC:** `abrir-auto-orcamento.bat` → `http://127.0.0.1:3000` (WebView2).

## Abrir orçamento salvo (browser na tailnet)

O seletor nativo de arquivos (`POST /api/open-snapshot`) só funciona em **localhost** no servidor. Em hostname remoto (ex.: URL do Axis), o botão **Abrir** usa a **lista de `.json` em `output/`** (`GET /api/snapshots*`), somente leitura.

## Impressão

Em qualquer origem, **Imprimir** grava PDF + JSON em `output/` do servidor e reconstrói o espelho SQLite antes do diálogo de impressão do navegador.


## Modal Abrir orçamento salvo (tailnet)

No hostname remoto, **Abrir** usa `#snapshotPicker` (`GET /api/snapshots`). O diálogo ocupa até ~960×90vh; a lista preenche o espaço vertical (`flex`). Dois botões alternam a ordenação (mesmo botão inverte):

| Botão | Alternância |
|-------|-------------|
| Nome | A–Z ↔ Z–A |
| Data | mais recente ↔ mais antiga (padrão ao abrir) |

Filtro por nome permanece no campo de busca.

## Primeiro carregamento (Tailscale)

O HTML/CSS aparece antes do `app.js` (~180 KB) e dos catálogos via API. Em `https://axis.tail5fe4b7.ts.net/` **não** há mais `waitForBackend` (legado Tauri/porta 3000) — antes isso atrasava ~5 s a listas rápidas e o zoom.

| Diagnóstico | Como |
|-------------|------|
| Rede dos assets | `pwsh ./scripts/bench_web_load.ps1 -BaseUrl https://axis.tail5fe4b7.ts.net/` |
| Tempo até catálogos na sessão | Abrir `?perf=1` → console `[auto-orcamento perf]` / `window.__autoOrcamentoPerf` (`initToDataMs`) |

## Legado removido

Tailscale **Funnel** + tokens (`iniciar-acesso-remoto.bat`, `auth-users.json`): ver [`legado-funnel-auth.md`](legado-funnel-auth.md).

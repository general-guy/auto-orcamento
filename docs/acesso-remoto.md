# Acesso remoto

**Produção clínica:** app na tailnet via **Tailscale Serve** no Axis — `https://axis.tail5fe4b7.ts.net:3000/` (ver [`atlas-axis.md`](atlas-axis.md)). Cliente (celular, tablet ou browser) na **mesma tailnet**. Sem Funnel.

**Desenvolvimento neste PC:** `abrir-auto-orcamento.bat` → `http://127.0.0.1:3000` (WebView2).

## Abrir orçamento salvo (browser na tailnet)

No **Atlas** e na **tailnet**, o botão **Abrir** usa o mesmo modal (`GET /api/snapshots*`) com **Excluir** (`DELETE`) — tombstone em `output/orcamentos-index.json`. O seletor nativo (`POST /api/open-snapshot`) permanece só para uso legado em localhost, fora do fluxo do botão **Abrir**.


## Tela estreita (celular na tailnet)

No viewport estreito (`max-width: 1180px`) o formulario e o preview empilham. Regras que evitam os bugs comuns no iPhone:

| Area | Comportamento |
|------|----------------|
| Botoes **Abrir** / **Limpar** / **Imprimir** | No fim do formulario (sem `position: sticky`) |
| Campo **Data** | Contido no card (`min-width: 0`, `overflow` no label da data / painel) — iOS localiza a data e estoura sem isso |
| Preview A4 | Fit visual com `transform: scale`; tipografia/paginacao em **pt** (independente da tela); folha `210mm`×`297mm` |
| UI zoom | Preferencia do desktop fica em 100% no body sob 1180px (`reapplyWebZoom`) |

Detalhe e arquivos: [`agent-memory/ui-layout-mobile.md`](agent-memory/ui-layout-mobile.md).

## Impressão

Em qualquer origem, **Imprimir** grava PDF + JSON em `output/` do servidor e reconstrói o espelho SQLite antes do diálogo de impressão do navegador.


## Modal Abrir orçamento salvo (tailnet)

No hostname remoto, **Abrir** usa `#snapshotPicker` (`GET /api/snapshots`). O diálogo ocupa até ~960×90vh; a lista preenche o espaço vertical (`flex`). Dois botões alternam a ordenação (mesmo botão inverte):

| Botão | Alternância |
|-------|-------------|
| Nome | A–Z ↔ Z–A |
| Data | mais recente ↔ mais antiga (padrão ao abrir) |

Filtro por nome permanece no campo de busca. **Excluir** remove PDF+JSON no servidor e registra apagado para o sync (ver [`agent-memory/output-index-sync.md`](agent-memory/output-index-sync.md)).

## Primeiro carregamento (Tailscale)

O HTML/CSS aparece antes do `app.js` (~180 KB) e dos catálogos via API. Em `https://axis.tail5fe4b7.ts.net:3000/` **não** há mais `waitForBackend` (legado Tauri/porta 3000) — antes isso atrasava ~5 s a listas rápidas e o zoom.

| Diagnóstico | Como |
|-------------|------|
| Rede dos assets | `pwsh ./scripts/bench_web_load.ps1 -BaseUrl https://axis.tail5fe4b7.ts.net:3000/` |
| Tempo até catálogos na sessão | Abrir `?perf=1` → console `[auto-orcamento perf]` / `window.__autoOrcamentoPerf` (`initToDataMs`) |

## Legado removido

Tailscale **Funnel** + tokens (`iniciar-acesso-remoto.bat`, `auth-users.json`): ver [`legado-funnel-auth.md`](legado-funnel-auth.md).

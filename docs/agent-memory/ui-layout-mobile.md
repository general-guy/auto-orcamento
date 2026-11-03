# UI — layout mobile / tela estreita

Stub + runbook curto da coluna de formulario e da pre-visualizacao A4 no celular (Tailscale) e em viewport estreita. Indice: [`README.md`](README.md).

## Decisoes

| Tema | Regra |
|------|--------|
| Botoes **Abrir** / **Limpar** / **Imprimir** | Ficam no fluxo normal no fim de `#budget-form` (`.actions`). **Nao** usar `position: sticky; bottom: 0` — na coluna com `overflow` (desktop) ou no scroll mobile os botoes grudavam no meio do formulario |
| Campo **Data** | Em Safari/iOS, `input[type=date]` tem largura/fonte nativas. Usar `appearance: none` + `border-radius: 12px` + `font: inherit`; `label:has` com `overflow: hidden`; `.form-panel` com `overflow-x: hidden` |
| Texto / paginação A4 | Folha **794×1123px**, tipografia **14px** / line-height 1.3 e gaps apertados (15px inchava Observacoes e a pagina vazia ia a 2 folhas nos dois). Probe offscreen com largura forçada; altura util fixa; HTML com `?v=mtime`. Meta: pagina vazia = **1 folha** igual no PC e no iPhone |
| Atlas vs Axis (mesmo URL) | Se o **PC local** mostra 1 folha e o **celular no Axis** mostra 2, conferir `styles.css?v=` / `font-size` no DevTools antes de mexer na paginacao: o CT pode estar com tipografia antiga. Forcar `sync_auto_orcamento.py --sync-code` (reinicia o servico) + hard refresh |
| Preview **Documento Final** | A folha continua A4 (`--paper-width` / `--paper-height` = `210mm` × `297mm`) para o PDF e a paginacao. **Nao** redesenhar com flex fluido. Envolver as `.print-page` em `#previewPages` e escalar com `transform: scale(var(--preview-fit-scale))` (escala ≤ 1; **nao** CSS `zoom` — falha no Safari/iOS e mede mal com UI zoom) |
| Escala | `updatePreviewFitScale()` em `web/app.js`: mede largura do `.preview-panel` (padding incluso), define `--preview-fit-scale` + `margin-bottom` para colapsar o layout box; `ResizeObserver` + `resize`; durante `paginateDocument()` a escala volta a `1` |
| UI zoom | Preferencia em `settings.json`; em `max-width: 1180px` o body **nao** aplica `transform: scale` (evita estourar form/preview no celular). `AppApi.reapplyWebZoom` no breakpoint |
| Impressao / PDF | `@media print` zera `transform` em `#previewPages`. PDF automatico (`pdf-export.js`) usa HTML isolado das `.print-page` — nao herda o fit da UI |
| Breakpoint | `@media (max-width: 1180px)`: uma coluna; handle de resize oculto |

## Arquivos

- `web/styles.css` — A4 794×1123, `.pagination-probe` (largura forçada), tipografia 14px
- `web/index.html` — `#previewPages` (assets com `?v=` via `server.js`)
- `web/app.js` — `paginateDocument` (altura util fixa + probe; `fonts.ready`)
- `server/server.js` — HTML sempre `stampLocalAssets` + `Cache-Control: no-store`
- `web/api.js` — `applyWebZoom` / `reapplyWebZoom` (body scale=1 sob 1180px)
- `web/zoom.js` — `resize` apos zoom; `matchMedia` reaplica no breakpoint
- Sync tipografia no CT: `local-atlas/axis/scripts/sync_auto_orcamento.py --sync-code` (nao so git push)
- Narrativa remota: [`../acesso-remoto.md`](../acesso-remoto.md)
- Frontend geral: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

## QA rapido

1. Viewport estreita ou celular na tailnet (`https://axis.tail5fe4b7.ts.net:3000/`).
2. Campo Data nao ultrapassa a borda do card.
3. Scroll do formulario: botoes so aparecem apos o ultimo fieldset.
4. Preview mostra a folha inteira na largura (sem corte a direita); impressao/PDF segue A4.
5. Com UI zoom ≠ 100% no desktop, no celular o body fica em 100% e o A4 ainda cabe.
6. Pagina vazia padrao: **1 folha** no PC e no iPhone (tipografia 14px + probe 794px + altura fixa; hard refresh se o Safari cachear). Contagem deve ser igual entre telas.
7. Se PC (Atlas) e celular (Axis) divergem na contagem: comparar `?v=` do CSS; sync de codigo no CT se o Axis ainda servir 15px.

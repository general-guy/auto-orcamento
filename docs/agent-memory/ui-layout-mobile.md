# UI — layout mobile / tela estreita

Stub + runbook curto da coluna de formulario e da pre-visualizacao A4 no celular (Tailscale) e em viewport estreita. Indice: [`README.md`](README.md).

## Decisoes

| Tema | Regra |
|------|--------|
| Botoes **Abrir** / **Limpar** / **Imprimir** | Ficam no fluxo normal no fim de `#budget-form` (`.actions`). **Nao** usar `position: sticky; bottom: 0` — na coluna com `overflow` (desktop) ou no scroll mobile os botoes grudavam no meio do formulario |
| Campo **Data** | Em Safari/iOS, `input[type=date]` tem largura/fonte nativas. Usar `appearance: none` + `border-radius: 12px` + `font: inherit`; `label:has` com `overflow: hidden`; `.form-panel` com `overflow-x: hidden` |
| Texto / paginação A4 | Tipografia do documento em **pt** (base 11pt), `text-size-adjust: none`; `paginateDocument` mede com scale=1 + reflow e remarca apos `document.fonts.ready`. A folha e o PDF nao devem depender da largura da tela; o fit so escala a visualizacao |
| Preview **Documento Final** | A folha continua A4 (`--paper-width` / `--paper-height` = `210mm` × `297mm`) para o PDF e a paginacao. **Nao** redesenhar com flex fluido. Envolver as `.print-page` em `#previewPages` e escalar com `transform: scale(var(--preview-fit-scale))` (escala ≤ 1; **nao** CSS `zoom` — falha no Safari/iOS e mede mal com UI zoom) |
| Escala | `updatePreviewFitScale()` em `web/app.js`: mede largura do `.preview-panel` (padding incluso), define `--preview-fit-scale` + `margin-bottom` para colapsar o layout box; `ResizeObserver` + `resize`; durante `paginateDocument()` a escala volta a `1` |
| UI zoom | Preferencia em `settings.json`; em `max-width: 1180px` o body **nao** aplica `transform: scale` (evita estourar form/preview no celular). `AppApi.reapplyWebZoom` no breakpoint |
| Impressao / PDF | `@media print` zera `transform` em `#previewPages`. PDF automatico (`pdf-export.js`) usa HTML isolado das `.print-page` — nao herda o fit da UI |
| Breakpoint | `@media (max-width: 1180px)`: uma coluna; handle de resize oculto |

## Arquivos

- `web/styles.css` — `.actions`, date (`appearance: none`), `.preview-pages` (`transform: scale`), tipografia A4 em pt
- `web/index.html` — `#previewPages`
- `web/app.js` — `updatePreviewFitScale`; `paginateDocument` (reflow scale=1 + `fonts.ready`)
- `web/api.js` — `applyWebZoom` / `reapplyWebZoom` (body scale=1 sob 1180px)
- `web/zoom.js` — `resize` apos zoom; `matchMedia` reaplica no breakpoint
- Narrativa remota: [`../acesso-remoto.md`](../acesso-remoto.md)
- Frontend geral: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

## QA rapido

1. Viewport estreita ou celular na tailnet (`https://axis.tail5fe4b7.ts.net:3000/`).
2. Campo Data nao ultrapassa a borda do card.
3. Scroll do formulario: botoes so aparecem apos o ultimo fieldset.
4. Preview mostra a folha inteira na largura (sem corte a direita); impressao/PDF segue A4.
5. Com UI zoom ≠ 100% no desktop, no celular o body fica em 100% e o A4 ainda cabe.
6. Pagina vazia padrao: mesma contagem de folhas no Atlas e no iPhone (tipografia pt / fonts.ready).

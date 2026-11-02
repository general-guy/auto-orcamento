# UI — layout mobile / tela estreita

Stub + runbook curto da coluna de formulario e da pre-visualizacao A4 no celular (Tailscale) e em viewport estreita. Indice: [`README.md`](README.md).

## Decisoes

| Tema | Regra |
|------|--------|
| Botoes **Abrir** / **Limpar** / **Imprimir** | Ficam no fluxo normal no fim de `#budget-form` (`.actions`). **Nao** usar `position: sticky; bottom: 0` — na coluna com `overflow` (desktop) ou no scroll mobile os botoes grudavam no meio do formulario |
| Campo **Data** | Em Safari/iOS, `input[type=date]` tem largura intrinseca grande. Exigir `width/max-width: 100%`, `min-width: 0` no input e nos ancestrais (`label`, `fieldset`); `.form-panel` com `overflow-x: hidden` |
| Preview **Documento Final** | A folha continua A4 (`--paper-width` / `--paper-height` = `210mm` × `297mm`) para o PDF e a paginacao. **Nao** redesenhar com flex fluido. Envolver as `.print-page` em `#previewPages` e escalar com `zoom: var(--preview-fit-scale)` (escala ≤ 1) |
| Escala | `updatePreviewFitScale()` em `web/app.js`: mede largura disponivel, define `--preview-fit-scale`; `ResizeObserver` no `.preview-panel` + `window.resize`; `web/zoom.js` dispara `resize` apos zoom da UI. Durante `paginateDocument()`, a escala volta a `1` para medir altura correta |
| Impressao / PDF | `@media print` forca `zoom: 1` em `#previewPages`. PDF automatico (`pdf-export.js`) usa HTML isolado das `.print-page` — nao herda o fit da UI |
| Breakpoint | `@media (max-width: 1180px)`: uma coluna; handle de resize oculto |

## Arquivos

- `web/styles.css` — `.actions`, date, `.preview-pages`, media queries
- `web/index.html` — `#previewPages`
- `web/app.js` — `updatePreviewFitScale`, append de paginas geradas em `#previewPages`
- `web/zoom.js` — `resize` apos mudar zoom
- Narrativa remota: [`../acesso-remoto.md`](../acesso-remoto.md)
- Frontend geral: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

## QA rapido

1. Viewport estreita ou celular na tailnet (`https://axis.tail5fe4b7.ts.net:3000/`).
2. Campo Data nao ultrapassa a borda do card.
3. Scroll do formulario: botoes so aparecem apos o ultimo fieldset.
4. Preview mostra a folha inteira na largura (sem corte a direita); impressao/PDF segue A4.

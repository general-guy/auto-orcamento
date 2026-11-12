# Impressão via PDF gerado

Stub + runbook curto do botão **Imprimir orçamento**. Índice: [README.md](README.md).

## Decisão (2026-11-12)

O diálogo nativo do navegador (impressora, cor, A4, PCL) consome o **PDF já gravado** em output/, não o HTML da UI (window.print() na página). Motivo: rasterizar timbrado PNG + fontes Gotham OTF via HTML→PCL (ex. HP2700) saía aos pedaços; o PDF do Chromium no servidor é o artefato estável.

## Fluxo

1. Históricos pendentes.
2. POST /api/pdf → PDF + JSON + índice + SQLite; resposta **sem** await de notify Axis→Atlas (deferNotify no lastSnapshotDir).
3. printGeneratedPdf(filename) em web/app.js: GET /output/{filename} → blob → iframe oculto → contentWindow.print().
4. Se a exportação falhar: alerta; **não** cai no print do HTML.

## Arquivos

- web/app.js — exportPdfDocument (retorna ilename) + printGeneratedPdf
- server/server.js / server/pdf-export.js — geração
- Narrativa: [../ARCHITECTURE.md](../ARCHITECTURE.md), [../acesso-remoto.md](../acesso-remoto.md), [../export-sqlite.md](../export-sqlite.md)
- Notify: [tlas-notify.md](atlas-notify.md)

## QA

1. Atlas Chrome em https://axis.tail5fe4b7.ts.net:3000/ (ou localhost).
2. **Imprimir** → preview do diálogo mostra o PDF (não o formulário).
3. HP/PCL: spool contínuo (não fatias 10%/pausa).

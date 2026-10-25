# Acesso remoto

**Produção clínica:** app na tailnet via **Tailscale Serve** no Axis — `https://axis.tail5fe4b7.ts.net/` (ver [`atlas-axis.md`](atlas-axis.md)). Cliente (celular, tablet ou browser) na **mesma tailnet**. Sem Funnel.

**Desenvolvimento neste PC:** `abrir-auto-orcamento.bat` → `http://127.0.0.1:3000` (WebView2).

## Abrir orçamento salvo (browser na tailnet)

O seletor nativo de arquivos (`POST /api/open-snapshot`) só funciona em **localhost** no servidor. Em hostname remoto (ex.: URL do Axis), o botão **Abrir** usa a **lista de `.json` em `output/`** (`GET /api/snapshots*`), somente leitura.

## Impressão

Em qualquer origem, **Imprimir** grava PDF + JSON em `output/` do servidor e reconstrói o espelho SQLite antes do diálogo de impressão do navegador.

## Legado removido

Tailscale **Funnel** + tokens (`iniciar-acesso-remoto.bat`, `auth-users.json`): ver [`legado-funnel-auth.md`](legado-funnel-auth.md).

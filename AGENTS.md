# AGENTS.md

Memória de trabalho do agente neste repositório. O plugin **Continual Learning** atualiza as seções `Learned *` a partir dos chats; o restante é mantido à mão.

Para fluxos com plugins (quando pedir o quê, frases úteis): [`docs/cursor-plugins.md`](docs/cursor-plugins.md).

## Projeto (canônico)

- App local de orçamentos cirúrgicos: **Node.js + WebView2** (`pywebview`) na `main`.
- Entrada diária: `abrir-auto-orcamento.bat`. Remoto: `iniciar-acesso-remoto.bat` (Tailscale Funnel).
- Código ativo: `web/`, `server/`, `launcher/`. **Não** editar `tauri-fase_legado/` no fluxo diário (Tauri congelado).
- Dados: históricos em `data/*.json` (versionados); PDF/JSON canônicos em `output/` (não versionado); espelho SQLite em `export/orcamentos.sqlite` (ver `docs/export-sqlite.md`).
- Após mudar código: reabrir o app (`abrir-auto-orcamento.bat` ou `npm start`) — sem build.
- Docs técnicas: `README.md`, `docs/ARCHITECTURE.md`, `docs/acesso-remoto.md`, `docs/export-sqlite.md`.

## Plugins Cursor (uso neste repo)

| Plugin | Quando usar |
|---|---|
| **Context7** | APIs de Node, Puppeteer, pywebview, Tailscale, SQLite — pedir docs atualizadas antes de inventar sintaxe |
| **Browser Use** | QA visual do formulário/preview em `http://localhost:3000`, acesso remoto Funnel, checagem de impressão/UI |
| **Cursor Team Kit** | Review antes de commit/PR, deslop, smoke/UI harness, CI se houver |
| **Continual Learning** | Automático (hook); ou pedir para minerar chats / atualizar este arquivo |

## Convenções de mudança

- Preferir edições focadas; não expandir escopo para Tauri ou refactors grandes sem pedido.
- Ao alterar comportamento do app, alinhar `README.md` / docs afetados no mesmo trabalho (padrão do usuário: docs + commit).
- Escrita de arquivos de texto no Windows: UTF-8 sem BOM (evitar UTF-16 do editor).
- Commit/push só quando o usuário pedir explicitamente.

## Learned User Preferences

- Desenvolvimento diário só na stack Node + WebView2; Tauri permanece congelado em `tauri-fase_legado/`.
- Depois de features ou correções, costuma pedir revisão da documentação e, em seguida, commit + push.
- Prefere PowerShell 7 (`pwsh`) no terminal do Cursor no Windows.

## Learned Workspace Facts

- Stack ativa: Node (`server/server.js`), frontend em `web/`, launcher `launcher/native_launcher.py` (WebView2).
- Porta local do app: `http://localhost:3000` (ou `127.0.0.1:3000`).
- Dependência de PDF: `puppeteer-core` + Chrome/Edge instalado.
- Snapshot JSON (`schemaVersion: 1`) e botão Abrir existem só na stack Node.
- Espelho SQLite é gerado na abertura do servidor e após imprimir; também via `npm run export:sqlite`.

# AGENTS.md

Memória de trabalho do agente neste repositório. O plugin **Continual Learning** atualiza as seções `Learned *` a partir dos chats; o restante é mantido à mão.

Para fluxos com plugins (quando pedir o quê, frases úteis): [`docs/cursor-plugins.md`](docs/cursor-plugins.md).

## Projeto (canônico)

- App local de orçamentos cirúrgicos: **Node.js + WebView2** (`pywebview`) na `main` (desenvolvimento no Atlas).
- Entrada diária neste PC: `abrir-auto-orcamento.bat` → `127.0.0.1:3000`. Produção: Axis CT 100 (`https://axis.tail5fe4b7.ts.net/`, Tailscale Serve, sem Funnel) — ver `docs/atlas-axis.md`.
- `iniciar-acesso-remoto.bat` (Funnel neste Windows) é legado de teste, não caminho clínico.
- Código ativo: `web/`, `server/`, `launcher/`. **Não** editar `tauri-fase_legado/` no fluxo diário (Tauri congelado).
- Dados: históricos em `data/*.json` (a maior parte versionada neste clone); `data/pacientes.json`, `data/settings.json` e `data/auth-users.json` são locais (`.gitignore`). Produção ao vivo no disco do Axis. PDF/JSON canônicos em `output/` (não versionado); espelho SQLite em `export/orcamentos.sqlite` (ver `docs/export-sqlite.md`).
- Após mudar código: reabrir o app (`abrir-auto-orcamento.bat` ou `npm start`) — sem build. Deploy para o Axis: script no `local-atlas` (`axis/scripts/deploy_auto_orcamento.py`), só com pedido explícito.
- Docs técnicas: `README.md`, `docs/ARCHITECTURE.md`, `docs/atlas-axis.md`, `docs/acesso-remoto.md`, `docs/export-sqlite.md`.

## Plugins Cursor (uso neste repo)

| Plugin | Quando usar |
|---|---|
| **Context7** | APIs de Node, Puppeteer, pywebview, Tailscale, SQLite — pedir docs atualizadas antes de inventar sintaxe |
| **Browser Use** | QA visual do formulário/preview em `http://localhost:3000`, URL do Axis se pedido, checagem de impressão/UI |
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
- Porta local do app: `http://localhost:3000` (ou `127.0.0.1:3000`); bind padrão `127.0.0.1` (`BIND_HOST`).
- Produção clínica: Axis CT 100 (`192.168.68.202:3000`, `BIND_HOST=192.168.68.202`) + Tailscale Serve no host → `https://axis.tail5fe4b7.ts.net/`. Sem Funnel.
- Dependência de PDF: `puppeteer-core` + Chrome/Edge instalado.
- Snapshot JSON (`schemaVersion: 1`) e botão Abrir existem só na stack Node.
- Espelho SQLite é gerado na abertura do servidor e após imprimir; também via `npm run export:sqlite`.
- `data/pacientes.json` não entra no Git; o servidor cria `[]` se faltar. Seed: `data/pacientes.json.example`.
- Negrito do documento (observações `*texto*` e rótulo `Tempo previsto`) é Gotham Medium (`--document-emphasis-weight: 500`).

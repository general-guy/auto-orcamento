# AGENTS.md

Memória de trabalho do agente neste repositório. O plugin **Continual Learning** atualiza as seções `Learned *` a partir dos chats; o restante é mantido à mão.

Para fluxos com plugins (quando pedir o quê, frases úteis): [`docs/cursor-plugins.md`](docs/cursor-plugins.md).

## Projeto (canônico)

- App local de orçamentos cirúrgicos: **Node.js + WebView2** (`pywebview`) na `main` (desenvolvimento no Atlas).
- Entrada diária neste PC: `abrir-auto-orcamento.bat` → `127.0.0.1:3000`. Produção: Axis CT 100 (`https://axis.tail5fe4b7.ts.net/`, Tailscale Serve, sem Funnel) — ver `docs/atlas-axis.md`.
- Código ativo: `web/`, `server/`, `launcher/`. Tauri e Funnel+token removidos do tree — ver `docs/legado-tauri.md` e `docs/legado-funnel-auth.md`.
- Dados ao vivo no Windows: `C:\auto-orcamento\data\` + `output\` + `export\` (ver `docs/agent-memory/output-path.md`). Seed no repo: `seed/data/`. Pasta `data/` no clone é local (`.gitignore`).
- Sync Atlas↔Axis em background ao abrir o `.bat` (só `127.0.0.1`): `server/axis-sync.js` → `sync_auto_orcamento.py` (wake: `ensure_axis_online.py` no local-atlas); toasts SSE + histórico na toolbar do preview — `docs/atlas-axis-sync.md`, `docs/agent-memory/axis-sync-ui.md`.
- Após mudar código: reabrir o app (`abrir-auto-orcamento.bat` ou `npm start`) — sem build. Deploy manual completo: `local-atlas` → `deploy_auto_orcamento.py`; o sync automático envia diff de código quando o manifesto mudou.
- Docs técnicas: `README.md`, `docs/ARCHITECTURE.md`, `docs/atlas-axis.md`, `docs/atlas-axis-sync.md`, `docs/acesso-remoto.md`, `docs/export-sqlite.md`, `docs/tabelas-hospitalares.md`, `docs/unimed-n.md`; memória temática em `docs/agent-memory/README.md`.

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

- Desenvolvimento diário só na stack Node + WebView2.
- Depois de features ou correções, costuma pedir revisão da documentação e, em seguida, commit + push.
- Prefere PowerShell 7 (`pwsh`) no terminal do Cursor no Windows.

## Learned Workspace Facts

- Stack ativa: Node (`server/server.js`), frontend em `web/`, launcher `launcher/native_launcher.py` (WebView2).
- Porta local do app: `http://localhost:3000` (ou `127.0.0.1:3000`); bind padrão `127.0.0.1` (`BIND_HOST`).
- Produção clínica: Axis CT 100 (`192.168.68.202:3000`, `BIND_HOST=192.168.68.202`) + Tailscale Serve no host → `https://axis.tail5fe4b7.ts.net/`. Sem Funnel.
- Dependência de PDF: `puppeteer-core` + Chrome/Edge instalado.
- Snapshot JSON (`schemaVersion: 1`) e botão Abrir existem só na stack Node; Abrir lista só os `.json` de `output/` (sem diálogo nativo do sistema).
- Espelho SQLite é reconstruído a partir de `output/` na abertura do servidor e após imprimir (também `npm run export:sqlite`); cópia em `C:\auto-orcamento\export\` e entrega para `dados-clinica/import/` (no CT: `/data/dados-clinica/import/`).
- `pacientes.json` ao vivo em `C:\auto-orcamento\data\` (não no Git); seed: `seed/data/pacientes.json.example`.
- Negrito do documento (observações `*texto*` e rótulo `Tempo previsto`) é Gotham Medium (`--document-emphasis-weight: 500`).
- CT 100: mutável em axis-data (`/data/auto-orcamento/`), código em `/opt/auto-orcamento`. Deploy tar via `deploy_auto_orcamento.py`; sync automático no Atlas reconcilia `C:\auto-orcamento\` e código incremental (`sync_auto_orcamento.py`); wake do host sob demanda no arranque/push do sync.
- Hospital cujo nome contém Unimed N abre linhas Uni# com valor em R$ (sem multiplicador), histórico em `data/unimed-n.json`.
- Hospital cujo nome contém Blanc abre linhas Bla# com tabela em `tabelas-hospitalares.json` (valores = parcela 1+3 × 4; autofill 1 / 0.6 / 0.5 só em maior incidência + demais; associadas em x1). `data/tabela-blanc-2026.json` é extração seccionada, não lida pelo app. O 3% à vista do PDF não é automático.

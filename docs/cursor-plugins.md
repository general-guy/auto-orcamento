# Cursor plugins neste projeto

Como usar os plugins instalados no fluxo do **Auto Orçamento**. Detalhes de produto: READMEs de cada plugin no marketplace. Este guia só amarra ao que o repo precisa.

Plugins esperados: **Context7**, **Continual Learning**, **Cursor Team Kit**, **Browser Use**.

## Mapa rápido

| Situação | Plugin / skill | O que pedir (exemplo) |
|---|---|---|
| API de lib (Puppeteer, pywebview, Node) | Context7 | "Consulta no Context7 a API atual de puppeteer-core para PDF headless" |
| Conferir UI / formulário / preview | Browser Use | "Com o app em localhost:3000, abre no browser e confere o preview após preencher…" |
| Limpar código gerado por IA | Team Kit → `deslop` | "Roda deslop no que acabamos de mudar" |
| Review + commit/PR | Team Kit → `review-and-ship` / `new-branch-and-pr` | "Review and ship desta branch" |
| Provar uma correção | Team Kit → `verify-this` | "Verifica com baseline vs tratamento que o X não regressou" |
| Harness de UI local | Team Kit → `control-ui` | "Monta um harness CDP para o fluxo Abrir snapshot" |
| Preferências que se repetem nos chats | Continual Learning | Automático; ou "Atualiza o AGENTS.md a partir dos chats recentes" |

Memória persistente do agente: [`AGENTS.md`](../AGENTS.md) na raiz.

## Context7

**Para quê:** docs oficiais atualizadas (evita API inventada).

**Neste repo, consultar antes de mudar:**

- `puppeteer-core` (PDF em `server/pdf-export.js`)
- `pywebview` (launcher WebView2)
- APIs Node `http` / streams se mexer em `server/server.js`
- SQLite se mexer em `server/export-sqlite.js` ou `scripts/consolidate-to-sqlite.js`

**Frases úteis:**

- "Usa Context7 para a versão atual de puppeteer-core e ajusta o export de PDF."
- "/context7:docs pywebview create_window maximized"

Não use Context7 para regras de negócio do orçamento (Unimed N, Regina/Sapiranga) — isso está em `docs/` e `data/`.

## Browser Use

**Para quê:** Chrome real via CLI/MCP (cliques, screenshots, extração).

**Pré-requisito:** [uv](https://docs.astral.sh/uv/); no Chrome local, habilitar uma vez `chrome://inspect/#remote-debugging`.

**Neste repo:**

1. Subir o app (`abrir-auto-orcamento.bat` ou `npm start`).
2. Pedir QA em `http://127.0.0.1:3000` (formulário, preview, zoom, **Abrir**, listas rápidas).
3. Produção no Axis: `https://axis.tail5fe4b7.ts.net/` (cliente na tailnet). Funnel neste PC só se o legado estiver ativo — ver `docs/atlas-axis.md`.

**Frases úteis:**

- "Com Browser Use, abre o app local e confere se a seção Equipe aparece no preview."
- "Tira screenshot da pré-visualização após carregar um JSON de `output/`."

O app em WebView2 nativo **não** é o mesmo processo do Chrome do Browser Use; para UI nativa (ícone da barra, maximizado), o teste manual pelo `.bat` continua necessário. Browser Use cobre o **mesmo HTML/JS** servido em `localhost:3000`.

## Cursor Team Kit

**Para quê:** review, CI, shipping, smoke, limpeza de slop — sem depender de Slack/Linear.

**Skills que mais encaixam aqui:**

| Skill | Uso típico no Auto Orçamento |
|---|---|
| `deslop` | Depois de refactors em `web/app.js` / `server/*.js` |
| `review-and-ship` | Fechar um lote de mudanças com review estruturado |
| `verify-this` | Regressão de impressão, zoom vs `@media print`, consolidação SQLite |
| `control-ui` | Automação repetível do formulário no browser |
| `run-smoke-tests` | Se/quando houver Playwright no repo |
| `check-compiler-errors` | Menos crítico (JS sem typecheck); útil se retomar Tauri/Rust |
| `what-did-i-get-done` / `weekly-review` | Resumo do que saiu na `main` |

Rules do kit (`no-inline-imports`, `typescript-exhaustive-switch`) aplicam-se pouco ao JS atual; ignore-as onde não houver TypeScript.

## Continual Learning

**Para quê:** manter [`AGENTS.md`](../AGENTS.md) com preferências e fatos do workspace, a partir dos transcripts.

**Estado local (já no repo / máquina):**

- `.cursor/hooks/state/continual-learning.json` — cadência do hook
- `.cursor/hooks/state/continual-learning-index.json` — índice incremental (quando existir)

**O que o updater grava:** só bullets em `## Learned User Preferences` e `## Learned Workspace Facts`. As outras seções de `AGENTS.md` (projeto, plugins, convenções) são manuais — não apague ao "limpar" memória.

**Pedido manual:** "Roda continual learning / atualiza o AGENTS.md com o que aprendemos nesta semana."

## Fluxos recomendados (receitas)

### Feature no formulário ou preview

1. Implementar em `web/` + APIs em `server/` se precisar.
2. Context7 se tocar Puppeteer/pywebview.
3. Browser Use: smoke em `localhost:3000`.
4. Atualizar `README.md` / docs afetados.
5. Commit só se pedido (Team Kit `review-and-ship` se for abrir PR).

### Mudança em PDF / snapshot / SQLite

1. Context7 para Puppeteer/SQLite se a API for duvidosa.
2. `verify-this`: um JSON de `output/` antes/depois; `npm run export:sqlite` se o espelho mudar.
3. Docs: `docs/export-sqlite.md` ou secção de impressão no README.

### Acesso remoto

1. Produção: `docs/atlas-axis.md` e URL `https://axis.tail5fe4b7.ts.net/`.
2. Funnel legado neste PC: `docs/acesso-remoto.md` (token de uso único).
3. Não misturar teste só-local do WebView2 com a URL do Axis sem documentar a diferença.

### Retomada Tauri (rara)

1. Ler `docs/MIGRATION-tauri.md` e `docs/SNAPSHOT-tauri-v0.2.0-paused.md`.
2. Context7 para Tauri 2 / Rust da época do snapshot.
3. Não misturar commits de Tauri com o fluxo Node diário.

## O que não precisa de plugin

- Regras de Regina / Sapiranga / Unimed N / implantes → `docs/tabelas-*.md`, `docs/unimed-n.md`, `data/*.json`
- Arquitetura do launcher → `docs/ARCHITECTURE.md`
- Commit/push pedestres → Agent + regras de git do usuário (sem plugin obrigatório)

# Snapshot — migração Tauri estagnada (v0.2.0-paused)

Este documento registra o estado **congelado** da migração Tauri antes de retomar o desenvolvimento diário via **Node.js** (`abrir-auto-orcamento.bat`).

| Campo | Valor |
|---|---|
| Versão de referência | `v0.2.0-tauri-paused` (migração pausada; `package.json` ainda `0.1.0`) |
| Commit de referência | Anotado na tag `v0.2.0-tauri-paused` (`git rev-parse v0.2.0-tauri-paused`) |
| Branch estável | `stable/tauri-v0.2.0-paused` |
| Tag | `v0.2.0-tauri-paused` |
| Baseline Node anterior | `stable/node-web-v0.1.0` / `v0.1.0-node-web` |
| Data do snapshot | 2026-06-18 |
| Fases concluídas | 1 (scaffold), 2 (persistência), 3 (PDF) |
| Fases pendentes | 4 (PC limpo), 5 (paridade final e corte) |

## Propósito

Preservar o trabalho Tauri/Rust e a documentação associada **sem continuar a migração ativamente**. Use este snapshot para:

- retomar o `.exe` ou `tauri:dev` no futuro a partir de um ponto conhecido;
- comparar paridade com a stack Node (`docs/SNAPSHOT-node-web-v0.1.0.md`);
- auditar o que já foi implementado (comandos Rust, `api.js`, PDF, zoom, paths).

## Desenvolvimento ativo (após estagnação)

O fluxo **diário** volta a ser **`abrir-auto-orcamento.bat`** (Node + browser).

Alterações em código **partilhado** do web app servem **ambos** os deploys quando a migração for retomada:

```text
index.html, styles.css, app.js, api.js, pdf-build.js, zoom.js, assets/, data/
```

- **Node:** basta reabrir o `.bat` ou `npm start` — sem build.
- **Tauri (futuro):** `build-auto-orcamento-tauri.bat` ou `npm run tauri:dev` após retomar a migração.

A camada `api.js` (`AppApi`) já abstrai HTTP (Node) e `invoke` (Tauri). Mantenha novas features nessa camada quando forem relevantes para os dois modos.

## Arquitetura Tauri neste snapshot

```text
build-auto-orcamento-tauri.bat
  -> npm run tauri:build
      -> copy:frontend (scripts/copy-frontend.cjs) -> dist/
      -> cargo build --release
      -> scripts/copy-release-exe.cjs -> auto-orcamento.exe (raiz)

auto-orcamento.exe (runtime)
  -> WebView2 + frontend em dist/
  -> invoke(...) -> src-tauri/src/commands.rs
  -> data/ e output/ na raiz do repo (paths.rs)
  -> export_pdf -> Chrome/Edge headless (pdf.rs)
```

Desenvolvimento rápido sem `.exe` na raiz:

```bash
npm run tauri:dev
```

## Inventário Tauri / Rust

| Caminho | Função |
|---|---|
| `src-tauri/Cargo.toml` | Crate Rust, dependências Tauri 2 |
| `src-tauri/tauri.conf.json` | Janela, `withGlobalTauri`, `bundle.active = false` |
| `src-tauri/src/main.rs` | Entry point |
| `src-tauri/src/lib.rs` | Setup da janela, ícone, registro de comandos |
| `src-tauri/src/commands.rs` | Handlers IPC expostos ao frontend |
| `src-tauri/src/storage.rs` | Históricos, tecnologias, zoom, `table_load` |
| `src-tauri/src/paths.rs` | Resolução de `data/` e `output/` via `current_exe()` |
| `src-tauri/src/pdf.rs` | `export_pdf` (Chrome/Edge headless) |
| `src-tauri/permissions/storage-commands.toml` | Permissões IPC |
| `src-tauri/capabilities/default.json` | Capabilities Tauri 2 |
| `src-tauri/icons/` | Ícones gerados (`npm run icon:generate`) |

## Frontend e scripts adicionados para Tauri

| Arquivo | Função |
|---|---|
| `api.js` | `AppApi`: HTTP no Node, `invoke` no Tauri; `waitForBackend()` |
| `pdf-build.js` | HTML autocontido para PDF (Tauri e referência partilhada) |
| `zoom.js` | Zoom Ctrl+roda; persiste em `data/settings.json` (Tauri) |
| `scripts/copy-frontend.cjs` | Copia web app + `data/` para `dist/` |
| `scripts/copy-release-exe.cjs` | Copia `.exe` release para a raiz |
| `scripts/build-app-icon-square.ps1` | Gera `assets/app-icon-square.png` |
| `scripts/copy-favicon.cjs` | Favicon a partir dos ícones Tauri |
| `build-auto-orcamento-tauri.bat` | Atalho de build release |

## Comandos Tauri implementados

| Comando | Equivalente Node |
|---|---|
| `history_list` / `history_add` / `history_remove` / `history_replace` | `/api/{store}` |
| `technologies_list` / `technologies_add` / `technologies_remove` | `/api/tecnologias` |
| `zoom_get` / `zoom_set` / `zoom_adjust` | — (só Tauri; `data/settings.json`) |
| `table_load` | `GET data/tabelas-hospitalares.json` / `tabela-implantes.json` |
| `export_pdf` | `POST /api/pdf` |

## Funcionalidades confirmadas neste snapshot (Tauri)

- [x] Scaffold Tauri 2, frontend em `dist/`, janela maximizada, ícone G dourado
- [x] Históricos e tecnologias em `data/*.json` (mesmo formato Node)
- [x] Tabelas hospitalares e implantes via `table_load` / edição manual em `data/`
- [x] PDF automático em `output/` via `export_pdf`
- [x] Zoom da interface com persistência (`zoom.js` + Rust)
- [x] Build `.exe` na raiz (`auto-orcamento.exe`); sem instalador NSIS/MSI
- [x] `paths.rs`: `data/` na raiz do repo; log `Diretório de dados`
- [ ] Teste em PC limpo (Fase 4)
- [ ] Checklist de paridade final vs snapshot Node (Fase 5)

## Pendências conhecidas (motivo da pausa)

- Fase 4: validação em PC sem Node/Rust.
- Fase 5: paridade funcional completa (autofill, preview, offline) nos dois deploys.
- `.exe` sem assinatura digital — Controlo de Aplicações Inteligentes no Windows 11 (documentado no README).
- `src-tauri/target/` pode ocupar vários GB; usar `cargo clean` quando necessário.

## Como restaurar este snapshot Tauri

```bash
git fetch origin
git checkout stable/tauri-v0.2.0-paused
npm install
```

Build do executável (máquina com Rust):

```bash
build-auto-orcamento-tauri.bat
```

Ou desenvolvimento:

```bash
npm run tauri:dev
```

Ponto exato via tag:

```bash
git checkout v0.2.0-tauri-paused
```

## Como continuar só com Node (desenvolvimento diário)

Permaneça em `feature/tauri` (ou branch de trabalho atual) e use:

```text
abrir-auto-orcamento.bat
```

Não é necessário Rust nem rebuild para iterar no web app. O snapshot Tauri permanece em `stable/tauri-v0.2.0-paused` para retomada futura.

## Documentação relacionada

- `docs/MIGRATION-tauri.md` — plano completo (status **estagnado**)
- `docs/SNAPSHOT-node-web-v0.1.0.md` — baseline Node para paridade
- `README.md` — uso diário e deploy duplo
- `ARCHITECTURE.md` — detalhes técnicos

# Plano de migração para Tauri

> **Status:** **ESTAGNADO** (2026-06-18) — Fases 1–3 concluídas; Fases 4–5 pendentes.  
> **Snapshot congelado:** `stable/tauri-v0.2.0-paused` / tag `v0.2.0-tauri-paused` / `docs/SNAPSHOT-tauri-v0.2.0-paused.md`  
> **Desenvolvimento ativo:** `abrir-auto-orcamento.bat` (Node). Alterações no web app partilhado (`app.js`, `api.js`, …) servem ambos os deploys no futuro.  
> **Baseline Node:** `stable/node-web-v0.1.0` / tag `v0.1.0-node-web` / `docs/SNAPSHOT-node-web-v0.1.0.md`

## Objetivo

Acrescentar um **executável desktop** (Tauri) **em paralelo** à stack Node — **sem** descontinuar `abrir-auto-orcamento.bat`. Os dois fluxos devem manter **paridade funcional** sobre o **mesmo web app** (`app.js`, `api.js`, etc.).

| Capacidade | Node (`abrir-auto-orcamento.bat`) | Tauri (`auto-orcamento.exe`) |
|---|---|---|
| Abrir sem Node no destino | Não | Sim |
| Persistir `data/` / `output/` | Sim | Sim |
| PDF automático | Sim | Sim |
| Mesmo frontend | Sim | Sim (via `dist/` no build) |

## O que reaproveitar (~90% do frontend)

| Item | Ação |
|---|---|
| `index.html` | Manter; ajustar caminhos se necessário |
| `styles.css` | Manter |
| `app.js` | Manter; lógica via `AppApi` (`api.js`) — HTTP no Node, `invoke` no Tauri |
| `data/*.json` | Manter formato e localização |
| `assets/*` | Manter |
| Lógica de preview, paginação, autofill | Manter intacta |

## O que reescrever / substituir (só no runtime Tauri)

| Item atual | Papel | Substituto Tauri |
|---|---|---|
| `server.js` | API REST no Node | Comandos Rust + `api.js` |
| `pdf-export.js` + `puppeteer-core` | PDF no Node | `pdf-build.js` + `export_pdf` (Rust) |
| `launch-app.js` | Abre browser + servidor (fallback Node) | Janela Tauri nativa |
| `POST /api/shutdown` | Encerra Node | Fechar janela |

**Mantidos em ambos os deploys:** `abrir-auto-orcamento.bat`, `native_launcher.py`, `launch-app.js`, `server.js` (fluxo Node); `index.html`, `app.js`, `api.js`, `styles.css`, `assets/`, `data/`.

## Mapa API → comandos Tauri (rascunho)

| Hoje (`fetch`) | Comando Tauri proposto |
|---|---|
| `GET/POST/DELETE /api/cirurgias` | `history_list`, `history_add`, `history_remove` |
| Idem hospitais, pacientes | Mesmo padrão, arquivo diferente |
| `PUT /api/pagamentos` (+ POST/DELETE) | `history_reorder` + add/remove |
| Idem observações, extras | Mesmo padrão |
| `GET/POST/DELETE /api/tecnologias` | `technologies_*` (objetos `{ nome, valor }`) |
| `POST /api/pdf` | `export_pdf({ patientName, documentHtml })` |
| `GET data/tabelas-hospitalares.json` | `table_load({ table: "hospitalares" })` |

## Fases sugeridas

### Fase 1 — Scaffold Tauri ✅

- [x] Projeto Tauri 2 em `src-tauri/`
- [x] Script `scripts/copy-frontend.cjs` copia `index.html`, `app.js`, `styles.css`, `assets/` e `data/` para `dist/`
- [x] WebView carrega o frontend estático (sem Node em runtime)
- [x] Janela maximizada; ícones do app a partir do **G** ornamental (`assets/app-icon-g.png`)
- [x] Pipeline de ícone: `scripts/build-app-icon-square.ps1` → `assets/app-icon-square.png` → `npm run icon:generate` → `src-tauri/icons/` (`.ico`, PNGs, favicon)
- [x] Badge circular preto (diâmetro = slot do ícone; cantos transparentes); G dourado centralizado (`logoFillRatio` = `0.70` em `build-app-icon-square.ps1`)
- [x] Build `.exe` standalone (`npm run tauri:build`; `bundle.active = false`, sem NSIS/MSI)
- [x] `build-auto-orcamento-tauri.bat`: build + cópia para `auto-orcamento.exe` na raiz
- [x] Tabelas de referência via `table_load`, lidas de `data/` externo (seed único do build se ausentes)

Comandos:

```bash
npm run tauri:dev      # desenvolvimento rápido (debug)
npm run tauri:build    # gera .exe release e copia auto-orcamento.exe para a raiz
npm run icon:generate  # regenera ícones a partir de assets/app-icon-g.png
```

Atalho Windows:

| Arquivo | Função |
|---|---|
| `abrir-auto-orcamento.bat` | Web app via Node + WebView2 (`native_launcher.py`; fallback Chrome) |
| `build-auto-orcamento-tauri.bat` | Build release, copia `auto-orcamento.exe` para a raiz |

### Fluxo de distribuição (repo completo)

```text
Máquina de dev                          Outro PC
────────────────                        ────────
1. Editar código
2. build-auto-orcamento-tauri.bat
3. Copiar repo (auto-orcamento.exe + data/)  →  4. Duplo clique em auto-orcamento.exe
```

Saída do build:

```text
auto-orcamento.exe                            # raiz (scripts/copy-release-exe.cjs; .gitignore)
src-tauri/target/release/auto-orcamento.exe   # artefato Rust
```

Requisitos de build: Node.js, Rust (via `rustup`) e WebView2 (já presente no Windows 10/11).

**Espaço em disco:** `src-tauri/target/` acumula artefatos de compilação (vários GB após `tauri:dev` repetido). Está no `.gitignore`. Para limpar: `cd src-tauri && cargo clean`. Não copie `target/` ao mover o repo — inclua `auto-orcamento.exe` na raiz.

### Fase 2 — Persistência ✅

- [x] Comandos Rust em `src-tauri/src/storage.rs` e `commands.rs` para ler/gravar `data/*.json`
- [x] Permissões IPC em `src-tauri/permissions/storage-commands.toml`
- [x] Camada `api.js` com fallback HTTP para a stack Node (`AppApi`)
- [x] `app.js` migrado para `AppApi` em todas as rotas `/api/*` de histórico
- [x] `withGlobalTauri: true` em `tauri.conf.json` e `waitForBackend()` antes da inicialização
- [x] PDF automático (`export_pdf`) — Fase 3

Comandos expostos:

| Comando Tauri | Equivalente Node |
|---|---|
| `history_list` | `GET /api/{store}` |
| `history_add` | `POST /api/{store}` |
| `history_remove` | `DELETE /api/{store}` |
| `history_replace` | `PUT /api/{store}` |
| `technologies_list` | `GET /api/tecnologias` |
| `technologies_add` | `POST /api/tecnologias` |
| `technologies_remove` | `DELETE /api/tecnologias` |
| `technologies_replace` | `PUT /api/tecnologias` |
| `zoom_get` / `zoom_set` / `zoom_adjust` | — (apenas Tauri; salvo em `data/settings.json`) |
| `table_load` | `GET data/tabelas-hospitalares.json` / `tabela-implantes.json` |
| `export_pdf` | `POST /api/pdf` |

Em desenvolvimento (`tauri dev`), `data/` e `output/` ficam na raiz do projeto. No `.exe` de release, `paths.rs` usa `std::env::current_exe()` e resolve:

1. **Repo completo:** `.exe` na raiz do projeto ou em `src-tauri/target/release/` → `data/` e `output/` na raiz do repo.
2. **Portátil mínimo:** só `{pasta-do-exe}/data/` e `{pasta-do-exe}/output/`.

Não há fallback para `%AppData%`. O startup registra `Diretório de dados: ...` no log.

Preferências de zoom (`settings.json`) seguem o mesmo diretório `data/`.

**Zoom nativo:** `zoom.js` escuta `Ctrl` + roda e `Ctrl` + `+`/`-`/`0`; o Rust aplica `WebviewWindow::set_zoom` e persiste o fator entre sessões. O indicador `#zoomFlag` (canto inferior direito) espelha o popup do Chrome: porcentagem, `−`/`+` e **Redefinir**.

Tabelas de referência (hospitalares, implantes) são lidas de `data/` via `table_load` — na raiz do repo quando o `.exe` está dentro do projeto, ou ao lado do `.exe` em layout portátil mínimo. Se o arquivo ainda não existir no primeiro run, o app copia a versão embutida no build (seed único); depois disso, edições manuais no JSON valem sem rebuild.

**Nota:** o Tauri 2 exige `app.withGlobalTauri: true` para expor `window.__TAURI__.core.invoke`. O `api.js` aguarda essa API em `waitForBackend()` e, fora do `localhost:3000`, **não** assume modo Node — evita históricos vazios por `fetch("/api/...")` falho no `.exe`.

### Fase 3 — PDF ✅

- [x] `pdf-build.js` monta HTML autocontido (CSS/fontes/imagens inline), igual ao `pdf-export.js`
- [x] Comando Rust `export_pdf` em `src-tauri/src/pdf.rs` grava em `output/` com nomes e colisão `(2)`, `(3)`
- [x] Renderização via Chrome/Edge headless (`--print-to-pdf`), sem Node/Puppeteer em runtime no Tauri
- [x] `AppApi.exportPdf()` no frontend; stack Node continua usando `POST /api/pdf`

PDFs ficam em `output/` na raiz do repo (mesma regra de caminho que `data/`). Requer Chrome ou Edge instalado (mesmo requisito prático da stack Node).

### Fase 4 — Empacotamento Windows (em andamento)

- [x] Build `.exe` standalone sem instaladores (`bundle.active = false`)
- [x] `build-auto-orcamento-tauri.bat`: build + cópia para raiz
- [x] `data/` e `output/` unificados na raiz do repo (`paths.rs` + `table_load`)
- [x] Documentação de fluxo e requisitos (WebView2, Chrome/Edge para PDF)
- [ ] Testar em PC limpo (sem Node/Rust)

### Fase 5 — Paridade e corte
- Checklist funcional contra `docs/SNAPSHOT-node-web-v0.1.0.md` **nos dois deploys** (Node + Tauri).
- Manter branch `stable/node-web-v0.1.0` intacta.
- **Não** deprecar `server.js` / `abrir-auto-orcamento.bat` enquanto ambos os fluxos forem necessários; Tauri é deploy adicional, não substituto obrigatório.

## Critérios de aceite (paridade)

- [ ] Todas as seções do formulário funcionam igual.
- [ ] Preview paginado idêntico (timbrado, fontes, rodapé).
- [ ] Autofill Regina e Sapiranga com mesmos multiplicadores e ordens.
- [x] Históricos persistem em `data/*.json` no mesmo formato.
- [x] Drag-and-drop de listas rápidas persiste ordem.
- [x] PDF automático em `output/` no clique de imprimir (Tauri via `export_pdf`; Node via `/api/pdf`).
- [x] Tabelas editáveis em `data/` sem rebuild (`table_load`).
- [ ] App abre offline, sem `npm install` no PC de destino.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| PDF com layout diferente | Baseline visual do snapshot; comparar PDFs lado a lado |
| WebView2 ausente em Windows antigo | Win 10/11 já incluem; sem instalador bundler — instalar WebView2 Runtime manualmente se necessário |
| `fetch` espalhado em `app.js` | Camada `api.js` (`AppApi`) abstrai HTTP vs Tauri; resolvido na Fase 2 |
| `window.__TAURI__` indisponível no load | `withGlobalTauri: true` + `waitForBackend()`; sem fallback HTTP fora da porta 3000 |
| `.exe` lê pasta `data/` errada | `paths.rs` usa `current_exe()`; repo root quando `.exe` está no projeto; log `Diretório de dados` no startup |
| Regressão no autofill | Testes manuais com casos Regina/Sapiranga documentados |

## Branch strategy

```text
main                         -> histórico; ainda sem merge completo do Tauri
stable/node-web-v0.1.0       -> versão Node congelada (pré-migração Tauri)
stable/tauri-v0.2.0-paused   -> migração Tauri congelada (Fases 1–3; tag v0.2.0-tauri-paused)
feature/tauri                -> branch de trabalho: web app partilhado + código Tauri no repo
```

**Estagnação (2026-06-18):** a migração **não** foi abandonada — foi **congelada** num snapshot. O uso diário volta ao **`abrir-auto-orcamento.bat`**. Ao retomar o Tauri, parta de `stable/tauri-v0.2.0-paused` ou continue em `feature/tauri` e rode `build-auto-orcamento-tauri.bat` / `tauri:dev`.

Para restaurar só o Node pré-Tauri:

```bash
git checkout stable/node-web-v0.1.0
npm install
```

Para restaurar o estado Tauri congelado:

```bash
git checkout stable/tauri-v0.2.0-paused
npm install
npm run tauri:build   # ou build-auto-orcamento-tauri.bat
```

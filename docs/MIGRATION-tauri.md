# Plano de migração para Tauri

> **Status:** Fase 3 concluída — PDF automático via `export_pdf` (Rust + Chrome/Edge headless); Fases 4–5 pendentes.  
> **Baseline Node:** `stable/node-web-v0.1.0` / tag `v0.1.0-node-web` / `docs/SNAPSHOT-node-web-v0.1.0.md`

## Objetivo

Substituir a stack **Node.js + Chrome/Edge manual** por um **executável desktop** que:

- abre o app sem instalar Node;
- persiste históricos e tabelas em `data/` como hoje;
- gera PDFs em `output/` com paridade visual;
- funciona offline após o setup inicial.

## O que reaproveitar (~90% do frontend)

| Item | Ação |
|---|---|
| `index.html` | Manter; ajustar caminhos se necessário |
| `styles.css` | Manter |
| `app.js` | Manter; trocar `fetch("/api/...")` por comandos Tauri |
| `data/*.json` | Manter formato e localização |
| `assets/*` | Manter |
| Lógica de preview, paginação, autofill | Manter intacta |

## O que reescrever / substituir

| Item atual | Substituto Tauri |
|---|---|
| `server.js` | Comandos Rust (`read_json`, `write_json`, handlers por recurso) |
| `pdf-export.js` + `puppeteer-core` | PDF via WebView print, biblioteca Rust, ou plugin Tauri |
| `launch-app.js` | Desnecessário — a janela é do próprio Tauri |
| `abrir-auto-orcamento.bat` | `.exe` gerado pelo build Tauri |
| `POST /api/shutdown` | Fechar janela encerra o app nativamente |

## Mapa API → comandos Tauri (rascunho)

| Hoje (`fetch`) | Comando Tauri proposto |
|---|---|
| `GET/POST/DELETE /api/cirurgias` | `history_list`, `history_add`, `history_remove` |
| Idem hospitais, pacientes | Mesmo padrão, arquivo diferente |
| `PUT /api/pagamentos` (+ POST/DELETE) | `history_reorder` + add/remove |
| Idem observações, extras | Mesmo padrão |
| `GET/POST/DELETE /api/tecnologias` | `technologies_*` (objetos `{ nome, valor }`) |
| `POST /api/pdf` | `export_pdf({ patientName, documentHtml })` |
| `GET data/tabelas-hospitalares.json` | Servir via asset ou comando `load_table` |

## Fases sugeridas

### Fase 1 — Scaffold Tauri ✅

- [x] Projeto Tauri 2 em `src-tauri/`
- [x] Script `scripts/copy-frontend.cjs` copia `index.html`, `app.js`, `styles.css`, `assets/` e `data/` para `dist/`
- [x] WebView carrega o frontend estático (sem Node em runtime)
- [x] Janela maximizada; ícones do app a partir do **G** ornamental (`assets/app-icon-g.png`)
- [x] Pipeline de ícone: `scripts/build-app-icon-square.ps1` → `assets/app-icon-square.png` → `npm run icon:generate` → `src-tauri/icons/` (`.ico`, PNGs, favicon)
- [x] Badge circular preto (diâmetro = slot do ícone; cantos transparentes); G dourado centralizado (`logoFillRatio` em `build-app-icon-square.ps1`)
- [x] Build Windows: `.exe`, `.msi` e instalador NSIS
- [x] Tabelas estáticas (`data/tabelas-hospitalares.json`, `data/tabela-implantes.json`) servidas via `dist/data/`

Comandos:

```bash
npm run tauri:dev      # desenvolvimento
npm run tauri:build    # gera .exe e instaladores
```

Atalho Windows: `abrir-auto-orcamento-tauri.bat`

Saída do build:

```text
src-tauri/target/release/auto-orcamento.exe
src-tauri/target/release/bundle/nsis/Auto Orçamento_0.1.0_x64-setup.exe
src-tauri/target/release/bundle/msi/Auto Orçamento_0.1.0_x64_en-US.msi
```

Requisitos de build: Node.js, Rust (via `rustup`) e WebView2 (já presente no Windows 10/11).

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
| `zoom_get` / `zoom_set` / `zoom_adjust` | — (apenas Tauri; salvo em `data/settings.json`) |
| `export_pdf` | `POST /api/pdf` |

Em desenvolvimento (`tauri dev`), os JSON mutáveis ficam em `data/` na raiz do projeto. No `.exe` de release, ficam em `{pasta-do-exe}/data/`. Preferências de zoom (`settings.json`) seguem o mesmo diretório.

**Zoom nativo:** `zoom.js` escuta `Ctrl` + roda e `Ctrl` + `+`/`-`/`0`; o Rust aplica `WebviewWindow::set_zoom` e persiste o fator entre sessões. O indicador `#zoomFlag` (canto inferior direito) espelha o popup do Chrome: porcentagem, `−`/`+` e **Redefinir**.

Tabelas de referência (hospitalares, implantes) continuam sendo carregadas pelo frontend via `fetch("data/...")` a partir de `dist/data/`, copiado por `scripts/copy-frontend.cjs`.

**Nota:** o Tauri 2 exige `app.withGlobalTauri: true` para expor `window.__TAURI__.core.invoke` ao JavaScript vanilla. O `api.js` aguarda essa API antes de carregar históricos, evitando chamadas `fetch("/api/...")` que não existem fora do Node.

### Fase 3 — PDF ✅

- [x] `pdf-build.js` monta HTML autocontido (CSS/fontes/imagens inline), igual ao `pdf-export.js`
- [x] Comando Rust `export_pdf` em `src-tauri/src/pdf.rs` grava em `output/` com nomes e colisão `(2)`, `(3)`
- [x] Renderização via Chrome/Edge headless (`--print-to-pdf`), sem Node/Puppeteer em runtime no Tauri
- [x] `AppApi.exportPdf()` no frontend; stack Node continua usando `POST /api/pdf`

Em desenvolvimento, PDFs ficam em `{projeto}/output/`. No `.exe`, em `{pasta-do-exe}/output/`. Requer Chrome ou Edge instalado (mesmo requisito prático da stack Node).

### Fase 4 — Empacotamento Windows
- Build `.exe` / instalador MSI/NSIS.
- Documentar requisito WebView2 (já presente no Windows 10/11).
- Testar em PC limpo.

### Fase 5 — Paridade e corte
- Checklist funcional contra `docs/SNAPSHOT-node-web-v0.1.0.md`.
- Manter branch `stable/node-web-v0.1.0` intacta.
- Deprecar `server.js` / `launch-app.js` na branch principal quando estável.

## Critérios de aceite (paridade)

- [ ] Todas as seções do formulário funcionam igual.
- [ ] Preview paginado idêntico (timbrado, fontes, rodapé).
- [ ] Autofill Regina e Sapiranga com mesmos multiplicadores e ordens.
- [x] Históricos persistem em `data/*.json` no mesmo formato.
- [x] Drag-and-drop de listas rápidas persiste ordem.
- [x] PDF automático em `output/` no clique de imprimir (Tauri via `export_pdf`; Node via `/api/pdf`).
- [ ] App abre offline, sem `npm install` no PC de destino.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| PDF com layout diferente | Baseline visual do snapshot; comparar PDFs lado a lado |
| WebView2 ausente em Windows antigo | Instalador WebView2 bootstrapper no setup |
| `fetch` espalhado em `app.js` | Camada `api.js` (`AppApi`) abstrai HTTP vs Tauri; resolvido na Fase 2 |
| `window.__TAURI__` indisponível no load | `withGlobalTauri: true` + `AppApi.waitForBackend()` antes do init |
| Regressão no autofill | Testes manuais com casos Regina/Sapiranga documentados |

## Branch strategy

```text
main                  -> desenvolvimento (incluirá Tauri)
stable/node-web-v0.1.0 -> versão Node congelada (não receber Tauri)
feature/tauri         -> opcional: trabalho isolado antes de merge em main
```

Para iniciar a migração:

```bash
git checkout main
git checkout -b feature/tauri
# seguir Fase 1
```

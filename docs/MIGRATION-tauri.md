# Plano de migração para Tauri

> **Status:** Fase 1 concluída — scaffold Tauri 2 com WebView carregando o frontend estático.  
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
| `POST /api/pdf` | `export_pdf({ patientName, html })` |
| `GET data/tabelas-hospitalares.json` | Servir via asset ou comando `load_table` |

## Fases sugeridas

### Fase 1 — Scaffold Tauri ✅

- [x] Projeto Tauri 2 em `src-tauri/`
- [x] Script `scripts/copy-frontend.cjs` copia `index.html`, `app.js`, `styles.css`, `assets/` e `data/` para `dist/`
- [x] WebView carrega o frontend estático (sem Node em runtime)
- [x] Janela maximizada, ícones gerados a partir do timbrado
- [x] Build Windows: `.exe`, `.msi` e instalador NSIS
- [ ] Históricos via `/api/*` ainda não funcionam (esperado — Fase 2)
- [ ] PDF automático ainda não funciona (esperado — Fase 3)

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

### Fase 2 — Persistência
- Implementar leitura/gravação JSON equivalente a `server.js`.
- Migrar chamadas de histórico em `app.js` para `@tauri-apps/api`.
- Testar paridade com arquivos em `data/`.

### Fase 3 — PDF
- Replicar `pdf-export.js`: HTML autocontido + renderização.
- Opções: `tauri-plugin-print`, crate Rust (`printpdf`, `headless_chrome` embutido), ou export via WebView.
- Validar nomes de arquivo e colisão `(2)`, `(3)`.

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
- [ ] Históricos persistem em `data/*.json` no mesmo formato.
- [ ] Drag-and-drop de listas rápidas persiste ordem.
- [ ] PDF automático em `output/` no clique de imprimir.
- [ ] App abre offline, sem `npm install` no PC de destino.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| PDF com layout diferente | Baseline visual do snapshot; comparar PDFs lado a lado |
| WebView2 ausente em Windows antigo | Instalador WebView2 bootstrapper no setup |
| `fetch` espalhado em `app.js` | Camada fina `api.js` que abstrai HTTP vs Tauri |
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

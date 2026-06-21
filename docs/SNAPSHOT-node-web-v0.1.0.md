# Snapshot — stack Node.js + browser (v0.1.0)

Este documento registra o estado estável do **Auto Orçamento** antes da migração para Tauri.

| Campo | Valor |
|---|---|
| Versão (`package.json`) | `0.1.0` |
| Commit de referência | `88a732b` — *Apply Regina autofill value ordering and progressive multipliers.* |
| Branch estável | `stable/node-web-v0.1.0` |
| Tag | `v0.1.0-node-web` |
| Data do snapshot | 2026-06-18 |
| Stack | HTML + CSS + JavaScript + Node.js + Chrome/Edge |

## Propósito

Preservar uma referência completa de como o app funciona hoje: arquivos, dependências, APIs, dados, comportamentos e limitações. Use este snapshot para:

- restaurar a versão Node caso a migração Tauri precise ser revertida;
- comparar paridade funcional durante a migração;
- instalar o app em outro PC com a stack atual.

## Arquitetura em execução

```text
abrir-auto-orcamento.bat
  -> npm install (se node_modules ausente)
  -> node launch-app.js
      -> node server.js (porta 3000)
      -> Chrome ou Edge em modo app (--app=http://localhost:3000)
          -> index.html + styles.css + app.js
          -> fetch /api/* e data/*.json
```

Fluxo alternativo manual:

```text
npm install && npm start
  -> abrir http://localhost:3000 em qualquer navegador
```

## Requisitos de runtime

| Recurso | Obrigatório | Observação |
|---|---|---|
| Node.js LTS | Sim | Executa `server.js` e `launch-app.js` |
| npm | Sim | Incluído com Node; instala `puppeteer-core` |
| Google Chrome ou Microsoft Edge | Sim | Janela do app e geração de PDF |
| Internet | Só no primeiro setup | Apenas para `npm install` se `node_modules` não existir |
| Python | Não | Só citado na doc de extração de tabelas PDF |
| PowerShell 7 | Não | Recomendado para desenvolvimento no Cursor |
| Git | Não | Só para clonar/versionar |

## Inventário de arquivos principais

### Código e launcher

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura do formulário e da pré-visualização |
| `styles.css` | Layout, timbrado A4, impressão, drag-and-drop |
| `app.js` | Toda a lógica de UI, preview, históricos, autofill, PDF client-side |
| `server.js` | Servidor HTTP, APIs REST, gravação JSON, rota PDF |
| `pdf-export.js` | Renderização PDF via `puppeteer-core` + Chrome/Edge |
| `launch-app.js` | Inicia servidor, abre browser em modo app, encerra ao fechar |
| `abrir-auto-orcamento.bat` | Atalho Windows (CMD) |
| `package.json` | Metadados; dependência única: `puppeteer-core` |

### Dados

| Arquivo | Tipo | Versionado |
|---|---|---|
| `data/cirurgias.json` | Histórico + ordem no dropdown Cirurgia | Sim |
| `data/hospitais.json` | Histórico + ordem no dropdown Hospital | Sim |
| `data/pacientes.json` | Histórico + ordem no dropdown Nome | Sim |
| `data/pagamentos.json` | Histórico + ordem (dropdown e lista rápida) | Sim |
| `data/observacoes.json` | Histórico + ordem (dropdown e lista rápida) | Sim |
| `data/extras.json` | Histórico + ordem (dropdown e lista rápida) | Sim |
| `data/tecnologias.json` | Histórico (`nome` + `valor`) + ordem no dropdown | Sim |
| `data/tabelas-hospitalares.json` | Tabela Regina + Sapiranga | Sim |
| `data/tabela-implantes.json` | Tabela de implantes | Sim |
| `output/*.pdf` | PDFs gerados automaticamente | Não (`.gitignore`) |

### Assets

| Caminho | Uso |
|---|---|
| `assets/papel-timbrado.png` | Fundo do documento na tela e no PDF |
| `assets/app-icon-g.png` | **G** ornamental (fonte do ícone; recorte do timbrado) |
| `assets/app-icon-square.png` | Arte 1024×1024 gerada (círculo preto + G; entrada do `tauri icon`) |
| `assets/favicon.png` | Favicon 32×32 (cópia de `src-tauri/icons/32x32.png`) |
| `assets/papel-timbrado.pdf` | Referência do timbrado original |
| `assets/fonts/gotham/*.otf` | Fonte principal do documento |
| `assets/fonts/cinzel/*.ttf` | Fonte de títulos |

## API local (`http://localhost:3000`)

| Endpoint | Métodos | Corpo / resposta |
|---|---|---|
| `/api/cirurgias` | GET, POST, DELETE, PUT | POST/DELETE: `{ value }`; PUT: `{ items: string[] }` |
| `/api/hospitais` | GET, POST, DELETE, PUT | POST/DELETE: `{ value }`; PUT: `{ items: string[] }` |
| `/api/pacientes` | GET, POST, DELETE, PUT | POST/DELETE: `{ value }`; PUT: `{ items: string[] }` |
| `/api/pagamentos` | GET, POST, DELETE, PUT | POST/DELETE: `{ value }`; PUT: `{ items: string[] }` |
| `/api/observacoes` | GET, POST, DELETE, PUT | Idem pagamentos |
| `/api/extras` | GET, POST, DELETE, PUT | Idem pagamentos |
| `/api/tecnologias` | GET, POST, DELETE, PUT | POST/DELETE: `{ nome, valor }`; PUT: `{ items: [{ nome, valor }] }` |
| `/api/pdf` | POST | `{ patientName, html }` → `{ filename, path }` |
| `/api/shutdown` | POST | Encerra o servidor |
| `/`, `/app.js`, `/styles.css`, `/data/*.json`, assets | GET | Arquivos estáticos |

Históricos simples: máximo **200 itens** por arquivo. Duplicatas ignoradas na gravação (normalização sem acentos, case-insensitive).

## Funcionalidades confirmadas nesta versão

- Formulário completo: paciente, cirurgia, hospital, implantes, tecnologias, equipe, extras, pagamento, observações.
- Pré-visualização paginada A4 com papel timbrado.
- Impressão via `window.print()` e PDF automático em `output/` no clique de **Imprimir orçamento**.
- Históricos locais com autocomplete e listas rápidas reordenáveis (extras, pagamento, observações).
- Drag-and-drop nos dropdowns de histórico (Nome, Cirurgia, Hospital, Tecnologias, Extras adicionais, Pagamento, Observações adicionais) com ordem persistida nos JSON; drag visual entre campos de cirurgia no formulário (só preview).
- Seções opcionais com checkbox: Hospital, Implantes, Tecnologias, Extras.
- Autofill Regina: pacotes por valor decrescente; multiplicadores `1` / `0.7` / `0.5` no preço; taxas adicionais no final; meia hora automática pelo tempo bruto.
- Autofill Sapiranga: centro por valor decrescente; multiplicadores `1` / `0.7` / `0.6`; ambulatório, excedente e diárias na ordem do JSON.
- Navegação por teclado: `Enter` escopado por seção dinâmica; `Shift+Enter` adiciona linha.
- Painel esquerdo redimensionável; scroll do preview preservado ao editar.

## Dependências npm

```json
{
  "dependencies": {
    "puppeteer-core": "^24.36.1"
  }
}
```

`puppeteer-core` **não** baixa Chromium; usa Chrome ou Edge já instalados no sistema.

## Como restaurar esta versão

```bash
git fetch origin
git checkout stable/node-web-v0.1.0
npm install
```

Depois:

- duplo clique em `abrir-auto-orcamento.bat`, ou
- `npm start` e acesse `http://localhost:3000`.

Para voltar ao ponto exato do snapshot via tag:

```bash
git checkout v0.1.0-node-web
```

## Limitações conhecidas (stack atual)

- Exige Node.js instalado no PC de destino.
- Exige Chrome ou Edge para abrir o app pelo `.bat` e para PDF automático.
- Servidor escuta apenas `localhost:3000` (uso local).
- Sem build step: o frontend roda como arquivos servidos diretamente.
- PDF depende de headless browser externo (`puppeteer-core`).
- Históricos ficam em JSON editáveis; não há criptografia nem multiusuário.

## Documentação relacionada

- `README.md` — guia de uso
- `ARCHITECTURE.md` — detalhes técnicos por módulo
- `docs/tabelas-hospitalares.md` — Regina e Sapiranga
- `docs/tabela-implantes.md` — implantes
- `docs/tabela-tecnologias.md` — tecnologias
- `docs/MIGRATION-tauri.md` — plano da migração Tauri (estagnada; ver `docs/SNAPSHOT-tauri-v0.2.0-paused.md`)

# Exportação SQLite (`export/orcamentos.sqlite`)

Espelho consolidado dos snapshots JSON da pasta de saída (`C:\auto-orcamento\output` no Windows; ver `server/paths.js`), para consumo por **outros webapps**.

O Auto Orçamento **não** usa este banco como fonte canônica: PDF e JSON na pasta de saída continuam a ser gerados, nomeados e abertos como antes.

## Fonte canônica vs espelho

| Artefato | Papel |
|---|---|
| `output/*.json` | **Canônico** — banco de arquivos do app; botão **Abrir**, APIs `/api/snapshots*` |
| `output/*.pdf` | Documento gerado na impressão |
| `EXPORT_DIR/orcamentos.sqlite` | **Espelho** — `C:\auto-orcamento\export\` (Atlas) ou `/data/auto-orcamento/export/` (axis-data no CT 100) |
| `../dados-clinica/import/orcamentos.sqlite` | **Entrega** só no **Atlas** (Windows); timbrado + fontes na mesma pasta `import/` |
| CT 100 (axis-data) | **Sem** entrega para dados-clinica — espelho permanece só em `export/` (`linuxUsesAxisDataBind()` em `export-sqlite.js`) |

## Quando é atualizado

1. **Na abertura do app** — ao subir `server/server.js` (após escutar a porta 3000).
2. **Automaticamente** após `POST /api/pdf` (clique em **Imprimir orçamento** no uso local) — depois de gravar PDF/JSON.
3. **Manualmente:** `npm run export:sqlite` (`scripts/consolidate-to-sqlite.js`).

No browser na tailnet (ex.: Axis via Serve), a impressão chama `/api/pdf` no servidor e atualiza `output/` + SQLite **no host que serve o app**. Ao **iniciar** o Node, a consolidação na abertura já espelha o `output/` local. Também se pode consolidar imprimindo ou rodando `npm run export:sqlite`.

Falhas na consolidação são registadas no log do servidor e **não** bloqueiam a impressão nem a gravação em `output/`.

## Estratégia de sincronização

A cada consolidação o banco é **reconstruído por completo**:

1. `DELETE FROM budgets`
2. Inserir uma linha por `output/*.json` válido

Se um JSON for apagado de `output/`, a entrada correspondente **desaparece** do SQLite na próxima consolidação. Não há tabela de histórico legado.

## Localização

```text
export/orcamentos.sqlite
C:\auto-orcamento\export\orcamentos.sqlite   (Windows; cópia na consolidação)
../dados-clinica/import/orcamentos.sqlite
```

A pasta `export/` está no `.gitignore` (como `output/`).
A cópia em `dados-clinica/import/` também fica fora do Git.

Após cada consolidação no **Atlas (Windows)**, entrega (push) para o dados-clinica:

| Origem | Destino |
|--------|---------|
| `export/orcamentos.sqlite` | `C:\auto-orcamento\export\orcamentos.sqlite` |
| `export/orcamentos.sqlite` | `../dados-clinica/import/orcamentos.sqlite` |
| `assets/papel-timbrado.pdf` / `.png` | `../dados-clinica/import/` |
| `assets/fonts/**` (Gotham / Cinzel) | `../dados-clinica/import/fonts/` |

No **CT 100** (bind `/data/auto-orcamento`), nenhuma linha acima — só o espelho em `export/orcamentos.sqlite` no Patriot.

Overrides:

| Variável | Efeito |
|----------|--------|
| `AUTO_ORCAMENTO_DELIVER_SQLITE` | Caminho absoluto do `.sqlite` de destino (`none` / `false` desliga); omitido no Axis |
| `AUTO_ORCAMENTO_DELIVER_IMPORT_DIR` | Pasta `import/` de destino (timbrado + fontes; só Atlas) |

Falha na entrega é registada e **não** falha a consolidação local.

O dados-clinica usa esses ficheiros na sessão **Orçamentos** (preview HTML do
documento a partir de `payload_json`, sem ler `output/*.pdf`).

## Schema (`budgets`)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INTEGER PK | Auto-incremento |
| `filename` | TEXT UNIQUE | Nome do arquivo JSON (ex.: `Maria da Silva - Abdominoplastia 2026-07-30 13-06-28.json`) |
| `patient_name` | TEXT | `form.patientName` |
| `first_surgery` | TEXT | Primeira cirurgia não vazia em `form.surgeries` |
| `created_at` | TEXT | Data/hora extraída do nome do arquivo (`YYYY-MM-DDTHH:MM:SS`) |
| `exported_at` | TEXT | `exportedAt` do snapshot (ISO, cliente) |
| `budget_date` | TEXT | `form.budgetDate` |
| `schema_version` | INTEGER | `schemaVersion` do snapshot |
| `payload_json` | TEXT | Snapshot completo (JSON em texto) |
| `source_mtime` | TEXT | `mtime` do ficheiro em ISO |
| `consolidated_at` | TEXT | Momento desta consolidação (ISO) |

Índices: `patient_name`, `created_at`, `first_surgery`.

## Código

| Arquivo | Função |
|---|---|
| `server/export-sqlite.js` | Lê `output/*.json`, regrava o SQLite e entrega cópia ao dados-clinica |
| `scripts/consolidate-to-sqlite.js` | CLI (`npm run export:sqlite`) |
| `server/server.js` | Chama consolidação no arranque (`listen`) e após `/api/pdf` |

Requisito: **Node.js 22.5+** com flag **`--experimental-sqlite`** (módulo `node:sqlite`; CT 100: `NODE_OPTIONS` na unit systemd; Atlas: Node 24 em desenvolvimento costuma expor o módulo sem flag extra).

## Exemplo de leitura (outro app)

```js
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("export/orcamentos.sqlite", { readOnly: true });
const rows = db.prepare(
  "SELECT filename, patient_name, first_surgery, created_at, payload_json FROM budgets ORDER BY created_at DESC",
).all();
db.close();
```

O payload completo está em `payload_json` — mesmo formato de `web/budget-snapshot.js` (`schemaVersion: 1`).
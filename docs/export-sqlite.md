# Exportação SQLite (`export/orcamentos.sqlite`)

Espelho consolidado dos snapshots JSON de `output/`, para consumo por **outros webapps**.

O Auto Orçamento **não** usa este banco como fonte canônica: PDF e JSON em `output/` continuam a ser gerados, nomeados e abertos como antes.

## Fonte canônica vs espelho

| Artefato | Papel |
|---|---|
| `output/*.json` | **Canônico** — banco de arquivos do app; botão **Abrir**, APIs `/api/snapshots*` |
| `output/*.pdf` | Documento gerado na impressão |
| `export/orcamentos.sqlite` | **Espelho** — reconstruído a partir de todos os JSON de `output/` |

## Quando é atualizado

1. **Automaticamente** após `POST /api/pdf` (clique em **Imprimir orçamento** no uso local) — depois de gravar PDF/JSON.
2. **Manualmente:** `npm run export:sqlite` (`scripts/consolidate-to-sqlite.js`).

No **acesso remoto** (Funnel), o cliente **não** chama `/api/pdf`; logo o SQLite **não** é atualizado por impressões remotas. Consolide no PC servidor (imprimir localmente ou rodar o script).

Falhas na consolidação são registadas no log do servidor e **não** bloqueiam a impressão nem a gravação em `output/`.

## Estratégia de sincronização

A cada consolidação o banco é **reconstruído por completo**:

1. `DELETE FROM budgets`
2. Inserir uma linha por `output/*.json` válido

Se um JSON for apagado de `output/`, a entrada correspondente **desaparece** do SQLite na próxima consolidação. Não há tabela de histórico legado.

## Localização

```text
export/orcamentos.sqlite
```

A pasta `export/` está no `.gitignore` (como `output/`).

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
| `server/export-sqlite.js` | Lê `output/*.json` e regrava o SQLite (`node:sqlite` / `DatabaseSync`) |
| `scripts/consolidate-to-sqlite.js` | CLI (`npm run export:sqlite`) |
| `server/server.js` | Chama consolidação após `/api/pdf` |

Requisito: **Node.js 22.5+** (módulo experimental `node:sqlite`; o projeto usa Node 24 em desenvolvimento).

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
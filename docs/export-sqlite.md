# Exportação SQLite (`export/orcamentos.sqlite`)

Espelho consolidado dos snapshots JSON da pasta de saída (`C:\auto-orcamento\output` no Windows; ver `server/paths.js`), para consumo por **outros webapps**.

O Auto Orçamento **não** usa este banco como fonte canônica: PDF e JSON na pasta de saída continuam a ser gerados, nomeados e abertos como antes.

## Fonte canônica vs espelho

| Artefato | Papel |
|---|---|
| `output/*.json` | **Canônico** — banco de arquivos do app; botão **Abrir**, APIs `/api/snapshots*` |
| `output/*.pdf` | Documento gerado na impressão |
| `EXPORT_DIR/orcamentos.sqlite` | **Espelho** — `C:\auto-orcamento\export\` (Atlas) ou `/data/auto-orcamento/export/` (axis-data no CT 100) |

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
C:\auto-orcamento\export\orcamentos.sqlite   (Windows; EXPORT_DIR padrão)
/data/auto-orcamento/export/orcamentos.sqlite   (CT 100, axis-data)
{repo}/export/orcamentos.sqlite   (dev sem override win32/axis-data)
```

A pasta `export/` no clone pode estar no `.gitignore` (como `output/`).

Override: `EXPORT_DIR` (caminho absoluto da pasta do espelho).

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
| `server/export-sqlite.js` | Lê `output/*.json` e regrava o SQLite em `EXPORT_DIR` |
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

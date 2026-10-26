# Schema v2 — catálogos em `data/` (UUID + label + mtime)

Históricos editados pelo app (blur, dropdown, reorder). Backup legado: [`../../backup-legado/README.md`](../../backup-legado/README.md).

## Arquivos v2 (Atlas + Axis alinhados em 2026-10-26)

| Arquivo | Conteúdo |
|---------|----------|
| `pacientes.json` | Nome do paciente |
| `cirurgias.json` | Cirurgias propostas |
| `hospitais.json` | Nomes de hospital |
| `pagamentos.json` | Formas de pagamento |
| `observacoes.json` | Observações adicionais |
| `extras.json` | Extras adicionais |
| `tecnologias.json` | Tecnologia + **`valor`** (R$) |
| `unimed-n.json` | Procedimento Unimed N + **`valor`** |

**Fora do v2:** `settings.json` (zoom, `lastSnapshotDir`) — objeto simples, sem catálogo UUID.

**Referência estática (sem API de histórico):** `tabelas-hospitalares.json`, `tabela-implantes.json`, `tabela-blanc-2026.json`.

## Envelope

```json
{
  "schemaVersion": 2,
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "label": "Maria Silva",
      "mtime": 1761493200123,
      "deleted": false
    }
  ]
}
```

| Campo | Tipo | Regras |
|-------|------|--------|
| `schemaVersion` | `2` | Obrigatório em v2 |
| `items` | array | Ordem = ordem do dropdown; inclui tombstones (`deleted: true`) |
| `id` | UUID v4 string | Imutável; não reutilizar após delete |
| `label` | string | Trim; visível na UI e no PDF |
| `mtime` | number | Epoch **ms** UTC; atualizar em create, rename, delete, reorder |
| `deleted` | boolean | Opcional; default `false`. `true` = tombstone (fora do GET/API ativa) |
| `valor` | string | Opcional; tecnologias e Unimed N (moeda como digitado na UI) |
| `checked` | boolean | Opcional; listas rápidas com checkbox em `pagamentos.json`, `observacoes.json`, `extras.json`. Ausente = tratado como `true` na UI; `false` persiste desmarcado entre sessões |

**Limite:** até **200** entradas ativas (`deleted !== true`). Tombstones não contam para o limite de exibição.

**API GET** (todas as rotas `/api/{store}` acima): `{ schemaVersion: 2, items: CatalogEntry[] }` só com itens ativos.

**POST** aceita `{ value }` (label), `{ id, label }` (upsert/rename), `{ id, label, checked }` (marcação das listas rápidas), ou `{ nome, valor }` (tecnologias / Unimed N — `nome` mapeia para `label`).

**PUT** `{ items: [{ id, label, checked? }] }` preserva `checked` por id ao reordenar (`pagamentos`, `observacoes`, `extras`).

## `mtime` — item vs arquivo

| Camada | Onde | Significado |
|--------|------|-------------|
| **Item** | `items[].mtime` | Epoch **ms** UTC (`Date.now()` no Node ao criar, renomear, apagar, reordenar). Usado no **merge por UUID** (lado com `mtime` maior vence; slop 1 s). Não há ano fixo no código — só números. |
| **Arquivo** | `st_mtime` do `.json` no disco | Hora da última gravação (`writeFileSync`). No reconcile v2 (`sync_catalog_v2.py`, local-atlas), pode ser ajustado com `utime` para `max(items[].mtime) / 1000` s, alinhando merge **por arquivo** Atlas↔Axis. |

## Tombstones (`deleted: true`)

Entradas apagadas **permanecem** no JSON com `deleted: true` (não são removidas do array). Motivo: no sync bidirecional, se o id sumisse de um lado, o merge reintroduziria a entrada ativa do outro. Tombstone + `mtime` propagam o delete. GET/API listam só itens ativos; tombstones não contam no limite de 200.

## Listas rápidas (`checked`)

Só em **`pagamentos.json`**, **`observacoes.json`** e **`extras.json`**: checkboxes da lista rápida (Extras padrão, Pagamento, Observações padrão).

- Ausente no JSON → UI trata como **marcado** (comportamento legado).
- `checked: false` → desmarcado na próxima abertura do app (persistido no catálogo, sync incluído).
- Toggle na UI → `POST` com `id`, `label` e `checked`; não altera o snapshot JSON do orçamento (`schemaVersion: 1`), que continua guardando o estado do formulário por arquivo em `output/`.

## Código

| Camada | Módulo |
|--------|--------|
| Node | `server/catalog-v2.js`, `server/catalog-http.js`, rotas em `server/server.js` |
| Web | `web/api.js` (`catalogEntryChecked`, `upsertCatalog`, `toCatalogPutItems`), `web/app.js` (blur, listas rápidas `checked`, reorder com id) |
| Sync | `local-atlas/axis/scripts/sync_catalog_v2.py` — push/pull unitário dos oito JSON |
| Migração | `node scripts/migrate-data-catalogs-v2.js` (todos os catálogos); `migrate-pacientes-schema-v2.js` mantido como alias do piloto |

## Legado

`[]`, `string[]` ou `[{ nome, valor }]` → `parseCatalogRaw` / migração no script ou na primeira leitura da API.

## Merge (`mergeCatalogV2`)

Constante `MTIME_SLOP_MS = 1000` (igual ao slop de arquivo em `sync_auto_orcamento_data.py`).

```text
mergeCatalogV2(localDoc, remoteDoc) -> { doc, conflicts[] }

  for each id in union(local.ids, remote.ids):
    pickEntry(L, R) by mtime (+ slop); delete tombstone vence se mtime maior
    on label conflict (empate mtime, labels diferentes): conflicts += id; keep local entry

  mergeOrder: ordem do lado com maior max(item.mtime); faltantes no fim por mtime desc

  doc.items = active in order ++ all tombstones from merged map
```

**Startup (`merge_member`):** legado vs v2 com mtime de arquivo empate e tamanho diferente → conflito. Dois lados **v2** com o **mesmo catálogo** (digest JSON canônico) mas bytes diferentes → **sem conflito** (`catalogs_semantically_equal` em `sync_catalog_v2.py`, local-atlas).

## Bootstrap no Axis (one-shot)

Depois de migrar no Atlas, enviar v2 ao CT **sem merge** (sobrescreve legado):

```powershell
# local-atlas — repetir por arquivo ou em loop
py -3 .\axis\scripts\sync_auto_orcamento.py --push-force-relative data/cirurgias.json
```

Uso pontual (cutover). O uso diário: `--push-relative` / blur → `merge_catalog_v2`.

## Relacionado

- [`data-uuid-migration.md`](data-uuid-migration.md)
- [`axis-data-live-sync.md`](axis-data-live-sync.md)

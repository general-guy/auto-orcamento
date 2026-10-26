# Schema v2 — catálogos em `data/` (UUID + label + mtime)

Piloto: [`pacientes.json`](../../server/server.js). Backup legado: [`../../backup-legado/README.md`](../../backup-legado/README.md).

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

**Limite:** até **200** entradas ativas (`deleted !== true`). Tombstones não contam para o limite de exibição.

**API GET** devolve `{ schemaVersion: 2, items: CatalogEntry[] }` só com itens ativos.

**mtime do arquivo no sync:** `max(items[].mtime)` (ver merge no Python).

## Legado

`[]` ou `string[]` → migrar com `scripts/migrate-pacientes-schema-v2.js` ou na primeira leitura do servidor.

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

Implementação: `local-atlas/axis/scripts/sync_catalog_v2.py` — ramo em `data/pacientes.json` no push/pull unitário.

**Startup (`merge_member`):** enquanto o Axis ainda tiver `pacientes.json` legado e o Atlas v2 com o **mesmo mtime** de arquivo (±1 s) e **tamanho diferente**, o merge em massa marca **conflito** (toast amarelo) sem sobrescrever — migrar o Axis ou alinhar com push manual após resolver.

## Relacionado

- [`data-uuid-migration.md`](data-uuid-migration.md)
- [`axis-data-live-sync.md`](axis-data-live-sync.md)

# `output/` — índice e tombstones (`orcamentos-index.json`)

Orçamentos impressos geram par `.pdf` + `.json` em `output/` (subpastas permitidas). O sync Atlas↔Axis **não** inferia apagado manual: arquivo só no Axis era puxado de volta no `--startup`.

## Arquivo

| Caminho | Função |
|---------|--------|
| `output/orcamentos-index.json` | `schemaVersion: 1`, `items[]` com `id`, `json`, `pdf` (relativos a `output/`), `mtime` (ms UTC), `deleted` |

Sync do índice: merge por `id` no motor Python (`sync_output_index.py`, local-atlas), mesmo espírito dos catálogos v2 em `data/`.

## App (Node + UI)

| Ação | Comportamento |
|------|----------------|
| Impressão | `server/output-index.js` registra/atualiza o par no índice |
| **Abrir** (Atlas e Axis / tailnet) | Modal `#snapshotPicker` — lista recursiva, **Excluir** por linha |
| `DELETE /api/snapshots/{caminho.json}` | Tombstone + remove pdf/json locais (**Lixeira no Windows/Atlas**; **permanente no Linux/CT**) + SQLite + push do índice + notify |

**Abrir** no Atlas deixou de usar o diálogo nativo (`/api/open-snapshot`) no fluxo normal — mesmo modal que na tailnet.

Apagar pelo **Explorer** não grava tombstone; o sync pode reintroduzir arquivos. Use **Excluir** no modal.

## Motor Python (local-atlas)

- `output/orcamentos-index.json` → `reconcile_output_index_relative` (pull/push unitário e merge de `output` no startup).
- Após merge: `apply_deletions_from_doc` remove pdf/json locais e no Patriot para itens `deleted: true`.
- `try_sync_tombstone_instead_of_pull`: se o índice local marca apagado, não faz pull do par — remove no remoto.

## Backfill (instalações com pares antigos)

No clone, com disco ao vivo montado:

```powershell
node scripts/backfill-output-index.js
```

O arranque do servidor também chama `ensureIndexCoversDisk` (só adiciona entradas para JSON no disco que ainda não estão no índice).

## Recuperar caso “apaguei no Explorer”

1. Se os arquivos ainda existem só no Axis: abrir o app no CT, **Excluir** no modal (ou apagar no Patriot e alinhar índice manualmente).
2. Se voltaram ao Atlas após startup: **Excluir** no modal no Atlas para tombstone + sync propagar ao Axis.

Runbook geral: [`../atlas-axis-sync.md`](../atlas-axis-sync.md). UI: [`axis-sync-ui.md`](axis-sync-ui.md).

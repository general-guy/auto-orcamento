# Migração `data/` — schema UUID (catálogos)

**Estado (2026-10-26):** os oito históricos de blur estão em **schema v2** no Atlas (`C:\auto-orcamento\data\`) e no Axis (push-force de cutover + merge diário por UUID). Especificação: [`data-schema-v2.md`](data-schema-v2.md).

**Ainda v1:** `settings.json` apenas.

## Backup antes de migrar

Foto do schema legado ao vivo:

- Pasta: [`../../backup-legado/pre-uuid-migration/`](../../backup-legado/pre-uuid-migration/) (gitignored)
- Como gerar: [`../../backup-legado/README.md`](../../backup-legado/README.md) → `pwsh -File scripts/backup-live-data-legado.ps1`

Não confundir com [`../../seed/data/`](../../seed/data/) (seed versionado no Git, não espelho do disco ao vivo).

## Como migrar / alinhar Axis

```powershell
# No clone auto-orcamento (disco ao vivo)
node scripts/migrate-data-catalogs-v2.js

# No local-atlas — uma vez por arquivo após migrar só no Atlas
py -3 .\axis\scripts\sync_auto_orcamento.py --push-force-relative data/<arquivo>.json
```

Depois: blur e `--push-relative` usam merge por `id` (`sync_catalog_v2.py`).

## Conflitos

Mesmo `id`, `mtime` de item empate (±1 s), `label` diferente → toast / entrada local mantida nos ids em conflito.

Conflito de **arquivo** no startup (legado vs v2, mesmo mtime de arquivo): ver [`data-schema-v2.md`](data-schema-v2.md) e [`axis-sync-sessions.md`](axis-sync-sessions.md).

## Relacionado

- Sync ao vivo: [`axis-data-live-sync.md`](axis-data-live-sync.md)
- Caminhos: [`output-path.md`](output-path.md)

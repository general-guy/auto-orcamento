# Migração `data/` — schema UUID

**Piloto em andamento:** `pacientes.json` (schema v2). Especificação: [`data-schema-v2.md`](data-schema-v2.md).

Demais históricos ainda em `string[]` até as fases 2–3. Modelo alvo: **`id` (UUID)**, **`label`**, **`mtime`** (ms) por entrada.

## Backup antes de migrar

Foto do schema legado ao vivo:

- Pasta: [`../../backup-legado/pre-uuid-migration/`](../../backup-legado/pre-uuid-migration/) (gitignored)
- Como gerar: [`../../backup-legado/README.md`](../../backup-legado/README.md) → `pwsh -File scripts/backup-live-data-legado.ps1`

Não confundir com [`../../seed/data/`](../../seed/data/) (seed versionado no Git, não espelho do disco ao vivo).

## Escopo previsto (rascunho)

| Fase | Conteúdo |
|------|----------|
| 1 | Piloto em um arquivo (ex. `pacientes.json`) + merge Python por `id` |
| 2 | Cirurgias, hospitais, pagamentos, observações, extras |
| 3 | `tecnologias.json` / `unimed-n.json` (adicionar `id` + `mtime`) |
| 4 | UI: dropdown por label, `data-uuid` nos inputs, blur = upsert |

Conflito: mesmo `id`, `mtime` empate, `label` diferente → toast / resolução manual.

## Relacionado

- Sync ao vivo hoje: [`axis-data-live-sync.md`](axis-data-live-sync.md)
- Caminhos: [`output-path.md`](output-path.md)

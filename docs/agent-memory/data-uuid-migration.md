# Migração `data/` — schema UUID (planejado)

Estado **futuro**: históricos e listas editáveis passam de `string[]` (ou objetos sem id) para entradas com **`id` (UUID)**, **`label`** (texto visível) e **`mtime`** (ms ou ISO), para merge por item entre Atlas e Axis.

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

# Backup legado de `data/` (pré-migração UUID)

Foto do disco **ao vivo** antes de migrar históricos para o modelo `id` + `label` + `mtime` por entrada.

## O que é copiado

| Origem (padrão) | Destino no repo |
|-----------------|-----------------|
| `C:\auto-orcamento\data\` | `backup-legado/pre-uuid-migration/` |

Override: variável de ambiente `DATA_DIR` (mesma regra de `server/paths.js`).

O script gera `pre-uuid-migration/MANIFEST.json` com data UTC, caminho de origem, SHA-256 e tamanho de cada arquivo (schema legado: listas de strings nos históricos).

## Criar ou atualizar o backup

Feche o app se quiser evitar cópia durante gravação; em uso leve costuma ser aceitável.

```powershell
pwsh -File scripts/backup-live-data-legado.ps1
```

Reexecutar **substitui** todo o conteúdo de `pre-uuid-migration/`.

## Git

A pasta `pre-uuid-migration/` está no `.gitignore` — **não commitar** JSON clínicos. Versionados: este README e `scripts/backup-live-data-legado.ps1`.

## Restaurar (emergência)

Com o app fechado:

```powershell
$src = "C:\Users\geral\OneDrive\Documentos\2.Projetos\auto-orcamento\backup-legado\pre-uuid-migration"
$dst = "C:\auto-orcamento\data"
Copy-Item -Path (Join-Path $src "*") -Destination $dst -Recurse -Force
```

Revise `MANIFEST.json` antes; não copie o manifest para `data/` (opcional: exclua `MANIFEST.json` do destino).

## OneDrive

O clone do projeto está no OneDrive. O backup contém **dados sensíveis** e será sincronizado na nuvem se existir em disco. Mantenha consciência de compartilhamento da conta.

## Próximo passo

Migração UUID: [`docs/agent-memory/data-uuid-migration.md`](../docs/agent-memory/data-uuid-migration.md).

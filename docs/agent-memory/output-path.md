# Pasta de saída (PDF e snapshot JSON)

Decisão (2026-10-24): tirar `output/` do repositório no Windows para não depender do OneDrive nem do caminho do clone.

## Caminho canônico (Atlas / Windows)

```text
C:\auto-orcamento\output\
```

- Criada automaticamente pelo servidor na primeira impressão ou consolidação.
- Migração nesta sessão: conteúdo antigo de `{repo}/output/` movido para o caminho acima.

## Código

| Artefato | Função |
|---|---|
| `server/paths.js` | Resolve `outputDir` (e `repoRoot`, `data/`, `export/`) |
| `server/server.js` | Grava PDF/JSON, APIs `/api/snapshots*`, estáticos `/output/*`, diálogo **Abrir** |
| `scripts/open-snapshot-dialog.py` | Fallback de pasta inicial = `C:\auto-orcamento\output` |
| `scripts/consolidate-to-sqlite.js` | Lê JSON de `outputDir` |

## Override

Variável de ambiente **`OUTPUT_DIR`**: caminho absoluto da pasta de saída (útil no Axis ou outro deploy).

Sem `OUTPUT_DIR`:

- **win32:** `C:\auto-orcamento\output`
- **outros:** `{repoRoot}/output` (comportamento anterior no Linux)

## Settings

`data/settings.json` → `lastSnapshotDir`: pasta do último **Abrir**/impressão. O servidor remapeia o caminho legado `{repo}/output` para `outputDir` atual.

## Documentação relacionada

- `README.md` (uso e URLs)
- `docs/ARCHITECTURE.md` (roteamento estático e APIs)
- `docs/export-sqlite.md` (espelho a partir dos JSON de saída)
- `docs/acesso-remoto.md` / `docs/atlas-axis.md` (remoto e produção)

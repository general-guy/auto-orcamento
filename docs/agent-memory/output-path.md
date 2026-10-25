# Dados ao vivo fora do repo (Atlas / Windows)

Decisão (2026-10-25): concentrar em `C:\auto-orcamento\` o que muda no dia a dia e pode sincronizar no futuro.

## Caminhos canônicos

```text
C:\auto-orcamento\data\          históricos, settings, tabelas em runtime
C:\auto-orcamento\output\        PDF + snapshot JSON
C:\auto-orcamento\export\        orcamentos.sqlite (cópia na consolidação)
```

- **Seed no repo:** `seed/data/` (versionado). `server/data-bootstrap.js` copia para `dataDir` só arquivos que ainda não existem ao vivo.
- **Legado:** se ainda existir `{repo}/data/`, o bootstrap também copia de lá (uma vez por arquivo).
- Pasta `{repo}/data/` está no `.gitignore` (lixeira local / migração).

## Código

| Artefato | Função |
|---|---|
| `server/paths.js` | `dataDir`, `outputDir`, `seedDataDir`; overrides `DATA_DIR`, `OUTPUT_DIR` |
| `server/data-bootstrap.js` | Popula `dataDir` a partir de seed/legado |
| `server/server.js` | APIs gravam em `dataDir`; HTTP `/data/*` serve de `dataDir` |

## Overrides

| Variável | Efeito |
|---|---|
| `DATA_DIR` | Pasta de dados (absoluto) |
| `OUTPUT_DIR` | Pasta de PDF/JSON |

Sem override no **win32:** `C:\auto-orcamento\data` e `C:\auto-orcamento\output`. Em **Linux** (deploy atual): `{repoRoot}/data` e `{repoRoot}/output` até novo desenho do CT.

## Settings

`settings.json` em `dataDir` → `zoom`, `lastSnapshotDir` (pasta do **Abrir**/impressão; legado `{repo}/output` remapeado para `outputDir`).

## Documentação relacionada

- `docs/export-sqlite.md`
- `seed/data/README.md`

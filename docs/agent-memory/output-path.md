# Dados ao vivo fora do repo (Atlas / Windows)

Decisão (2026-10-25): concentrar em `C:\auto-orcamento\` o que muda no dia a dia e pode sincronizar no futuro.

## Caminhos canônicos

```text
C:\auto-orcamento\data\          históricos, settings, tabelas em runtime
C:\auto-orcamento\output\        PDF + snapshot JSON
C:\auto-orcamento\export\        orcamentos.sqlite (cópia na consolidação)
```

- **Seed no repo:** `seed/data/` (versionado). `server/data-bootstrap.js` copia para `dataDir` só arquivos que ainda não existem ao vivo.
- **Legado:** se ainda existir `{repo}/data/`, o bootstrap copia lacunas e **atualiza** destino se o arquivo no clone for mais recente.
- Pasta `{repo}/data/` está no `.gitignore`. Após migrar, limpar o clone: `pwsh -File scripts/finalize-repo-data-migration.ps1` (move ou apaga duplicatas já em `C:\auto-orcamento\data`).

## Código

| Artefato | Função |
|---|---|
| `server/paths.js` | `dataDir`, `outputDir`, `seedDataDir`; overrides `DATA_DIR`, `OUTPUT_DIR` |
| `server/data-bootstrap.js` | Seed → lacunas; legado `{repo}/data` → lacunas + mtime mais novo |
| `scripts/finalize-repo-data-migration.ps1` | Remove ou move resíduos de `{repo}/data` após destino ok |
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

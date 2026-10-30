# Dados ao vivo fora do repo (Atlas / Windows)

Runbook do contrato com o dados-clinica: [`../export-sqlite.md`](../export-sqlite.md).

Decisão (2026-10-25): concentrar em `C:\auto-orcamento\` o que muda no dia a dia e pode sincronizar no futuro.

## Caminhos canônicos

```text
C:\auto-orcamento\data\          históricos, settings, tabelas em runtime
C:\auto-orcamento\output\        PDF + snapshot JSON
C:\auto-orcamento\export\        orcamentos.sqlite (espelho na consolidação)
```

Decisão (2026-10-27): a consolidação **não** copia SQLite, timbrado nem fontes para `dados-clinica/import/` — só grava em `EXPORT_DIR` (arranque, impressão, `npm run export:sqlite`). O dados-clinica lê esse arquivo no lugar (Atlas: `C:\auto-orcamento\export\orcamentos.sqlite`; CT: `/data/auto-orcamento/export/orcamentos.sqlite`). Contrato: `docs/export-sqlite.md`.

- **Seed no repo:** `seed/data/` (versionado). `server/data-bootstrap.js` copia para `dataDir` só arquivos que ainda não existem ao vivo.
- **Legado:** se ainda existir `{repo}/data/`, o bootstrap copia lacunas e **atualiza** destino se o arquivo no clone for mais recente.
- Pasta `{repo}/data/` está no `.gitignore`. Após migrar, limpar o clone: `pwsh -File scripts/finalize-repo-data-migration.ps1` (move ou apaga duplicatas já em `C:\auto-orcamento\data`).

## Código

| Artefato | Função |
|---|---|
| `server/paths.js` | `dataDir`, `outputDir`, `exportDir`; overrides `DATA_DIR`, `OUTPUT_DIR`, `EXPORT_DIR` |
| `server/data-bootstrap.js` | Seed → lacunas; legado `{repo}/data` → lacunas + mtime mais novo |
| `scripts/finalize-repo-data-migration.ps1` | Remove ou move resíduos de `{repo}/data` após destino ok |
| `server/server.js` | APIs gravam em `dataDir`; HTTP `/data/*` serve de `dataDir` |

## Overrides

| Variável | Efeito |
|---|---|
| `DATA_DIR` | Pasta de dados (absoluto) |
| `OUTPUT_DIR` | Pasta de PDF/JSON |
| `EXPORT_DIR` | Pasta do espelho `orcamentos.sqlite` |

Sem override no **win32:** `C:\auto-orcamento\data` e `C:\auto-orcamento\output`. **CT 100 (alvo):** `/data/auto-orcamento/{data,output,export}` via bind axis-data — `docs/agent-memory/axis-ct100.md`.

## Settings

`settings.json` em `dataDir` → `zoom`, `lastSnapshotDir` (pasta do **Abrir**/impressão; legado `{repo}/output` remapeado para `outputDir`).

## Backup legado (pré-migração UUID)

Espelho pontual de `dataDir` em `{repo}/backup-legado/pre-uuid-migration/` (gitignored). Script: `scripts/backup-live-data-legado.ps1`. Detalhes: [`../../backup-legado/README.md`](../../backup-legado/README.md). Próximo schema: [`data-uuid-migration.md`](data-uuid-migration.md).

## Documentação relacionada

- `docs/export-sqlite.md`
- `docs/agent-memory/axis-ct100.md` (produção CT 100)
- `seed/data/README.md`

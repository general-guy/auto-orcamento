# Sync automático Atlas ↔ Axis (desenvolvimento)

Só no **Atlas** com `abrir-auto-orcamento.bat` (`BIND_HOST` = `127.0.0.1`, Windows). Produção no CT **não** dispara este fluxo.

## Objetivo

Abrir o app **sem esperar** o Axis; em segundo plano reconciliar `C:\auto-orcamento\` com a partição **axis-data** no Patriot e atualizar o código no CT quando o manifesto mudar.

## Componentes

| Peça | Caminho |
|------|---------|
| Fila + SSE | [`server/axis-sync.js`](../server/axis-sync.js) |
| Toasts UI | [`web/sync-toasts.js`](../web/sync-toasts.js), `GET /api/sync/events` |
| Motor SSH/rsync | `local-atlas/axis/scripts/sync_auto_orcamento.py` |

Variável opcional: `AUTO_ORCAMENTO_LOCAL_ATLAS` → pasta do clone `local-atlas` (padrão: `...\2.Projetos\local-atlas`).

## Pipeline no arranque (`--startup`)

Ordem fixa:

1. **Merge** `data/` → `output/` → `export/` (por arquivo: mtime mais novo vence; empate + SHA diferente → **toast amarelo**, sem overwrite).
2. **Código** incremental para `/opt/auto-orcamento` (manifesto local vs CT; `npm install` só se `package.json` / lock mudou; `systemctl restart auto-orcamento` se houve alteração).
3. **Manifesto** axis-data (`publish_manifest` no script Python).

## Eventos durante o uso

| Evento | Ação |
|--------|------|
| API grava JSON em `data/` (históricos, settings, tabelas) | Push unidirecional **só daquele arquivo** |
| `POST /api/pdf` (impressão) | Push do par `.pdf` + `.json` em `output/` e `export/orcamentos.sqlite` |

Toasts: verde (ok), vermelho (Axis offline / falha), amarelo (conflito manual).

## Manual (sem abrir o app)

A partir do `local-atlas`:

```powershell
py -3 .\axis\scripts\sync_auto_orcamento.py --startup
py -3 .\axis\scripts\sync_auto_orcamento.py --push-relative data/pacientes.json
py -3 .\axis\scripts\push_axis_data.py --only auto-orcamento
py -3 .\axis\scripts\deploy_auto_orcamento.py
```

Deploy tar completo continua válido para cutover ou CT novo.

## Relacionado

- [`docs/atlas-axis.md`](atlas-axis.md) — papéis Atlas/Axis
- [`docs/agent-memory/axis-ct100.md`](agent-memory/axis-ct100.md) — layout axis-data no CT
- Skill Cursor (global): `ct100-auto-orcamento`

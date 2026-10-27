# Sync automático Atlas ↔ Axis (desenvolvimento)

Só no **Atlas** com `abrir-auto-orcamento.bat` (`BIND_HOST` = `127.0.0.1`, Windows). Produção no CT **não** dispara este fluxo.

## Objetivo

Abrir o app **sem bloquear a UI** no Axis; em segundo plano reconciliar `C:\auto-orcamento\` com a partição **axis-data** no Patriot e atualizar o código no CT quando o manifesto mudar. Se o **host Proxmox** estiver desligado, o motor tenta **ligar** (Hub → tomada + WoL) antes de falhar.

## Componentes

| Peça | Caminho |
|------|---------|
| Fila + SSE | [`server/axis-sync.js`](../server/axis-sync.js) |
| Log de sessões (10 últimas) | `C:\auto-orcamento\logs\axis-sync\session-*.log` — stdout/stderr de cada execução do Python (`startup`, `push`, …) |
| Toasts UI | [`web/sync-toasts.js`](../web/sync-toasts.js), `GET /api/sync/events` — toasts flutuantes (`position: fixed`); na **toolbar do preview** (à direita de “Documento Final”), botão de recarregar a interface e, à direita dele, o ícone de histórico (painel com os **10** últimos toasts + horário) |
| Motor merge + código | `local-atlas/axis/scripts/sync_auto_orcamento.py` |
| Wake PVE (se offline) | `local-atlas/axis/scripts/ensure_axis_online.py` (`wake_axis.py` + `probe_host_ssh` em `ct_access.py`) |

Variável opcional: `AUTO_ORCAMENTO_LOCAL_ATLAS` → pasta do clone `local-atlas` (padrão: `...\2.Projetos\local-atlas`).

**Notify Axis → Atlas** (pull pontual enquanto o `.bat` está aberto): `POST /api/sync/notify` no Atlas com token compartilhado; listener opcional na Tailscale (`3010`). Instalação: `local-atlas/axis/scripts/install_atlas_notify_env.py`. Detalhe: [`agent-memory/atlas-notify.md`](agent-memory/atlas-notify.md).

## Pipeline no arranque (`--startup`)

Antes de qualquer SSH/rsync: se o PVE não responde, o script chama o mesmo fluxo do `wake_axis.py` (Hub → tomada + WoL) e aguarda até **180 s** pelo SSH; toasts amarelo/verde na UI (`ensure_axis_online.py`).

Ordem fixa:

1. **Merge** `data/` → `output/` → `export/` (por arquivo: mtime mais novo vence; empate + SHA diferente → **toast amarelo**, sem overwrite). Em `output/`, reconciliar primeiro `orcamentos-index.json` (`sync_output_index.py` — tombstones de pares pdf+json; ver [`agent-memory/output-index-sync.md`](agent-memory/output-index-sync.md)).
2. **Código** incremental para `/opt/auto-orcamento` (manifesto local vs CT; `npm install` só se `package.json` / lock mudou; `systemctl restart auto-orcamento` se houve alteração).
3. **Manifesto** axis-data (`publish_manifest` no script Python).

## Wake automático

Disparado em `--startup`, `--push-relative`, `--pull-if-remote-newer`, merge, sync de código e `align-remote-mtimes` (não em `--repair-mtimes`, só local).

1. `probe_host_ssh` no PVE (`axis.local.env`).
2. Se falhar → `wake_axis.py` (SSH no Pi → `POST /axis/wake`).
3. Poll SSH até **180 s** (CT 100 sobe com `onboot=1` no host).
4. Toasts fase `wake` (`phase` no JSON): amarelo único enquanto liga (20 s na UI), verde `Axis online.`, vermelho se Hub/WoL ou timeout — sem toast genérico duplicado do Node se o Python já reportou erro.

Pré-requisitos: Pi na LAN, `raspberry-home-hub/.raspberry-access.local.json`, mesmos do wake manual (`axis/README.md`).

## Eventos durante o uso

Detalhe do fluxo blur/API em [`docs/agent-memory/axis-data-live-sync.md`](agent-memory/axis-data-live-sync.md).

| Evento | Ação |
|--------|------|
| API lê/grava JSON em `data/` (históricos, settings, Unimed N, tecnologias) | Antes da leitura: **pull** se o Axis estiver mais novo (`--pull-if-remote-newer`). Após gravar: **reconcilia** aquele arquivo (`--push-relative` → `sync_one_relative`; mesmas regras de mtime do merge; não é push cego). |
| `POST /api/pdf` (impressão) | Par `.pdf` + `.json` em `output/`, entrada no índice, `export/orcamentos.sqlite` |
| `DELETE /api/snapshots/...` (modal **Excluir**) | Tombstone no índice; push do índice; apagado físico (Lixeira Atlas / `rm` no CT) |

Ordem típica no blur (ex.: novo paciente no histórico): pull se Axis mais novo → servidor lê JSON atualizado → grava com o novo item → fila reconcilia o mesmo arquivo.

Toasts: verde (ok), vermelho (Axis offline / falha), amarelo (conflito manual). O merge no **startup** só começa depois que a UI conecta `/api/sync/events` (senão os avisos se perdem no WebView). Mensagens de pull: `Atualizado do Axis: …`. O `axis-sync.js` define `PYTHONIOENCODING=utf-8` no subprocesso Python (acentos no Windows).

## Manual (sem abrir o app)

A partir do `local-atlas`:

```powershell
py -3 .\axis\scripts\sync_auto_orcamento.py --startup
py -3 .\axis\scripts\sync_auto_orcamento.py --pull-if-remote-newer data/pacientes.json
py -3 .\axis\scripts\sync_auto_orcamento.py --push-relative data/pacientes.json
py -3 .\axis\scripts\sync_auto_orcamento.py --push-force-relative data/pacientes.json   # cutover v2 (sem merge); idem cirurgias, hospitais, pagamentos, observacoes, extras, tecnologias, unimed-n
py -3 .\axis\scripts\push_axis_data.py --only auto-orcamento
py -3 .\axis\scripts\deploy_auto_orcamento.py
```

Deploy tar completo continua válido para cutover ou CT novo.

## Datas dos arquivos (`output/` etc.)

O merge usa **mtime** (no Axis só mtime/atime). **`data/` e `export/`** — comparação e push com o `st_mtime` real (última gravação). **`output/`** — data do documento (mais antigo entre modificação, criação no Windows e carimbo no nome `… 2026-09-08 14-07-13.pdf`).

Se um sync em massa deixou tudo com a mesma “Data de modificação” no Explorer:

```powershell
py -3 .\axis\scripts\sync_auto_orcamento.py --repair-mtimes output
py -3 .\axis\scripts\sync_auto_orcamento.py --align-remote-mtimes output
py -3 .\axis\scripts\sync_auto_orcamento.py --merge-member output
```

`--repair-mtimes` e `--align-remote-mtimes` são para **`output/`** apenas. `data/`/`export/` usam mtime de modificação; o merge normal basta.

## Relacionado

- [`docs/atlas-axis.md`](atlas-axis.md) — papéis Atlas/Axis
- [`docs/agent-memory/axis-ct100.md`](agent-memory/axis-ct100.md) — layout axis-data no CT
- [`docs/agent-memory/axis-sync-ui.md`](agent-memory/axis-sync-ui.md) — toasts e histórico no preview
- Skills Cursor (global): `ct100-webapps` (pai) + `ct100-auto-orcamento` (filho)

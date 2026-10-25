# Axis CT 100 — código vs axis-data (desenho alvo)

Decisão (2026-10-25): produção no CT 100 segue o mesmo recorte do Atlas — **mutável no Patriot `axis-data`**, **estável no rootfs do CT**. Runbooks operacionais ficam no `local-atlas` (`axis/AXIS-DATA.md`, `docs/referencias/web-apps-axis.md`, `docs/agent-memory/ct100-c-drive-axis-data.md`).

## Três camadas (auto-orcamento)

| Camada | Onde | Conteúdo |
|--------|------|----------|
| Código | CT `/opt/auto-orcamento` | `server/`, `web/`, `assets/`, `seed/data/`, `node_modules/` — deploy tar do clone Atlas (`deploy_auto_orcamento.py`) |
| Dados mutáveis | Patriot → CT bind | Host `/var/lib/axis-data/auto-orcamento` → CT `/data/auto-orcamento` (mp1) |
| Origem no Atlas | `C:\auto-orcamento\` | Espelho empurrado com `push_axis_data.py --only auto-orcamento` |

Árvore **canônica** sob `/data/auto-orcamento` (paridade com `C:\auto-orcamento\`):

```text
/data/auto-orcamento/
├── data/      pacientes, settings, tabelas em runtime (DATA_DIR)
├── output/    PDF + snapshot JSON (OUTPUT_DIR)
└── export/    orcamentos.sqlite (consolidação; espelho para dados-clinica no Axis)
```

O **seed** versionado continua só no código (`/opt/auto-orcamento/seed/data/`). O bootstrap preenche lacunas em `DATA_DIR` na primeira subida — não sobrescreve produção ao vivo.

## Rede e processo

| Item | Valor |
|------|--------|
| CT | VMID 100, `app`, LAN `192.168.68.202` |
| Unit | `auto-orcamento.service` (em `local-atlas/axis/systemd/`) |
| Bind app | `BIND_HOST=192.168.68.202` (Serve no host `.201` → `:3000`) |
| URL | `https://axis.tail5fe4b7.ts.net/` (Tailscale Serve, sem Funnel) |
| PDF | `AUTO_ORCAMENTO_BROWSER=/usr/bin/chromium` |

## Sincronização (sentido único)

| O quê | Direção | Como |
|-------|---------|------|
| Código | Atlas → CT | `py -3 local-atlas/axis/scripts/deploy_auto_orcamento.py` |
| `C:\auto-orcamento\` | Atlas → axis-data | `push_axis_data.py --only auto-orcamento` |
| Escrita em produção (celular) | Só no CT | Grava direto em `/data/auto-orcamento/...` (bind Patriot) |

**Anti split-brain:** não editar o mesmo JSON no Atlas localhost e no Axis ao mesmo tempo. Cadastro só no celular não volta ao Git; antes de redeploy que sobrescreve código, copiar manualmente do CT se necessário. Manifestos: `verify_axis_data.py --quick`.

## Implementado (2026-10-25)

- Unit `auto-orcamento.service`: `DATA_DIR`, `OUTPUT_DIR`, `EXPORT_DIR`, `AUTO_ORCAMENTO_DELIVER_SQLITE` em `/data/...`.
- `server/paths.js`: Linux com bind `/data/auto-orcamento` usa `data/`, `output/`, `export/`; Windows canônico `C:\auto-orcamento\export`.
- `deploy_auto_orcamento.py`: tar sem `data|output|export`; limpa resíduos em `/opt/auto-orcamento/{data,output,export}`; `mkdir` no bind.
- `export-sqlite.js`: entrega default CT em `/data/dados-clinica/import/` quando o bind existe.

Cutover operacional: `push_axis_data.py --only auto-orcamento` + `deploy_auto_orcamento.py`.

## Sync automático no Atlas (dev)

Só no Windows com `127.0.0.1` (`abrir-auto-orcamento.bat`):

1. Após o listen na porta 3000, fila em background (`server/axis-sync.js` → `sync_auto_orcamento.py --startup`; se o Axis estiver desligado, `ensure_axis_online.py` acorda via Hub antes do merge).
2. Ordem: merge bidirecional por arquivo em `data` → `output` → `export` (axis-data); depois código incremental para `/opt/auto-orcamento` (+ restart se mudou); manifesto axis-data.
3. Regra de conflito: mesmo horário e SHA diferente → toast amarelo, sem overwrite.
4. Após gravar JSON em `data/` (API) ou imprimir (PDF+JSON+sqlite): push unidirecional só dos arquivos alterados.
5. Toasts: SSE `GET /api/sync/events` + `web/sync-toasts.js`.
6. Log rotativo (10 sessões): `C:\auto-orcamento\logs\axis-sync\` — ver [`axis-sync-sessions.md`](axis-sync-sessions.md).

Override: `AUTO_ORCAMENTO_LOCAL_ATLAS` aponta para o clone `local-atlas`. Runbook completo: [`../atlas-axis-sync.md`](../atlas-axis-sync.md).

## Referências (local-atlas)

- `axis/AXIS-DATA.md` — particão Patriot `nvme0n1p2`, fstab, binds mp0..mp2.
- `axis/scripts/axis_data.py` — constantes `HOST_AUTO_ORCAMENTO`, `CT_AUTO_ORCAMENTO`.
- Skill `ct100-webapps` — matriz deploy vs push.

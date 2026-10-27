# Atlas e Axis

Relação entre este PC (**Atlas** / Geraldo-Server) e o hypervisor **Proxmox Axis**. Hardware, energia (Tomada-Axis, WoL) e scripts do CT ficam no repositório `local-atlas` (`axis/`, `docs/referencias/web-apps-axis.md`). Aqui só o que muda o uso deste app.

## Papéis

| Máquina | Papel neste app |
|---|---|
| **Atlas** (este Windows) | Desenvolvimento: `abrir-auto-orcamento.bat` → `http://127.0.0.1:3000`. Clone Git + Cursor. OneDrive em `2.Projetos` é lixeira / Version History, não o servidor. |
| **Axis** (Proxmox VE, LAN `192.168.68.201`) | Produção. O guest **CT 100** (`app`, `192.168.68.202`) corre Node em `/opt/auto-orcamento`. |
| Celular / tablet | Abre a URL do Axis na mesh Tailscale. O cliente precisa estar na mesma tailnet. |

Produção: `https://axis.tail5fe4b7.ts.net:3000/` — Tailscale **Serve** no host Proxmox, apontando para `http://192.168.68.202:3000`. **Sem Funnel.** **Sem bind `0.0.0.0`.**

Não há dois servidores oficiais ao mesmo tempo. `.201` é o hypervisor; `.202` vive dentro dele — desligar o Axis desliga o app de produção.

Independência:

- Atlas em S3: celular usa o Axis (ligado, ou wake pelo Hub ~42 s).
- Axis desligado: celular espera o Hub religar a Tomada-Axis e mandar WoL; neste PC ainda dá para editar código e subir localhost.
- Dois writers oficiais no mesmo JSON (localhost Atlas + Axis) = split-brain. Editar código aqui, usar produção no Axis.

## Três camadas

| O quê | Fonte da verdade | Onde não vive ao vivo |
|---|---|---|
| Código | GitHub (`git pull` / rsync do clone Atlas) | OneDrive não é o origin |
| Dados de produção (`data/`, `output/`, `export/`) | Patriot **axis-data** → bind CT `/data/auto-orcamento` (espelho `C:\auto-orcamento\` no Atlas) | Código em `/opt/auto-orcamento` só estável; ver `docs/agent-memory/axis-ct100.md` |
| Rede de segurança | OneDrive no Atlas + git | Não cobre o acervo clínico no CT |

O clone neste PC é para **editar código**. Históricos e PDFs clínicos ao vivo moram no Axis. Nomes de pacientes deste clone ficam em `data/pacientes.json`, fora do Git.

## Bind

`server/server.js` escuta `process.env.BIND_HOST` ou, se omitido, `127.0.0.1`, porta **3000**.

| Onde | `BIND_HOST` | Porquê |
|---|---|---|
| Atlas (`.bat` / `npm start`) | omitido → `127.0.0.1` | Só este PC; janela WebView2 |
| CT 100 (`auto-orcamento.service`) | `192.168.68.202` | O Serve no host precisa alcançar a porta na LAN do CT. iptables no CT aceita só o hypervisor (`.201`) nessa porta. |

## Funnel neste Windows (removido)

Tailscale Funnel + `iniciar-acesso-remoto.bat` + `auth-users.json` foram removidos do repositório (out/2026). Histórico: [`legado-funnel-auth.md`](legado-funnel-auth.md). Cliente de produção usa Tailscale na mesma tailnet e a URL do Axis.

## Deploy

Pedido explícito, a partir do clone `local-atlas` neste PC:

```powershell
py -3 .\axis\scripts\deploy_auto_orcamento.py
```

Copia **código** para `/opt/auto-orcamento` (sem `data/`/`output/`/`export/` no tar); dados em axis-data (`push_axis_data.py` + binds). CT: Node 22 em `/usr/local` (`prepare_ct100.py`), `NODE_OPTIONS=--experimental-sqlite`; SQLite espelho em `/data/auto-orcamento/export/`. Detalhe: `docs/agent-memory/axis-ct100.md` e `local-atlas/docs/referencias/web-apps-axis.md`.

## Sync automático (Atlas dev)

Ao abrir `abrir-auto-orcamento.bat`, após a porta 3000 subir, o servidor enfileira sync em segundo plano (toasts no canto superior direito). Não bloqueia a UI.

| Fase | O quê |
|------|--------|
| Dados | Merge `data` → `output` → `export` entre `C:\auto-orcamento\` e axis-data |
| Código | Incremental para `/opt/auto-orcamento` + restart se mudou |
| Uso | Histórico/settings: pull se Axis mais novo, gravar, reconciliar arquivo; imprimir → reconciliar `output/` + sqlite |
| Uso (Axis) | Gravar no CT → notify HTTP ao Atlas (se aberto) para pull do mesmo arquivo; ver [`agent-memory/atlas-notify.md`](agent-memory/atlas-notify.md) |

Runbook: [`atlas-axis-sync.md`](atlas-axis-sync.md). Axis desligado → toasts vermelhos no Atlas; notify amarelo no CT se o `.bat` estiver fechado.

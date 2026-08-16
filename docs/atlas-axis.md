# Atlas e Axis

Relação entre este PC (**Atlas** / Geraldo-Server) e o hypervisor **Proxmox Axis**. Hardware, energia (Tomada-Axis, WoL) e scripts do CT ficam no repositório `local-atlas` (`axis/`, `docs/referencias/web-apps-axis.md`). Aqui só o que muda o uso deste app.

## Papéis

| Máquina | Papel neste app |
|---|---|
| **Atlas** (este Windows) | Desenvolvimento: `abrir-auto-orcamento.bat` → `http://127.0.0.1:3000`. Clone Git + Cursor. OneDrive em `2.Projetos` é lixeira / Version History, não o servidor. |
| **Axis** (Proxmox VE, LAN `192.168.68.201`) | Produção. O guest **CT 100** (`app`, `192.168.68.202`) corre Node em `/opt/auto-orcamento`. |
| Celular / tablet | Abre a URL do Axis na mesh Tailscale. O cliente precisa estar na mesma tailnet. |

Produção: `https://axis.tail5fe4b7.ts.net/` — Tailscale **Serve** no host Proxmox, apontando para `http://192.168.68.202:3000`. **Sem Funnel.** **Sem bind `0.0.0.0`.**

Não há dois servidores oficiais ao mesmo tempo. `.201` é o hypervisor; `.202` vive dentro dele — desligar o Axis desliga o app de produção.

Independência:

- Atlas em S3: celular usa o Axis (ligado, ou wake pelo Hub ~42 s).
- Axis desligado: celular espera o Hub religar a Tomada-Axis e mandar WoL; neste PC ainda dá para editar código e subir localhost.
- Dois writers oficiais no mesmo JSON (localhost Atlas + Axis) = split-brain. Editar código aqui, usar produção no Axis.

## Três camadas

| O quê | Fonte da verdade | Onde não vive ao vivo |
|---|---|---|
| Código | GitHub (`git pull` / rsync do clone Atlas) | OneDrive não é o origin |
| Dados de produção (`data/` de runtime, `output/`) | Disco do CT 100 (`/opt/auto-orcamento`) | Sem sync nos dois sentidos; sem OneDrive no Axis |
| Rede de segurança | OneDrive no Atlas + git | Não cobre o acervo clínico no CT |

O clone neste PC é para **editar código**. Históricos e PDFs clínicos ao vivo moram no Axis.

## Bind

`server/server.js` escuta `process.env.BIND_HOST` ou, se omitido, `127.0.0.1`, porta **3000**.

| Onde | `BIND_HOST` | Porquê |
|---|---|---|
| Atlas (`.bat` / `npm start`) | omitido → `127.0.0.1` | Só este PC; janela WebView2 |
| CT 100 (`auto-orcamento.service`) | `192.168.68.202` | O Serve no host precisa alcançar a porta na LAN do CT. iptables no CT aceita só o hypervisor (`.201`) nessa porta. |

## Funnel neste Windows

`iniciar-acesso-remoto.bat` (Funnel + token de uso único) é **legado de teste**. Não é o caminho clínico: dados de orçamento não devem ir à internet pública. O atalho e o código de auth continuam no repo para o caso excepcional — ver [`acesso-remoto.md`](acesso-remoto.md).

Cliente de produção (celular/tablet/Atlas no browser) usa Tailscale na mesma tailnet e a URL do Axis.

## Deploy

Pedido explícito, a partir do clone `local-atlas` neste PC:

```powershell
py -3 .\axis\scripts\deploy_auto_orcamento.py
```

Copia este repo para `/opt/auto-orcamento`, liga o systemd e configura Serve `:443` no host. Detalhe operacional: `local-atlas/docs/referencias/web-apps-axis.md`.

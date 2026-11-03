# Notify Axis → Atlas (pull pontual na sessão)

Complemento a [`axis-data-live-sync.md`](axis-data-live-sync.md). O **CT** não roda `sync_auto_orcamento.py`; após gravar, avisa o **Atlas** para enfileirar `--pull-if-remote-newer` no caminho informado. Coordenação do merge permanece no Atlas (Python + `axis-sync.js`).

## Fluxo

1. Axis grava em `/data/auto-orcamento/…` (bind axis-data).
2. `server/atlas-notify.js` envia `POST` com `{ relativePath }` ou `{ relativePaths }`.
3. Atlas valida o token, responde na hora `{ phase: "received" }` e mantém o POST aberto até o `--pull-if-remote-newer` terminar; aí envia `{ phase: "synced" }`. O CT espera no máximo 1 minuto depois do `received`.
4. No Axis, cada linha vira um toast ao vivo no SSE `/api/sync/events` (sem replay de sessões anteriores). Sem resposta do Atlas em 5 segundos, toast amarelo «O Atlas não respondeu em 5 segundos.» (a gravação local segue). Ao fechar a UI, encerrar também `:3010`. O botão de histórico fica na barra **Documento Final** (também no Tailscale).

## Configuração (segredos fora do git)

| Onde | Arquivo / variável |
|------|---------------------|
| Atlas | `config/atlas-notify.env` no clone (gitignored) — carregado por `server/load-local-env.js` ao subir o Node no Windows. Modelo: `config/atlas-notify.env.example`. |
| Atlas (listener) | `AUTO_ORCAMENTO_ATLAS_NOTIFY_BIND_HOST` (`0.0.0.0` recomendado) + `AUTO_ORCAMENTO_ATLAS_NOTIFY_PORT` (padrão `3010`) — só rota `/api/sync/notify`. App principal pode ficar em `127.0.0.1:3000`. |
| Axis (CT) | `/etc/auto-orcamento/atlas-notify.env` — `EnvironmentFile=-…` em `auto-orcamento.service` (local-atlas). |
| Compartilhado | `AUTO_ORCAMENTO_ATLAS_NOTIFY_TOKEN` (header `X-Auto-Orcamento-Notify-Token` ou `Authorization: Bearer`) |
| Axis URL | `AUTO_ORCAMENTO_ATLAS_NOTIFY_URL` — ex. `http://192.168.68.200:3010/api/sync/notify` (CT 100 sem `tailscale up`) |

O deploy e o sync de código (`deploy_auto_orcamento.py`, `should_skip_file`) não enviam `atlas-notify.env` ao CT. O segredo do Axis continua só em `/etc/auto-orcamento/atlas-notify.env`.

Instalar ou reenviar o token ao CT (reutiliza o do clone se `config/atlas-notify.env` já existir):

```powershell
py -3 .\axis\scripts\install_atlas_notify_env.py
```

(clone `local-atlas`; argumentos opcionais: IP LAN do Atlas, porta — padrão `192.168.68.200` e `3010`.)

**Canônico neste ambiente:** listener LAN `:3010` (`AUTO_ORCAMENTO_ATLAS_NOTIFY_URL=http://192.168.68.200:3010/api/sync/notify`). A rota `POST /api/sync/notify` no app `:3000` existe (mesmo handler), mas não é o caminho de produção do CT — alternativa só se o Atlas publicar Tailscale Serve em `127.0.0.1:3000` (expõe o app inteiro na tailnet).

## Código

| Arquivo | Papel |
|---------|--------|
| `server/load-local-env.js` | No Windows, lê `config/atlas-notify.env` do clone ao subir o Node |
| `server/atlas-notify.js` | Validação de paths, HTTP client (Axis), handler e listener opcional |
| `server/axis-sync.js` | `enqueuePullIfRemoteNewer` |
| `server/server.js` | Rota `POST /api/sync/notify` |

Runbook geral: [`../atlas-axis-sync.md`](../atlas-axis-sync.md). CT: [`axis-ct100.md`](axis-ct100.md).

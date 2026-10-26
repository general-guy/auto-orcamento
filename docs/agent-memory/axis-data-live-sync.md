# Sync de `data/` durante a sessão (Atlas + Axis)

Complemento ao merge no arranque ([`../atlas-axis-sync.md`](../atlas-axis-sync.md)). Cobre uso **simultâneo** do app no Atlas (`127.0.0.1`) e no Axis (Tailscale) sem reiniciar o `.bat`.

## Problema que isso resolve

Antes, cada gravação em `data/` após blur/API enfileirava `--push-relative` **cego**: o Atlas sobrescrevia o axis-data mesmo quando o CT tinha o JSON mais novo. Com o Atlas aberto o dia todo, melhorias feitas no Axis eram perdidas no próximo blur.

No **Axis**, blur só gravava em `/data/auto-orcamento/` (axis-data); o espelho `C:\auto-orcamento\` no Atlas podia ficar desatualizado até o próximo `--startup` ou blur no Atlas. O notify abaixo fecha essa lacuna **sem** o CT empurrar merge (coordenação continua no Atlas).

## Fluxo atual (por arquivo)

| Etapa | Onde | O quê |
|-------|------|--------|
| Leitura (GET / POST / DELETE que lê antes de gravar) | Atlas: `server/server.js` → catálogos / `writeSettings` | `axisSync.pullDataFileIfRemoteNewer` → Python `--pull-if-remote-newer data/…` |
| Gravação | Atlas: `C:\auto-orcamento\data\`; Axis: bind `/data/auto-orcamento/data/` | Disco local em cada host |
| Pós-gravação (Atlas) | `axisSync.afterDataFileWrite` | Python `--push-relative` = **reconciliação** (`sync_one_relative` / `sync_catalog_v2.py`) |
| Pós-gravação (Axis) | `server/atlas-notify.js` | `POST` ao Atlas → `POST /api/sync/notify` → fila `--pull-if-remote-newer` no caminho informado |

Regras de reconciliação (iguais ao merge): mtime com slop de **1 s**; em empate de horário, tamanho e SHA-256; conflito → toast amarelo, sem overwrite.

Para `data/` e `export/`, mtime = `st_mtime` real. `output/` segue data do documento (ver runbook de datas no [`axis-sync-sessions.md`](axis-sync-sessions.md)).

## Fila no Node

`server/axis-sync.js` serializa subprocessos Python; `enqueue` retorna Promise para o servidor **aguardar** o pull antes de ler o JSON. Push/reconcile após gravar continua assíncrono na fila (não bloqueia a resposta HTTP além do pull na leitura).

O `--startup` usa `enqueueAhead` para rodar **antes** de pulls já enfileirados (notify do Axis + GET de catálogo ao abrir a UI). O `web/sync-toasts.js` abre o SSE assim que o script carrega (`defer`), antes do `app.js` disparar os GETs — senão o merge podia terminar sem cliente e os toasts não apareciam. Detalhe UI: [`axis-sync-ui.md`](axis-sync-ui.md).

Tarefas no log: `pull`, `push`, `startup` — ver [`axis-sync-sessions.md`](axis-sync-sessions.md).

## Motor Python (local-atlas)

| Flag | Função |
|------|--------|
| `--pull-if-remote-newer` | Só puxa se remoto mais novo (ou só remoto); não envia |
| `--push-relative` | Reconcilia um caminho sob `data/`, `output/` ou `export/` |
| `--push-force-relative` | SFTP sobrescreve o remoto (sem merge); cutover v2 no Axis (um arquivo por vez) |

Arquivos com `schemaVersion: 2` em `data/` (oito catálogos de histórico — ver [`data-schema-v2.md`](data-schema-v2.md)) → `sync_catalog_v2.py` no push/pull unitário. Demais JSON em `data/` (ex. `settings.json`, tabelas estáticas) → `sync_one_relative()`. Merge em massa no `--startup` continua por arquivo (`merge_member`).

## Aviso Axis → Atlas (sessão aberta no Atlas)

No **CT 100**, após gravar `data/` (blur/API), `settings` ou impressão (`output/` + sqlite), o Node envia `POST` para o Atlas (`AUTO_ORCAMENTO_ATLAS_NOTIFY_URL`) com token compartilhado. O Atlas enfileira `--pull-if-remote-newer` só para o(s) caminho(s) informado(s). Toast no Axis: verde se entregue, amarelo se o app no Atlas estiver desligado ou inacessível (sem fila persistente; merge global no próximo `--startup`).

| Variável | Onde |
|----------|------|
| `AUTO_ORCAMENTO_ATLAS_NOTIFY_TOKEN` | Atlas e Axis (mesmo segredo) |
| `AUTO_ORCAMENTO_ATLAS_NOTIFY_URL` | Axis — ex. `http://<tailscale-atlas>:3010/api/sync/notify` |
| `AUTO_ORCAMENTO_ATLAS_NOTIFY_BIND_HOST` + `AUTO_ORCAMENTO_ATLAS_NOTIFY_PORT` (opcional, padrão `3010`) | Atlas — listener só do notify na interface Tailscale (app principal pode continuar em `127.0.0.1:3000`) |

Alternativa: Tailscale Serve no Atlas apontando para `127.0.0.1:3000` e URL `…/api/sync/notify` na porta 3000 (expõe o app inteiro na tailnet).

Runbook dedicado (env, listener, script de instalação): [`atlas-notify.md`](atlas-notify.md).

## Limitações

| Caso | Comportamento |
|------|----------------|
| **PUT** com lista inteira (reordenar histórico na UI) | Body vem da memória do browser; **não** há pull antes do PUT. Preferir blur/POST ou recarregar a página após editar no Axis. |
| **Mesmo arquivo** editado nos dois lados com mtime empate e conteúdo diferente | Toast de conflito; resolução manual. |
| **Axis offline** no pull | Bind falha → segue JSON local; sem fila persistente de pushes pendentes. |
| **`tabelas-hospitalares.json`** | Servido estático; não passa por estas APIs — só entra no merge do arranque ou edição manual + sync manual. |

## Não é fila offline

Falha de push, wake ou **notify** (Atlas desligado) **não** acumula lista incremental. O JSON no axis-data já foi salvo no CT; o próximo pull/push bem-sucedido (notify, blur no Atlas, impressão ou `--startup`) reconcilia.

## Relacionado

- UI: [`axis-sync-ui.md`](axis-sync-ui.md)
- Log: [`axis-sync-sessions.md`](axis-sync-sessions.md)
- CT / paths: [`axis-ct100.md`](axis-ct100.md)

# Sync de `data/` durante a sessão (Atlas + Axis)

Complemento ao merge no arranque ([`../atlas-axis-sync.md`](../atlas-axis-sync.md)). Cobre uso **simultâneo** do app no Atlas (`127.0.0.1`) e no Axis (Tailscale) sem reiniciar o `.bat`.

## Problema que isso resolve

Antes, cada gravação em `data/` após blur/API enfileirava `--push-relative` **cego**: o Atlas sobrescrevia o axis-data mesmo quando o CT tinha o JSON mais novo. Com o Atlas aberto o dia todo, melhorias feitas no Axis eram perdidas no próximo blur.

## Fluxo atual (por arquivo)

| Etapa | Onde | O quê |
|-------|------|--------|
| Leitura (GET / POST / DELETE que lê antes de gravar) | `server/server.js` → `readJsonListFresh` / `writeSettings` | `axisSync.pullDataFileIfRemoteNewer` → Python `--pull-if-remote-newer data/…` |
| Gravação | `writeJsonList` / `writeSettings` | Disco em `C:\auto-orcamento\data\` |
| Pós-gravação | `axisSync.afterDataFileWrite` | Python `--push-relative` = **reconciliação** de um arquivo (`sync_one_relative` em `sync_auto_orcamento_data.py`) |

Regras de reconciliação (iguais ao merge): mtime com slop de **1 s**; em empate de horário, tamanho e SHA-256; conflito → toast amarelo, sem overwrite.

Para `data/` e `export/`, mtime = `st_mtime` real. `output/` segue data do documento (ver runbook de datas no [`axis-sync-sessions.md`](axis-sync-sessions.md)).

## Fila no Node

`server/axis-sync.js` serializa subprocessos Python; `enqueue` retorna Promise para o servidor **aguardar** o pull antes de ler o JSON. Push/reconcile após gravar continua assíncrono na fila (não bloqueia a resposta HTTP além do pull na leitura).

Tarefas no log: `pull`, `push`, `startup` — ver [`axis-sync-sessions.md`](axis-sync-sessions.md).

## Motor Python (local-atlas)

| Flag | Função |
|------|--------|
| `--pull-if-remote-newer` | Só puxa se remoto mais novo (ou só remoto); não envia |
| `--push-relative` | Reconcilia um caminho sob `data/`, `output/` ou `export/` |
| `--push-force-relative` | SFTP sobrescreve o remoto (sem merge); cutover v2 no Axis (um arquivo por vez) |

Arquivos com `schemaVersion: 2` em `data/` (oito catálogos de histórico — ver [`data-schema-v2.md`](data-schema-v2.md)) → `sync_catalog_v2.py` no push/pull unitário. Demais JSON em `data/` (ex. `settings.json`, tabelas estáticas) → `sync_one_relative()`. Merge em massa no `--startup` continua por arquivo (`merge_member`).

## Limitações

| Caso | Comportamento |
|------|----------------|
| **PUT** com lista inteira (reordenar histórico na UI) | Body vem da memória do browser; **não** há pull antes do PUT. Preferir blur/POST ou recarregar a página após editar no Axis. |
| **Mesmo arquivo** editado nos dois lados com mtime empate e conteúdo diferente | Toast de conflito; resolução manual. |
| **Axis offline** no pull | Bind falha → segue JSON local; sem fila persistente de pushes pendentes. |
| **`tabelas-hospitalares.json`** | Servido estático; não passa por estas APIs — só entra no merge do arranque ou edição manual + sync manual. |

## Não é fila offline

Falha de push ou wake **não** acumula lista incremental para quando o Axis ligar. O JSON local já foi salvo; o próximo pull/push bem-sucedido (blur, impressão ou `--startup`) reconcilia.

## Relacionado

- UI: [`axis-sync-ui.md`](axis-sync-ui.md)
- Log: [`axis-sync-sessions.md`](axis-sync-sessions.md)
- CT / paths: [`axis-ct100.md`](axis-ct100.md)

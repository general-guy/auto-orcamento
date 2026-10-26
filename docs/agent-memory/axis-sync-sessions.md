# Sync Axis — log de sessões (Atlas dev)

Cada execução em fila do `axis-sync.js` (`startup`, `pull`, `push`, etc.) grava **stdout/stderr** do `sync_auto_orcamento.py`.

## Onde

| Item | Valor |
|------|--------|
| Pasta | `C:\auto-orcamento\logs\axis-sync\` |
| Arquivos | `session-<ISO>-<tarefa>.log` (ex.: `session-2026-10-25T18-46-00-000Z-startup.log`) |
| Retenção | **10** sessões; ao criar a 11ª, apaga a mais antiga |
| Código | `server/axis-sync-session-log.js` + `server/axis-sync.js` |

Cabeçalho: horário, tarefa, script, argv. Rodapé: `exit_code`, timeout ou erro de spawn.

Só quando o sync está habilitado (Windows + `BIND_HOST` localhost). Produção no CT **não** gera estes logs.

## Fase wake (Axis desligado)

No início de `--startup`, `--pull-if-remote-newer`, `--push-relative` ou merge que precisa do PVE, o log pode mostrar linhas JSON de toast (`phase`: `wake`) antes do trabalho — saída de `ensure_axis_online.py`.

| Ordem (Axis estava off) | Nível | Mensagem |
|-------------------------|-------|----------|
| 1 | `warn` | Axis desligado; ligando via Hub (tomada e WoL). Pode levar cerca de 1 minuto… |
| 2 | `ok` | Axis online. |
| 3+ | merge/código | `/data/`, `/output/`, `/export/`, `code` — como no fluxo normal |

Falhas wake: `error` Hub/WoL ou timeout (180 s); o Node **não** repete “Falha na sincronização” se o Python já emitiu `error`. Se o Hub falhar ou o SSH não subir, `exit_code` ≠ 0 e não há merge.

Wake manual para testar: `py -3 local-atlas/axis/scripts/wake_axis.py`.

## Histórico na UI (preview)

`web/sync-toasts.js` grava cada toast em memória (máx. **10**) e expõe o botão de histórico na `preview-toolbar` do painel “Documento Final”. Os toasts ao vivo **não** entram no fluxo do documento (não empurram a folha); só o painel dropdown lista mensagem + `HH:MM:SS`.

## O que não é rsync

O merge de `data` / `output` / `export` no arranque e a reconciliação por arquivo (`--push-relative`, `--pull-if-remote-newer`) usam **SSH find/stat + SFTP** (`sync_one_relative` em `sync_auto_orcamento_data.py`), não o rsync em massa do `push_axis_data.py`. O log ainda vale para depurar reenvios e mensagens do motor Python.

Durante a sessão, o Node pode enfileirar `pull` imediatamente antes de uma API ler `data/`; o nome da tarefa no log é `pull` (argv `--pull-if-remote-newer`). Ver [`axis-data-live-sync.md`](axis-data-live-sync.md).

Toasts de merge usam **`/data/`**, **`/output/`**, **`/export/`** no texto. Com tudo já sincronizado, a etapa lenta costumava ser `/output/` (centenas de PDFs): o motor comparava hash baixando cada arquivo; agora usa **`sha256sum` no Patriot em lote** (local-atlas).

## Toasts com `` no lugar de acentos

O Python no subprocesso usava cp1252 no stdout; o Node lia UTF-8. **`axis-sync.js`** define `PYTHONIOENCODING=utf-8` e `PYTHONUTF8=1` no spawn do `py`.

## Datas de `output/` após sync em massa

Explorer pode mostrar a mesma “Data de modificação” em todos os PDFs; a **criação** costuma continuar correta. O merge usa **mtime**; no Patriot não há data de criação do Windows.

**Regras de mtime (local-atlas):** `data/` e `export/` usam só **modificação** (`st_mtime`). `output/` usa **data do documento** (criação / carimbo no nome do PDF) no merge e no push.

Recuperação de PDFs com data errada (**só `output/`**):

1. `--repair-mtimes output` — alinha `st_mtime` local.
2. `--align-remote-mtimes output` — `touch` no Patriot sem reupload.
3. `--merge-member output` — reconcilia conteúdo.

`data/`/`export/`: merge normal; não usar `repair` (birthtime não entra na comparação).

Detalhes: [`../atlas-axis-sync.md`](../atlas-axis-sync.md#datas-dos-arquivos-output-etc).

## Histórico: reenvio de `data/` em todo startup (corrigido)

Sintoma: toast `data: 0 puxado(s), 15 enviado(s), 0 igual(is).` em cada abertura.

Causa no **local-atlas**: `find -printf '%Y'` (tipo `f`, não mtime) → inventário remoto vazio → push repetido.

Correção: `%T@`, SFTP com `utime`, slop 1 s. Pull repetido de `data/` (15 arquivos) vinha de comparar com `birthtime` — corrigido separando mtime por membro (ver acima).

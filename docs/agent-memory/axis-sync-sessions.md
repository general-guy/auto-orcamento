# Sync Axis — log de sessões (Atlas dev)

Cada execução em fila do `axis-sync.js` (startup, push de arquivo, etc.) grava **stdout/stderr** do `sync_auto_orcamento.py`.

## Onde

| Item | Valor |
|------|--------|
| Pasta | `C:\auto-orcamento\logs\axis-sync\` |
| Arquivos | `session-<ISO>-<tarefa>.log` (ex.: `session-2026-10-25T18-46-00-000Z-startup.log`) |
| Retenção | **10** sessões; ao criar a 11ª, apaga a mais antiga |
| Código | `server/axis-sync-session-log.js` + `server/axis-sync.js` |

Cabeçalho: horário, tarefa, script, argv. Rodapé: `exit_code`, timeout ou erro de spawn.

Só quando o sync está habilitado (Windows + `BIND_HOST` localhost). Produção no CT **não** gera estes logs.

## O que não é rsync

O merge de `data` / `output` / `export` no arranque usa **SSH find + SFTP** por arquivo (`sync_auto_orcamento_data.py`), não o rsync em massa do `push_axis_data.py`. O log ainda vale para depurar reenvios e mensagens do motor Python.

## Toasts com `` no lugar de acentos

O Python no subprocesso usava cp1252 no stdout; o Node lia UTF-8. **`axis-sync.js`** define `PYTHONIOENCODING=utf-8` e `PYTHONUTF8=1` no spawn do `py`.

## Datas de `output/` após sync em massa

Explorer pode mostrar a mesma “Data de modificação” em todos os PDFs; a **criação** costuma continuar correta. O merge usa **mtime**; no Patriot não há data de criação do Windows.

Recuperação (scripts no **local-atlas**):

1. `--repair-mtimes <member>` — alinha `st_mtime` local (criação / carimbo no nome do PDF).
2. `--align-remote-mtimes <member>` — `touch` no axis-data sem reupload (evita o merge puxar tudo porque o remoto parecia “mais novo”).
3. `--merge-member <member>` — reconcilia conteúdo.

Detalhes: [`../atlas-axis-sync.md`](../atlas-axis-sync.md#datas-dos-arquivos-output-etc).

## Histórico: reenvio de `data/` em todo startup (corrigido)

Sintoma: toast `data: 0 puxado(s), 15 enviado(s), 0 igual(is).` em cada abertura.

Causa no **local-atlas**: `find -printf '%Y'` (tipo `f`, não mtime) → inventário remoto vazio → push repetido.

Correção: `%T@`, SFTP com `utime`, slop 1 s, data lógica no push, flags acima.

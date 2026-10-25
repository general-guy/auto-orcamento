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

## Diagnóstico (2026-10-25): reenvio de `data/` em todo startup

Sintoma: toast `data: 0 puxado(s), 15 enviado(s), 0 igual(is).` em cada abertura.

Causa provável no **local-atlas**: `list_remote_member` usa `find -printf '%Y'` — no GNU find `%Y` é **tipo** de arquivo (`f`), não mtime. O parser descarta as linhas → inventário remoto vazio → todos os arquivos locais tratados como “só no Atlas” → push repetido.

Correção pendente: trocar por `%T@` (mtime Unix) em `local-atlas/axis/scripts/sync_auto_orcamento_data.py`.

Runbook geral: [`../atlas-axis-sync.md`](../atlas-axis-sync.md).

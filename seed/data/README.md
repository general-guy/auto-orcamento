# Seed de `data/` (versionado)

Cópia inicial dos JSON de tabelas e históricos base. No **Windows**, o runtime usa `C:\auto-orcamento\data\` (`server/paths.js`; override `DATA_DIR`).

Na primeira abertura (ou se faltar arquivo), `server/data-bootstrap.js` copia daqui para `dataDir` **sem sobrescrever** o que já existir ao vivo.

Históricos ao vivo usam **schema v2** (UUID + label + `mtime`; `checked` opcional só em pagamentos/observações/extras); ver `docs/agent-memory/data-schema-v2.md`. Edite seed aqui, commit, e depois copie manualmente ou use bootstrap/migração para o disco ao vivo se precisar atualizar produção local.

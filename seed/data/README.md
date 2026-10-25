# Seed de `data/` (versionado)

Cópia inicial dos JSON de tabelas e históricos base. No **Windows**, o runtime usa `C:\auto-orcamento\data\` (`server/paths.js`; override `DATA_DIR`).

Na primeira abertura (ou se faltar arquivo), `server/data-bootstrap.js` copia daqui para `dataDir` **sem sobrescrever** o que já existir ao vivo.

Edite catálogos aqui no repo, commit, e depois copie manualmente ou redeploy para o disco ao vivo se precisar atualizar produção local.

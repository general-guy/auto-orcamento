# Tauri — fase legada (congelada)

Código do experimento Tauri (executável `.exe` + Rust). **Não use no dia a dia** — o fluxo ativo é `abrir-auto-orcamento.bat` na raiz do projeto.

| Arquivo | Função |
|---|---|
| `build-auto-orcamento-tauri.bat` | Build release e abre o `.exe` |
| `auto-orcamento.exe` | Executável gerado (`.gitignore`) |
| `src-tauri/` | Projeto Rust/Tauri 2 |
| `scripts/copy-release-exe.cjs` | Copia o build para esta pasta |

Build a partir da raiz do repo:

```text
tauri-fase_legado\build-auto-orcamento-tauri.bat
```

Ou: `npm run tauri:build` (na raiz).

Documentação: `docs/SNAPSHOT-tauri-v0.2.0-paused.md`, `docs/MIGRATION-tauri.md`.

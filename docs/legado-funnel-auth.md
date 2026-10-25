# Legado: Funnel + auth por token (removido)

**Status:** removido do repositório em outubro/2026. Não há atalho nem código ativo. Produção clínica usa Tailscale Serve no Axis (mesma tailnet), não Funnel público neste PC.

## O que era

Modo de teste no **Atlas (Windows)** para outro consultório abrir o app pela **internet pública** sem Tailscale:

| Peça | Função |
|------|--------|
| `iniciar-acesso-remoto.bat` | Atalho que subia o supervisor |
| `scripts/remote-access-host.js` | Node com `AUTH_ENABLED=1`, Tailscale Funnel na porta 3000, WebView2 local |
| `server/auth.js` | Sessões em memória + convites em `data/auth-users.json` |
| `data/auth-users.json` | Tokens de uso único (hash), validade, `usedAt` (gitignored) |
| `web/login.html` / `web/login.js` | Login remoto com token |
| `web/auth-admin.js` + barra na `index.html` | **Criar acesso** / copiar token (só no PC servidor) |

Fluxo: administrador local gerava token → visitante abria URL HTTPS do Funnel → colava token → sessão ~12 h.

## Por que saiu

- Exposição à internet pública com dados de orçamento (inadequado para clínica).
- Duplicava o papel do Axis + Serve na tailnet.
- Manutenção paralela (auth, UI, APIs `/api/auth/*`) sem uso no dia a dia.

## Recuperar no Git

Commits anteriores a outubro/2026 ainda contêm os arquivos. Branch/tag de referência Tauri (outro legado): `stable/tauri-v0.2.0-paused`.

## Substituto canônico

Ver [`atlas-axis.md`](atlas-axis.md) e [`acesso-remoto.md`](acesso-remoto.md) (só Serve / tailnet).

# Acesso remoto (Tailscale Funnel)

Permite que outro consultório use o Auto Orçamento pela internet, **sem instalar Tailscale**, com autenticação por **token de uso único**.

## Quando usar

| Atalho | Cenário |
|--------|---------|
| `abrir-auto-orcamento.bat` | Uso local no dia a dia |
| `iniciar-acesso-remoto.bat` | Consultório remoto precisa acessar pela internet |

## Pré-requisitos (uma vez)

1. [Tailscale](https://tailscale.com/) instalado e logado no PC servidor
2. **MagicDNS** e **HTTPS** habilitados em [login.tailscale.com/admin/dns](https://login.tailscale.com/admin/dns)
3. **Funnel** aprovado no tailnet (o CLI mostra um link na primeira execução)
4. Executar `iniciar-acesso-remoto.bat` **como Administrador** (necessário para o Funnel no Windows)

## Fluxo no PC servidor

1. Execute `iniciar-acesso-remoto.bat`
2. O terminal mostra a URL pública, por exemplo `https://geraldo-server.tail5fe4b7.ts.net`
3. O WebView2 abre automaticamente com a barra **PC local**
4. Clique em **Criar acesso** → **Copiar token** → envie URL + token ao consultório remoto

## Fluxo no PC remoto

1. Abra a URL HTTPS completa (sem caminhos extras no final)
2. Cole o token na tela **Acesso remoto**
3. Sessão válida por **12 horas** após entrar
4. O token em si é de **uso único** — após o primeiro login, não funciona de novo

## Encerrar o acesso remoto

No terminal do `iniciar-acesso-remoto.bat`:

- **`Q` + Enter** — encerra servidor e desativa o Funnel (recomendado)
- Fechar o terminal pelo **X** — tenta o mesmo cleanup; se o Funnel continuar ativo, rode `tailscale funnel reset`

Fechar **só a janela do app** não encerra o servidor nem o Funnel.

## Comportamento dos dois atalhos

| Ação | `abrir-auto-orcamento.bat` | `iniciar-acesso-remoto.bat` |
|------|---------------------------|----------------------------|
| Autenticação | Desligada | Ligada (`AUTH_ENABLED=1`) |
| Tailscale Funnel | Não | Sim |
| Fechar WebView2 | Encerra o servidor | **Não** encerra o servidor |
| Botão **Criar acesso** | Oculto | Visível (**PC local**) |
| Servidor já na porta 3000 | Reutiliza (`--keep-server`) | — |

Se o modo remoto já estiver ativo, `abrir-auto-orcamento.bat` abre outra janela do app **sem derrubar** o servidor.

## Segurança

- Apenas **guests** entram pelo Funnel (token). Não há login de administrador remoto.
- Gerar tokens e revogar convites só funciona no **PC local** (`127.0.0.1`).
- Tokens são armazenados como hash (`scrypt`); o valor em texto aparece **uma vez** na criação.
- `data/auth-users.json` não é versionado (`.gitignore`).
- Arquivos em `data/` (exceto tabelas de referência) e `output/` ficam bloqueados para visitantes não autenticados.

## Arquivos envolvidos

| Arquivo | Função |
|---------|--------|
| `iniciar-acesso-remoto.bat` | Atalho; chama o supervisor |
| `scripts/remote-access-host.js` | Sobe servidor, Funnel, WebView2; aguarda `Q` |
| `auth.js` | Sessões, tokens, middleware local/remoto |
| `login.html` / `login.js` | Tela de login remoto |
| `auth-admin.js` | **Criar acesso** e **Copiar token** (só modo local) |
| `data/auth-users.json` | Convites (criado em runtime) |

## Limitações no acesso remoto

- **Abrir** snapshot: o seletor de arquivo nativo abre no **servidor**, não no PC remoto
- PDFs gerados ficam em `output/` no **servidor**
- `window.print()` imprime no PC remoto

## Solução de problemas

| Problema | Causa provável | Ação |
|----------|----------------|------|
| `Funnel is not enabled` | Funnel não aprovado no tailnet | Abrir o link que o CLI mostra |
| `AppApi is not defined` | Servidor desatualizado | Reiniciar `iniciar-acesso-remoto.bat` |
| `Arquivo não encontrado` na URL | URL incompleta (ex.: `/l` no final) | Usar só `https://…ts.net` |
| Token inválido | Token já usado ou expirado | Gerar novo token no PC local |
| Botão **Criar acesso** sempre visível | CSS antigo em cache | Recarregar ou reiniciar o app |

# Acesso remoto

**Produção clínica:** o app no **Axis** — `https://axis.tail5fe4b7.ts.net/` — via Tailscale Serve no host Proxmox. O cliente (celular, tablet ou browser neste PC) precisa estar na mesma tailnet. **Sem Funnel.** Ver [`atlas-axis.md`](atlas-axis.md).

O restante deste arquivo descreve o modo **legado neste Windows**: Tailscale Funnel + token de uso único (`iniciar-acesso-remoto.bat`). Não usar para dados clínicos na internet pública.

## Funnel neste PC (legado)

Permite que outro consultório abra o app pela internet **sem instalar Tailscale**, com autenticação por **token de uso único**. Isso expõe **este** clone Atlas, não o Axis.

## Quando usar

| Atalho / URL | Cenário |
|--------|---------|
| `abrir-auto-orcamento.bat` | Desenvolvimento neste PC (Atlas) |
| `https://axis.tail5fe4b7.ts.net/` | Produção (celular/tablet na tailnet) |
| `iniciar-acesso-remoto.bat` | Só teste legado de Funnel **neste** Windows |

## Pré-requisitos (uma vez, só para o Funnel legado)

1. [Tailscale](https://tailscale.com/) instalado e logado **neste** PC
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

## Abrir e Imprimir no acesso remoto

O diálogo nativo de arquivos (`POST /api/open-snapshot`) **não** é usado remotamente — ele abriria janelas no PC servidor e daria acesso ao sistema de arquivos. Em vez disso:

| Ação | PC local (servidor) | PC remoto (cliente) |
|------|---------------------|---------------------|
| **Abrir** | Seletor nativo do Windows (qualquer pasta) | **Caixa dedicada** com os `.json` de `output/` (somente leitura) |
| **Imprimir** | Gera PDF + JSON em `output/`, reconstrói `export/orcamentos.sqlite`, depois diálogo de impressão | Só `window.print()` no navegador do cliente (use “Salvar como PDF” se quiser arquivo; **não** atualiza `output/` nem o SQLite) |

Ao **iniciar** o servidor no PC (incluindo `iniciar-acesso-remoto.bat`), o SQLite já é reconstruído a partir de `output/` — mesmo sem impressão local.

### Caixa dedicada de orçamentos (`output/`)

No cliente remoto, **Abrir** abre um modal que:

- lista apenas arquivos `.json` em `output/` no servidor;
- permite filtrar por nome;
- **não** permite navegar em outras pastas, editar nem apagar arquivos.

APIs (autenticadas, somente leitura):

- `GET /api/snapshots` — lista `{ name, modifiedAt, size }`
- `GET /api/snapshots/:nome` — lê um snapshot (validação estrita: só `output/`, só `.json`, sem `..`)

`POST /api/open-snapshot` retorna **403** para requisições remotas.

## Segurança

- Apenas **guests** entram pelo Funnel (token). Não há login de administrador remoto.
- Gerar tokens e revogar convites só funciona no **PC local** (`127.0.0.1`).
- Tokens são armazenados como hash (`scrypt`); o valor em texto aparece **uma vez** na criação.
- `data/auth-users.json` não é versionado (`.gitignore`).
- Arquivos em `data/` (exceto tabelas de referência) ficam bloqueados para visitantes não autenticados.
- `output/` não é servido como arquivo estático; o remoto acessa snapshots **só** via `/api/snapshots`.

## Arquivos envolvidos

| Arquivo | Função |
|---------|--------|
| `iniciar-acesso-remoto.bat` | Atalho; chama o supervisor |
| `scripts/remote-access-host.js` | Sobe servidor, Funnel, WebView2; aguarda `Q` |
| `server/auth.js` | Sessões, tokens, middleware local/remoto |
| `web/login.html` / `web/login.js` | Tela de login remoto |
| `web/auth-admin.js` | **Criar acesso** e **Copiar token** (só modo local) |
| `web/app.js` | Detecção de sessão remota; modal de snapshots |
| `data/auth-users.json` | Convites (criado em runtime) |

## Solução de problemas

| Problema | Causa provável | Ação |
|----------|----------------|------|
| `Funnel is not enabled` | Funnel não aprovado no tailnet | Abrir o link que o CLI mostra |
| `AppApi is not defined` | Servidor desatualizado | Reiniciar `iniciar-acesso-remoto.bat` |
| `Arquivo não encontrado` na URL | URL incompleta (ex.: `/l` no final) | Usar só `https://…ts.net` |
| Token inválido | Token já usado ou expirado | Gerar novo token no PC local |
| Botão **Criar acesso** sempre visível | CSS antigo em cache | Recarregar ou reiniciar o app |
| **Abrir** abre janelas no servidor | Versão antiga sem caixa dedicada | Reiniciar servidor com código atual |
| Lista de orçamentos vazia | Nenhum JSON em `output/` ainda | Imprimir um orçamento no servidor antes |

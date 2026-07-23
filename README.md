# Auto Orçamento

Aplicativo local para gerar orçamentos cirúrgicos em papel timbrado, com preenchimento rápido, histórico de campos e pré-visualização pronta para impressão.

## Fluxo ativo (desenvolvimento diário)

Use **`abrir-auto-orcamento.bat`** (Node.js + janela WebView2 nativa). Esta é a **única stack em evolução** na `main`.

A migração **Tauri está congelada** — não há desenvolvimento ativo em Rust nem no branch `feature/tauri`. O código Tauri permanece em **`tauri-fase_legado/`** só como referência histórica (`stable/tauri-v0.2.0-paused`).

O `.bat` abre **sem janelas de terminal visíveis**: relança-se em modo oculto via `launcher/launch-hidden.vbs` e o servidor Node arranca com `CREATE_NO_WINDOW`. Só aparece a janela do app — WebView2 via `pywebview`, com ícone `.ico` nítido na barra de tarefas. Requer **Node.js** e **Python** com `pywebview` (`python -m pip install -r launcher/requirements.txt`).

**Não edite `tauri-fase_legado/`** no fluxo diário — evita `cargo check`, Rust Analyzer e `tauri:dev`, que recriam `tauri-fase_legado/src-tauri/target/` (centenas de MB). Para retomar Tauri no futuro, parta de `stable/tauri-v0.2.0-paused` e de `docs/MIGRATION-tauri.md`.

## Estrutura da raiz

Na raiz ficam só os **atalhos de uso** e o **mínimo para o app Node** rodar:

| Na raiz | Função |
|---|---|
| `abrir-auto-orcamento.bat` | Uso local (duplo clique) |
| `iniciar-acesso-remoto.bat` | Acesso remoto via Tailscale |
| `package.json` / `package-lock.json` | Dependências npm |
| `README.md` | Este guia |

| Pasta | Função |
|---|---|
| `web/` | Frontend: HTML, CSS e JavaScript do app |
| `server/` | Backend Node: HTTP, APIs, PDF e diálogos |
| `launcher/` | WebView2, fallback navegador e consola oculta |
| `tauri-fase_legado/` | `.exe`, build Tauri e `src-tauri/` (congelado) |
| `assets/`, `data/`, `output/` | Recursos, JSONs e PDFs |
| `docs/` | Arquitetura e snapshots |
| `scripts/` | Utilitários de build e acesso remoto |

**URLs no browser:** o código-fonte fica em `web/` e `server/`, mas o app continua abrindo em `http://localhost:3000` com caminhos na raiz (`/app.js`, `/styles.css`, `/assets/papel-timbrado.png`, `/data/*.json`). O `server/server.js` mapeia o primeiro segmento da URL: `assets/`, `data/` e `output/` vêm da raiz do repo; o restante vem de `web/`.

| Referência | Branch / tag | Documento |
|---|---|---|
| **Desenvolvimento ativo** | `main` | este README |
| Node pré-WebView2 | `stable/node-web-v0.1.0` / `v0.1.0-node-web` | `docs/SNAPSHOT-node-web-v0.1.0.md` |
| Tauri congelado (Fases 1–3) | `stable/tauri-v0.2.0-paused` / `v0.2.0-tauri-paused` | `docs/SNAPSHOT-tauri-v0.2.0-paused.md` |
| `feature/tauri` (congelada) | `a739f1f` | mergeada em `main` em 2026-06-26; **sem novos commits** |

## Como Usar

O web app (`web/index.html`, `web/app.js`, `web/api.js`, `web/styles.css`, `assets/`, `data/`) roda via **Node + WebView2**. Novas funcionalidades devem ser implementadas nessa stack — **sem depender de Rust/Tauri**.

| Fluxo | Atalho | Quando usar |
|-------|--------|-------------|
| **Node + WebView2** | `abrir-auto-orcamento.bat` | Uso diário e desenvolvimento |
| **Acesso remoto** | `iniciar-acesso-remoto.bat` | Consultório remoto via Tailscale Funnel + token |
| ~~Tauri (`.exe`)~~ | congelado | ver `stable/tauri-v0.2.0-paused` para retomada futura |

Detalhes do acesso remoto: [`docs/acesso-remoto.md`](docs/acesso-remoto.md).

Históricos, tabelas, PDFs e snapshots JSON ficam em **`data/`** e **`output/`** na raiz do repo.

**Depois de editar o código:** abra de novo com `abrir-auto-orcamento.bat` (ou `npm start`) — não precisa de build.

### `abrir-auto-orcamento.bat`

No Windows, clique duas vezes em:

```text
abrir-auto-orcamento.bat
```

Requer **Node.js** instalado. O atalho instala dependências se faltar `node_modules`, **inicia o Node em background** e abre o WebView2 em paralelo (`pythonw launcher/native_launcher.py --external-server`). A janela abre **já maximizada**. O formulário aparece assim que a página carrega; históricos e tabelas continuam a carregar em seguida. **Fechar a janela (X)** encerra o servidor Node automaticamente.

Se o servidor remoto já estiver ativo (`iniciar-acesso-remoto.bat`), o `.bat` **só abre a janela** e não reinicia nem encerra o servidor (`--keep-server`).

Pode haver um **flash breve** do CMD ao duplo clique — o Windows abre o `.bat` antes do relançamento oculto. Se o launcher nativo falhar, o fallback `launcher/launch-app.js` (Chrome/Edge) **mostra** um terminal de propósito, para facilitar diagnóstico.

### Desempenho de abertura e fechamento

| Fase | Comportamento |
|---|---|
| **Abertura** | O `.bat` inicia `node server/server.js` em background (que libera a porta 3000 se necessário) e abre o WebView2 em paralelo, **maximizado desde o início**. O launcher Python aguarda até ~800 ms pelo Node antes de decidir entre o app ou o splash `assets/launcher.html`. O formulário e o preview aparecem cedo; históricos e tabelas carregam em seguida (`initializeApp()` em background). |
| **Gargalo principal** | O **primeiro** arranque do WebView2 no dia (runtime frio no Windows) ainda pode levar alguns segundos — limitação do sistema, não do Node. Aberturas seguintes no mesmo dia tendem a ser mais rápidas. |
| **Fechamento** | **Fechar pelo X** é o fluxo normal: a janela some na hora; o Python encerra o Node **uma vez** no `finally` (`POST /api/shutdown`). Se a API falhar, libera a porta 3000 como fallback. |

Otimizações aplicadas na stack atual: Node e WebView2 em paralelo, liberação assíncrona da porta 3000 só no `server/server.js` (sem PowerShell), splash local, scripts com `defer`, `web/pdf-build.js` fora do caminho crítico (só Tauri), carregamento sob demanda de `server/pdf-export.js` e `server/snapshot-open-dialog.js` no servidor, e históricos carregados sem bloquear a UI.

### Evolução recente na `main` (desde `stable/node-web-v0.1.0`)

| Área | Mudança |
|---|---|
| Acesso remoto | Tailscale Funnel + tokens de uso único; `iniciar-acesso-remoto.bat` + `docs/acesso-remoto.md` |
| Launcher | Janela **WebView2 nativa** (`launcher/native_launcher.py`), **maximizada ao abrir**, consola oculta (`launcher/launch-hidden.vbs`), ícone `.ico` na barra de tarefas |
| Startup | Node em background + `--external-server`; poll breve pelo Node; splash `assets/launcher.html`; módulos pesados lazy no servidor; scripts com `defer` |
| Impressão | `@media print` anula zoom da UI — papel alinhado ao PDF automático |
| Snapshot | Exportação JSON na impressão + botão **Abrir** com seletor nativo HiDPI (pywebview/WebView2) |
| Robustez | Liberação da porta 3000 no arranque do `server/server.js`; encerramento confiável ao fechar pelo X |

Detalhes técnicos: `docs/ARCHITECTURE.md`. Baseline congelada pré-WebView2: `docs/SNAPSHOT-node-web-v0.1.0.md`.

Se `pythonw` não estiver disponível, o `.bat` cai para Chrome/Edge em modo app (`launcher/launch-app.js`) — nesse modo o ícone da barra pode ficar borrado e um terminal permanece visível.

### `iniciar-acesso-remoto.bat`

Expõe o app na internet via **Tailscale Funnel**, com login por **token de uso único** (128 bits, Base64). Requer Tailscale no PC servidor, HTTPS habilitado no tailnet e execução **como Administrador**.

```text
iniciar-acesso-remoto.bat
```

O script (`scripts/remote-access-host.js`):

1. Sobe `server/server.js` com `AUTH_ENABLED=1`
2. Ativa `tailscale funnel` na porta 3000
3. Abre o WebView2 local (barra **PC local** + **Criar acesso**)
4. Aguarda **`Q`** no terminal para encerrar servidor e Funnel

No PC remoto: acesse a URL `https://…ts.net`, cole o token e use o app (sessão de 12 h).

**Fechar a janela do app não encerra o servidor.** Use **`Q`** no terminal para desligar tudo (forma mais confiável que fechar o terminal pelo X).

Guia completo: [`docs/acesso-remoto.md`](docs/acesso-remoto.md).

### Equivalente manual (debug local)

```bash
npm install
python -m pip install -r launcher/requirements.txt
python launcher/native_launcher.py
```

Fallback no navegador (ícone possivelmente borrado na barra de tarefas):

```bash
node launcher/launch-app.js
```

## Requisitos

### Stack Node (ativa)

| Recurso | Necessário |
|---|---|
| Node.js LTS | Sim |
| npm | Sim (vem com Node) |
| Python 3 + pywebview | Sim (janela nativa WebView2; `pip install -r launcher/requirements.txt`) |
| Google Chrome ou Microsoft Edge | Sim (PDF automático e fallback `launcher/launch-app.js`) |
| Tailscale | Só para `iniciar-acesso-remoto.bat` (PC servidor) |
| Internet | Só na primeira execução, se `node_modules` ainda não existir |

Para migrar a pasta para outro PC: instale Node.js e Python, copie o projeto (de preferência com `node_modules` incluído) e execute `abrir-auto-orcamento.bat`.

Não são necessários Rust, PowerShell nem Git para uso normal.

## Branches e snapshots

| Referência | Uso |
|---|---|
| **`main`** | Desenvolvimento ativo (Node + WebView2) |
| `stable/node-web-v0.1.0` | Node clássico congelado (pré-WebView2); tag `v0.1.0-node-web` |
| `stable/tauri-v0.2.0-paused` | Tauri congelado (Fases 1–3); tag `v0.2.0-tauri-paused` |
| `feature/tauri` | Congelada em `a739f1f` — sem novos commits |

Detalhes: `docs/SNAPSHOT-node-web-v0.1.0.md`, `docs/SNAPSHOT-tauri-v0.2.0-paused.md`, `docs/MIGRATION-tauri.md`.

Para a baseline Node antiga: `git checkout stable/node-web-v0.1.0` e `npm install`.

## Tauri congelado (referência histórica)

> **Não use no dia a dia.** O código Tauri/Rust em `tauri-fase_legado/` permanece no repositório como referência; **não recebe novas features** na `main`.

O experimento Tauri (executável `.exe` via WebView2 + Rust) parou nas Fases 1–3. Estado preservado em `stable/tauri-v0.2.0-paused`. Build: `tauri-fase_legado/build-auto-orcamento-tauri.bat`. Instruções de paridade e retomada futura estão em `docs/SNAPSHOT-tauri-v0.2.0-paused.md` e `docs/MIGRATION-tauri.md`.

**Cache Rust:** `tauri-fase_legado/src-tauri/target/` pode ocupar centenas de MB ou GB após builds antigos. Está no `.gitignore`. Para liberar espaço:

```powershell
cd tauri-fase_legado/src-tauri
cargo clean
```

Não inclua `tauri-fase_legado/src-tauri/target/` ao copiar o projeto. O uso diário continua sendo **`abrir-auto-orcamento.bat`**.

## Zoom da interface

`Ctrl` + roda do mouse, `Ctrl` + `+` / `Ctrl` + `-` (passos de 10%, entre 50% e 200%) e `Ctrl` + `0` para voltar a 100%. O nível fica salvo em `data/settings.json`. Um indicador flutuante (estilo Chrome) mostra a porcentagem, botões `−`/`+` e **Redefinir**. No fallback `launcher/launch-app.js` (Chrome/Edge), vale o zoom nativo do navegador.

No **Node (WebView2)**, o zoom escala só a interface na tela (`transform: scale()` no `body`). A **impressão do navegador** (`window.print()`) ignora esse zoom: `@media print` em `styles.css` restaura dimensões A4 e anula o transform, para o papel sair igual ao PDF automático.

Preferências locais (zoom e última pasta do botão **Abrir**) ficam em `data/settings.json`.

**Ícone do app:** `npm run icon:web` sincroniza `assets/app-icon.ico` e favicons (G dourado em círculo preto).

## Ambiente Recomendado

Para manutenção do projeto no Windows, recomenda-se usar PowerShell 7 (`pwsh`) como terminal padrão do Cursor, em vez do Windows PowerShell antigo (`powershell.exe`). O `pwsh` aceita operadores modernos como `&&` e evita diferenças de sintaxe do Windows PowerShell 5.1.

Se necessário, instale com:

```powershell
winget install Microsoft.PowerShell
```

Depois configure o Cursor para abrir novos terminais com o perfil `PowerShell 7`.

## O Que o App Faz

- Preenche os dados da paciente, cirurgia, hospital, implantes, tecnologias, equipe, extras, formas de pagamento e observações.
- Mostra uma pré-visualização paginada do documento final sobre o papel timbrado.
- Permite imprimir o orçamento e, ao clicar em `Imprimir orçamento`, gera automaticamente um **PDF** e um **JSON de snapshot** em `output/`.
- Permite **reabrir** um orçamento anterior com o botão **Abrir** (verde, ao lado de **Limpar**; JSON exportado na impressão), restaurando o formulário e a pré-visualização.
- Guarda histórico local de pacientes, cirurgias, hospitais, extras, formas de pagamento, observações e tecnologias.
- Permite reordenar por drag and drop os dropdowns de histórico (**Nome**, **Cirurgia**, **Hospital**, **Tecnologias**, **Extras adicionais**, **Pagamento** e **Observações adicionais**), com ordem persistida nos JSON correspondentes; reordenar entradas de cirurgia nos campos do formulário (só visual/preview); e reordenar as listas rápidas de extras, pagamento e observações.
- Cria múltiplas entradas de cirurgia e hospital.
- Para Regina e Sapiranga, cria entradas auxiliares (`Reg1`, `Sap1`, etc.) com multiplicadores e tabelas locais.
- Para hospitais cujo nome contém `Unimed N`, cria entradas auxiliares (`Uni1`, `Uni2`, etc.) com valor monetário editável em `data/unimed-n.json`.
- Usa tabelas hospitalares locais (Regina/Sapiranga) para sugerir pacotes e calcular valores auxiliares no preview.
- Permite incluir uma seção opcional de implantes, alimentada por `data/tabela-implantes.json`.
- Permite incluir uma seção opcional de tecnologias, com nome e valor salvos em `data/tecnologias.json`.
- Mantém uma seção fixa de equipe com itens pré-marcados e valor normalizado em moeda brasileira.
- Agrupa as seções do formulário em blocos com borda cinza discreta para facilitar a leitura do painel esquerdo.

## Dados Locais

Os históricos ficam em arquivos JSON dentro de `data/`:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
data/extras.json
data/pagamentos.json
data/observacoes.json
data/tecnologias.json
data/unimed-n.json
```

As tabelas de referência estruturadas ficam em:

```text
data/tabelas-hospitalares.json
data/tabela-implantes.json
```

Esses arquivos são usados pelo servidor Node e são versionados no repositório como base inicial. Quando o app altera históricos como extras, pagamentos, observações, tecnologias ou procedimentos Unimed N, essas mudanças ficam locais até serem adicionadas a um commit. A ordem dos históricos pode ser ajustada pelo drag and drop nos dropdowns (handle `⋮⋮`, com duas ou mais opções visíveis) — persiste nos JSON correspondentes. As tabelas hospitalares e de implantes podem ser editadas manualmente em `data/`; basta reabrir o app para carregar as alterações.

Os PDFs gerados automaticamente ficam em:

```text
output/
```

Essa pasta não é versionada no Git. Cada exportação usa o nome da paciente, ` - `, a **primeira cirurgia proposta** (se preenchida) e a data/hora, por exemplo `Maria da Silva - Abdominoplastia 2026-06-18 14-30-05.pdf` e o `.json` com o mesmo nome base.

## Impressão, PDF e snapshot JSON

Ao clicar em `Imprimir orçamento`:

1. `app.js` salva históricos pendentes.
2. `budget-snapshot.js` monta o snapshot do formulário (`schemaVersion: 1`).
3. `AppApi.exportPdf()` envia `pagesHtml` + `snapshot` para `POST /api/pdf` (sem montar PDF no browser — isso fica no servidor).
4. `server/server.js` + `server/pdf-export.js` gravam **PDF** e **JSON** em `output/` (mesmo nome base).
5. Só então abre `window.print()`.

Se a exportação falhar (ex.: Chrome/Edge ausente ou bloqueado pelo sistema), aparece um **alert** com a mensagem de erro.

**Impressão vs PDF:** o PDF em `output/` é renderizado no servidor (HTML isolado, sem zoom da UI). O diálogo **Imprimir** usa o DOM da janela; por isso `@media print` anula o `transform` de zoom e `min-height` da shell — evita conteúdo deslocado e folha em branco extra quando o zoom não está em 100%.

- **PDF:** HTML paginado da pré-visualização; timbrado, fontes e estilos embutidos no servidor (Puppeteer + Chrome/Edge).
- **JSON:** textos, checkboxes de seções opcionais, listas rápidas (marcados e desmarcados), equipe, hospitais com detalhes/multiplicadores, implante selecionado, etc. Ex.: `Maria da Silva - Abdominoplastia 2026-06-26 14-30-05.json`.

Colisões de nome recebem sufixo `(2)`, `(3)`, etc. **Requisito:** Chrome ou Edge instalado (mesmo do PDF automático).

> **Nota:** snapshot JSON existe **apenas na stack Node**. Tauri congelado não recebe esta funcionalidade.

Depois de alterar código, **reabra** o app (`abrir-auto-orcamento.bat`) para carregar o JavaScript atualizado.

## Abrir orçamento salvo

O botão **Abrir** (verde, ao lado de **Limpar**) carrega um snapshot JSON gerado na impressão (ex.: `output/Maria da Silva - Abdominoplastia 2026-06-26 14-30-05.json`).

### Uso local

1. No Windows, o servidor Node abre um **seletor nativo** via **pywebview** (WebView2, mesma stack do app; nítido em telas HiDPI), com fallback para PowerShell e tkinter.
2. A pasta inicial é a **última usada** (`lastSnapshotDir` em `data/settings.json`), com fallback em `output/`; a raiz do perfil do usuário (`C:\Users\...`) nunca é reutilizada como pasta salva. Após imprimir, a pasta `output/` também é gravada automaticamente.
3. Ao escolher um arquivo, o app valida `schemaVersion: 1`, repopula o formulário e atualiza a pré-visualização.

### Acesso remoto (Funnel)

No PC cliente, **Abrir** abre uma **caixa dedicada** com os orçamentos salvos em `output/` no servidor — somente leitura, sem acesso ao restante do sistema de arquivos. Detalhes em [`docs/acesso-remoto.md`](docs/acesso-remoto.md).

Campos dinâmicos (cirurgias, hospitais com entradas auxiliares, extras, pagamento, observações), checkboxes de seções opcionais, listas rápidas e equipe são restaurados. Implantes são reassociados pelo índice ou por marca/modelo/referência na tabela local.

## Hospitais Com Entradas Auxiliares

A seção `Hospital` tem checkbox no título e vem marcada por padrão a cada nova sessão do app. Quando desmarcada, o conteúdo da seção é recolhido no painel esquerdo e o bloco de hospital deixa de aparecer no documento.

O dropdown de histórico do nome do hospital aceita reordenação pelo handle `⋮⋮` (ordem em `data/hospitais.json`).

### Regina e Sapiranga (tabela + autofill)

O botão verde ao lado do hospital preenche e reorganiza as entradas auxiliares.

Para Sapiranga, os pacotes de centro cirúrgico ficam no topo, ordenados do maior valor para o menor, e recebem multiplicadores progressivos. Depois vêm os pacotes de ambulatório, a hora excedente e, por último, as diárias. Diárias não entram no cálculo de tempo de sala e mantêm o multiplicador normal.

Para Regina, o app ordena os pacotes por valor decrescente e aplica multiplicadores automáticos (`1`, `0.7` e `0.5`) apenas sobre o valor de cada pacote. Adicionais de sala e pernoite de recuperação ficam depois, na ordem do JSON. Se faltar tempo em relação ao tempo previsto de hospital, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE` com multiplicador em unidades de meia hora, usando sempre o tempo bruto dos pacotes no cálculo.

Nos campos auxiliares `Reg#` e `Sap#`, a busca de pacotes/taxas usa um dropdown customizado (`#hospitalProcedureDropdown`): abre **à direita** do campo, ocupa **toda a altura visível da janela** e filtra conforme a digitação. Fonte: `data/tabelas-hospitalares.json`.

### Unimed N (histórico editável)

Quando o nome do hospital contém `Unimed N` (ex.: `Unimed Novo Hamburgo`), o app cria entradas `Uni1`, `Uni2`, etc., com campo de procedimento e caixa de valor (`R$` ao lado; número dentro do input). Não há botão verde de autofill.

Os procedimentos ficam em `data/unimed-n.json` (`{ nome, valor }`), editáveis pelo uso do app (salvar ao sair do campo, remover pelo `x` no dropdown). Detalhes em `docs/unimed-n.md`.

Nos campos `Uni#`, o mesmo `#hospitalProcedureDropdown` lista o histórico Unimed N.

## Implantes

A seção `Implantes` é opcional. Ao marcar o checkbox no título da seção, o dropdown é exibido e habilitado, e o implante selecionado aparece no documento em uma caixa arredondada. Quando desmarcada, o conteúdo da seção fica oculto e o espaçamento vertical é reduzido no painel esquerdo para economizar espaço visual.

O dropdown usa `rotulo`, `modelo` e `referencia`. Itens marcados com `favorito: true` recebem destaque e uma estrela no final da opção.

No documento, a caixa mostra a descrição do implante à esquerda e os valores à direita: primeiro o valor à vista, depois o valor em 7x no cartão.

## Tecnologias

A seção `Tecnologias` é opcional. Ao marcar o checkbox no título da seção, os campos de tecnologia e valor são exibidos e habilitados. Quando desmarcada, o conteúdo da seção fica oculto e o espaçamento vertical é reduzido no painel esquerdo para economizar espaço visual.

Cada tecnologia salva o `nome` junto com seu `valor`. Ao selecionar uma tecnologia já cadastrada, o valor correspondente é carregado automaticamente. O dropdown de histórico também permite reordenar entradas pelo handle `⋮⋮` (ordem em `data/tecnologias.json`). O campo de valor normaliza moeda em padrão brasileiro, por exemplo `10000` vira `R$ 10.000,00`.

No documento, a tecnologia aparece em uma caixa arredondada com o nome à esquerda e o valor alinhado à direita.

## Equipe

A seção `Equipe` é fixa e vem com os itens `Cirurgião`, `Anestesista`, `Auxiliar`, `Eq. Enfermagem`, `Modelador`, `Placas` e `Meias` pré-marcados.

No formulário, os itens ficam em três colunas. O campo `Valor:` normaliza moeda em padrão brasileiro, como `10000` para `R$ 10.000,00`.

No documento, a caixa de equipe mostra os itens marcados separados por ` + ` e o valor alinhado à direita.

## Cirurgia

A seção `Cirurgia` usa campos dinâmicos com botões `+/-`, no mesmo padrão de `Hospital` e `Pagamento`. Cada entrada preenchida pode ser reaproveitada pelo dropdown de histórico e salva em `data/cirurgias.json`.

No dropdown de histórico, com duas ou mais opções visíveis, o handle `⋮⋮` à esquerda permite reordenar o histórico; a ordem persiste em `data/cirurgias.json`. O menu fecha ao sair do campo ou do dropdown.

Com duas ou mais cirurgias propostas **nos campos do formulário**, aparece outro indicador `⋮⋮` à esquerda de cada caixa de texto. Esse drag and drop é só visual: reorganiza os campos no painel e a ordem exibida no preview do documento, sem alterar a ordem do histórico em `data/cirurgias.json`.

## Extras

A seção `Extras` é opcional e fica antes de `Pagamento`. Ao marcar o checkbox no título da seção, a lista rápida, os campos adicionais e o bloco correspondente no documento são exibidos e habilitados. Quando desmarcada, o conteúdo da seção fica oculto, o espaçamento vertical é reduzido no painel esquerdo e os extras deixam de aparecer no preview.

No painel esquerdo, `Extras padrão` usa uma lista rápida alimentada por `data/extras.json`, com checkboxes marcados por padrão, botão `×` e drag and drop com persistência da ordem no JSON.

A lista rápida aceita drag and drop para reorganizar os extras. Ao soltar um item em outra posição, a ordem visual, o preview do documento e o arquivo `data/extras.json` são atualizados juntos.

`Extras adicionais` usa campos dinâmicos com dropdown de histórico e botões `+/-`, permitindo incluir novas entradas, reutilizar existentes ou excluir opções antigas. O dropdown aceita reordenação pelo handle `⋮⋮` (mesmo JSON da lista rápida).

No documento final, os extras aparecem como lista com marcadores redondos, com espaçamento de `6px` entre os itens.

## Atalhos de teclado

Nos campos dinâmicos de `Cirurgia`, `Hospital`, `Extras`, `Pagamento` e `Observações`, `Shift+Enter` adiciona outra linha na mesma seção. `Enter` avança apenas para a próxima linha da mesma seção; no último campo da seção, tira o foco da caixa atual para salvar no histórico e atualizar o preview, sem pular para a seção seguinte.

Nos demais campos de texto, `Enter` continua avançando para o próximo campo habilitado do formulário.

## Pagamento

A seção `Pagamento` reúne somente as formas de pagamento. No painel esquerdo, ela usa campos dinâmicos com botões `+/-`, seguindo o mesmo padrão da seção `Cirurgia`.

Cada forma preenchida pode ser reaproveitada pelo dropdown de histórico, salvo em `data/pagamentos.json`. O dropdown aceita reordenação pelo handle `⋮⋮` (mesmo JSON da lista rápida). As entradas salvas também aparecem como uma lista rápida acima do campo manual, com checkboxes marcados por padrão e botão de exclusão integrado ao histórico.

A lista rápida aceita drag and drop para reorganizar as formas de pagamento. Ao soltar um item em outra posição, a ordem visual, o preview do documento e o arquivo `data/pagamentos.json` são atualizados juntos.

No documento final, as formas de pagamento preenchidas aparecem como parágrafos sem marcadores, com espaçamento leve entre cada item.

## Observações

A seção `Observações` usa uma lista rápida de observações padrão alimentada por `data/observacoes.json`. As entradas aparecem com checkboxes marcados por padrão e podem ser removidas do histórico pelo botão `×`.

A lista rápida aceita drag and drop para reorganizar as observações. Ao soltar um item em outra posição, a ordem visual, o preview do documento e o arquivo `data/observacoes.json` são atualizados juntos.

Abaixo da lista padrão, `Observações adicionais` usa campos dinâmicos com dropdown de histórico e botões `+/-`, seguindo o mesmo padrão de `Pagamento`. O dropdown aceita reordenação pelo handle `⋮⋮` (mesmo JSON da lista rápida).

No documento final, as observações continuam como lista com marcadores, com espaçamento de `6px` entre os itens.

## Paginação do Documento

A pré-visualização cria páginas adicionais quando uma seção não cabe inteira na página atual. As seções são mantidas como blocos indivisíveis para evitar quebra no meio de `Extras`, `Formas de Pagamento`, `Observações` ou outras seções.

A data fica no rodapé de cada página do documento. Quando o documento tem mais de uma página, o rodapé esquerdo exibe o contador no formato `Página 1 de 2`.

Ao editar campos, o painel de pré-visualização preserva a posição de rolagem para evitar voltar automaticamente à primeira página.

## Documentação Técnica

Detalhes de arquitetura, arquivos principais, endpoints locais e fluxo do launcher ficam em:

```text
docs/ARCHITECTURE.md
```

Detalhes sobre a origem e manutenção das tabelas hospitalares ficam em:

```text
docs/tabelas-hospitalares.md
docs/unimed-n.md
docs/tabela-implantes.md
docs/tabela-tecnologias.md
docs/SNAPSHOT-node-web-v0.1.0.md
docs/SNAPSHOT-tauri-v0.2.0-paused.md
docs/MIGRATION-tauri.md
```

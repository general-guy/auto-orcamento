# Auto Orçamento

Aplicativo local para gerar orçamentos cirúrgicos em papel timbrado, com preenchimento rápido, histórico de campos e pré-visualização pronta para impressão.

## Fluxo ativo (desenvolvimento diário)

Use **`abrir-auto-orcamento.bat`** (Node.js + janela WebView2 nativa). É o modo recomendado enquanto a migração Tauri está **estagnada**.

O `.bat` abre uma **janela nativa** (WebView2 via `pywebview`) com o ícone `.ico` na barra de tarefas — o mesmo princípio usado no repositório `dados-clinica`, sem depender do favicon do Chrome. Requer **Node.js** e **Python** com `pywebview` (`python -m pip install -r requirements.txt`).

**Pasta `src-tauri/`:** enquanto não for buildar o `.exe`, trate-a como **congelada** — edite só o web app partilhado na raiz (`app.js`, `api.js`, etc.). Evite alterar Rust/`src-tauri/` sem necessidade: qualquer `cargo check`, Rust Analyzer ou `tauri:dev` recria `src-tauri/target/` (centenas de MB). Só rode `build-auto-orcamento-tauri.bat` ou comandos Tauri quando quiser gerar o `.exe` de novo; use `cargo clean` se `target/` crescer.

Alterações em `index.html`, `app.js`, `api.js`, `styles.css`, `assets/` e `data/` valem para **ambos** os deploys (Node e Tauri) quando a migração for retomada — a camada `api.js` já abstrai HTTP e comandos Rust.

| Referência | Branch / tag | Documento |
|---|---|---|
| Node pré-Tauri | `stable/node-web-v0.1.0` / `v0.1.0-node-web` | `docs/SNAPSHOT-node-web-v0.1.0.md` |
| Tauri congelado (Fases 1–3) | `stable/tauri-v0.2.0-paused` / `v0.2.0-tauri-paused` | `docs/SNAPSHOT-tauri-v0.2.0-paused.md` |
| Trabalho atual | `feature/tauri` | `docs/MIGRATION-tauri.md` (status **estagnado**) |

## Como Usar

O **mesmo web app** (`index.html`, `app.js`, `api.js`, `styles.css`, `assets/`) alimenta **dois fluxos de deploy equivalentes**. Alterações nesses arquivos valem para **ambos** — a camada `api.js` escolhe HTTP (Node) ou comandos Tauri conforme o ambiente.

| Fluxo | Atalho | Quando usar |
|-------|--------|-------------|
| **Node + WebView2** | `abrir-auto-orcamento.bat` | PC com Node.js e Python; desenvolvimento; ícone nítido na barra de tarefas |
| **Tauri (`.exe`)** | `build-auto-orcamento-tauri.bat` → `auto-orcamento.exe` | PC **sem** Node; distribuição do repo copiado |

Ambos leem e gravam **`data/`** e **`output/`** na raiz do repo. Históricos, tabelas e zoom são os mesmos arquivos JSON.

**Depois de editar o código do web app:**

- **Node:** abra de novo com `abrir-auto-orcamento.bat` (ou `npm start`) — **não** precisa de build.
- **Tauri:** rode `build-auto-orcamento-tauri.bat` para regenerar o `.exe` com o frontend atualizado (ou `npm run tauri:dev` para testar sem build).

Na branch **`feature/tauri`**, os **dois fluxos permanecem válidos**. O fluxo Node **não** foi descontinuado.

### Node — web app via `abrir-auto-orcamento.bat` (stack original)

No Windows, clique duas vezes em:

```text
abrir-auto-orcamento.bat
```

Requer **Node.js** instalado. O atalho instala dependências se faltar `node_modules`, inicia `server.js` na porta 3000 e abre a interface em janela WebView2 nativa (`native_launcher.py` via `pythonw`). O ícone na barra de tarefas vem de `assets/app-icon.ico`. Ao fechar a janela, o servidor encerra.

Se `pythonw` não estiver disponível, o `.bat` cai para Chrome/Edge em modo app (`launch-app.js`) — nesse modo o ícone da barra pode ficar borrado.

Equivalente manual:

```bash
npm install
python -m pip install -r requirements.txt
python native_launcher.py
```

Fallback no navegador (ícone possivelmente borrado na barra de tarefas):

```bash
node launch-app.js
```

### Tauri — mesmo web app via `auto-orcamento.exe`

**Build (máquina de dev, Node + Rust):** `build-auto-orcamento-tauri.bat` → gera `auto-orcamento.exe` na raiz.

**Uso (outro PC, sem Node):** copie o repo (com `auto-orcamento.exe` e `data/`) e abra o `.exe`.

Detalhes na seção [Versão Tauri](#versão-tauri-branch-featuretauri) abaixo (inclui Controlo de Aplicações Inteligentes no Windows 11).

## Requisitos

### Stack Node (browser)

| Recurso | Necessário |
|---|---|
| Node.js LTS | Sim |
| npm | Sim (vem com Node) |
| Python 3 + pywebview | Sim (janela nativa WebView2; `pip install -r requirements.txt`) |
| Google Chrome ou Microsoft Edge | Só no fallback `launch-app.js` |
| Internet | Só na primeira execução, se `node_modules` ainda não existir |

Para migrar a pasta para outro PC com **Node:** instale Node.js, copie o projeto (de preferência com `node_modules` incluído) e execute `abrir-auto-orcamento.bat`.

Para **Tauri** no outro PC, veja [Usar em outro PC](#usar-em-outro-pc-sem-rebuild) — não precisa de Node, mas precisa do `.exe` buildado.

### Stack Tauri (desktop)

| Recurso | Máquina de dev | Outro PC (só uso) |
|---|---|---|
| Node.js + Rust | Sim (build) | Não |
| WebView2 | Sim (Win 10/11) | Sim (Win 10/11) |
| Chrome ou Edge | Sim (PDF) | Sim (PDF) |

Não são necessários Python, PowerShell nem Git para uso normal.

## Versão estável e migração Tauri

A stack Node.js + browser de referência está documentada em `docs/SNAPSHOT-node-web-v0.1.0.md` (branch **`stable/node-web-v0.1.0`**, tag **`v0.1.0-node-web`**).

Na branch **`feature/tauri`**, o **Tauri** acrescenta o `.exe` sem Node em runtime; o fluxo **`abrir-auto-orcamento.bat`** continua **válido e equivalente** para abrir o mesmo web app.

**Migração Tauri estagnada (2026-06-18):** Fases 1–3 concluídas; estado preservado em `stable/tauri-v0.2.0-paused`. Fases 4–5 (PC limpo, paridade final) ficam para retomada futura. Plano e snapshot em `docs/MIGRATION-tauri.md` e `docs/SNAPSHOT-tauri-v0.2.0-paused.md`.

Para a baseline Node congelada: `git checkout stable/node-web-v0.1.0` e `npm install`.

## Versão Tauri (branch `feature/tauri`) — **estagnada**

> Migração **congelada** em `stable/tauri-v0.2.0-paused`. Retome com `build-auto-orcamento-tauri.bat` ou `npm run tauri:dev` quando quiser continuar. Até lá, use **`abrir-auto-orcamento.bat`**.

Executável desktop (WebView2) **em paralelo** ao fluxo Node — **não** o substitui. O frontend é o **mesmo**; `api.js` (`AppApi`) abstrai `fetch("/api/...")` no Node e `invoke(...)` no Tauri.

### Paridade entre deploys

```text
Código partilhado (editar aqui):
  index.html, app.js, api.js, pdf-build.js, zoom.js, styles.css, assets/

Node (abrir-auto-orcamento.bat):
  server.js + launch-app.js  →  http://localhost:3000  →  arquivos na raiz do repo

Tauri (build-auto-orcamento-tauri.bat):
  copy-frontend → dist/  →  embutido no .exe  →  data/ e output/ na raiz do repo
```

Qualquer alteração em `app.js`, formulário, preview ou `api.js` deve ser testada nos **dois** fluxos quando possível.

### Na máquina de dev (Node + Rust)

Para **iterar rápido** enquanto edita código (recompila ao salvar, sem gerar o `.exe` da raiz):

```bash
npm install
npm run tauri:dev
```

### Build e cópia do `.exe`

Clique duas vezes em **`build-auto-orcamento-tauri.bat`**.

Esse atalho:

1. Roda `npm run tauri:build` (só o `.exe`, sem instaladores NSIS/MSI)
2. Copia o resultado para **`auto-orcamento.exe`** na raiz do repo

Para usar o app após o build, abra `auto-orcamento.exe` na raiz (duplo clique).

Equivalente manual:

```bash
npm run tauri:build
```

Saída:

```text
auto-orcamento.exe                            # raiz do repo (cópia automática)
src-tauri/target/release/auto-orcamento.exe # artefato original do Rust
```

**Requisito de build:** Node.js, Rust (`winget install Rustlang.Rustup`). WebView2 já vem no Windows 10/11.

### Limpar cache de build (`cargo clean`)

Compilar o Tauri (sobretudo com `npm run tauri:dev`) gera artefatos Rust em **`src-tauri/target/`**. Essa pasta pode crescer para **vários GB** (cache de `debug/` e `release/`). Não faz parte do código-fonte e **já está no `.gitignore`**.

Para reduzir o tamanho de `src-tauri` no disco:

```powershell
cd src-tauri
cargo clean
```

Ou apague manualmente a pasta `src-tauri\target\`.

- **Seguro:** não afeta `data/`, `output/` nem o `auto-orcamento.exe` na raiz (se já existir).
- **Efeito colateral:** o próximo `tauri:dev` ou `tauri:build` demora mais, porque recompila tudo do zero.
- **Se der erro de arquivo em uso:** feche `auto-orcamento.exe`, pare `tauri:dev` e tente de novo (OneDrive ou antivírus também podem bloquear momentaneamente).

Ao copiar o projeto para outro PC, **não** inclua `src-tauri/target/` — leve o código, `data/` e o `auto-orcamento.exe` já buildado.

### Usar em outro PC (sem rebuild)

1. Na máquina de dev: altere o código e rode **`build-auto-orcamento-tauri.bat`**.
2. Copie o **repositório completo** para o outro PC (pode omitir `node_modules/` e `src-tauri/target/` se quiser economizar espaço — mas inclua `auto-orcamento.exe` na raiz).
3. No outro PC: duplo clique em `auto-orcamento.exe` na raiz do projeto.

Requisitos no PC de destino: Windows 10/11 (WebView2) e Chrome ou Edge (só para PDF). **Não** precisa de Node, Rust nem `npm install`.

### Windows bloqueou o `.exe` (Controlo de Aplicações Inteligentes)

No **Windows 11**, o **Controlo de Aplicações Inteligentes** (*Smart App Control*) pode bloquear o `auto-orcamento.exe` porque ele é compilado localmente e **não tem assinatura digital** de editor reconhecido. Isso **não** indica problema no app nem na pasta `data/`.

Não existe opção oficial de “permitir só desta aplicação” com o controlo ligado. A Microsoft recomenda [assinar a aplicação com um certificado válido](https://support.microsoft.com/pt-br/windows/perguntas-mais-frequentes-sobre-o-controlo-de-aplica%C3%A7%C3%B5es-inteligentes-285ea03d-fa88-4d56-882e-6698afdb7003#bkmk_unknown) (*Code Signing*, não e-CPF/e-CNPJ de documentos).

**Desativar temporariamente, usar o app e reativar** (fluxo suportado nas versões recentes do Windows, sem instalação limpa):

1. **Configurações** → **Privacidade e segurança** → **Segurança do Windows** → **Abrir Segurança do Windows**
2. **Controlo de aplicativos e do browser** → **Configurações do Controlo de Aplicações Inteligentes**
3. Escolha **Desativar**
4. Abra o **`auto-orcamento.exe`** na raiz do repo
5. Volte à mesma tela e **reative** o Controlo de Aplicações Inteligentes

FAQ oficial (Microsoft): [Perguntas mais frequentes sobre o Controlo de Aplicações Inteligentes](https://support.microsoft.com/pt-br/windows/perguntas-mais-frequentes-sobre-o-controlo-de-aplica%C3%A7%C3%B5es-inteligentes-285ea03d-fa88-4d56-882e-6698afdb7003)

Se a opção de reativar não aparecer, instale as **atualizações pendentes do Windows** e tente de novo. Em alguns casos (por exemplo, dados de diagnóstico opcionais desativados), ativar o controlo pela primeira vez pode exigir passos adicionais descritos no FAQ.

**Propriedades → Desbloquear** no `.exe` ajuda em arquivos baixados da internet, mas **raramente** contorna o Controlo de Aplicações Inteligentes.

### Dados locais (Node e Tauri)

Todo JSON mutável e as tabelas de referência ficam em **`data/` na raiz do projeto**:

```text
data/cirurgias.json
data/pacientes.json
data/tabelas-hospitalares.json   ← editável sem rebuild
data/tabela-implantes.json       ← editável sem rebuild
data/settings.json               ← zoom (não versionado)
```

PDFs gerados ficam em `output/` na raiz. **`abrir-auto-orcamento.bat`**, `tauri dev` e o `.exe` usam as **mesmas pastas** `data/` e `output/` na raiz do repo.

O Rust resolve o caminho via `std::env::current_exe()` (não usa `%AppData%`). Ao iniciar, o log registra `Diretório de dados: ...` — deve apontar para `{repo}/data`.

Históricos e tabelas são acessados via `AppApi` (`api.js`); tabelas usam `AppApi.loadTable("hospitalares" | "implantes")`. Fora do `localhost:3000`, o `api.js` **não** cai no modo Node — só invoca comandos Tauri após `waitForBackend()`.

**Pendente (Fases 4–5, migração estagnada):** validação em PC limpo e paridade final com o snapshot Node. Detalhes em `docs/MIGRATION-tauri.md` e `docs/SNAPSHOT-tauri-v0.2.0-paused.md`.

**Ícone do app:** **G** dourado inscrito num **círculo preto** (`$logoFillRatio = 0.70` em `scripts/build-app-icon-square.ps1`). **Node (WebView2):** `npm run icon:web` sincroniza `assets/app-icon.ico` e favicons a partir de `src-tauri/icons/`. **Tauri:** `npm run icon:generate` regenera ícones e o `.exe`.

**PDF automático (Tauri):** ao clicar em **Imprimir orçamento**, o app grava um PDF em `output/` (mesmo fluxo da stack Node). O HTML é montado em `pdf-build.js`; o Rust invoca Chrome/Edge headless (`--print-to-pdf`). Requer Chrome ou Edge instalado.

**Zoom da interface (Node WebView2 e Tauri):** `Ctrl` + roda do mouse, `Ctrl` + `+` / `Ctrl` + `-` (passos de 10%, entre 50% e 200%) e `Ctrl` + `0` para voltar a 100%. O nível fica salvo em `data/settings.json` e é reaplicado ao abrir o app. Um indicador flutuante (estilo Chrome) mostra a porcentagem atual, botões `−`/`+` e **Redefinir** quando o zoom difere de 100%. No modo Node, `api.js` aplica escala via `transform` (preenche a janela sem faixas vazias) e persiste via `GET/PUT /api/settings`; no Tauri, o Rust usa `WebviewWindow::set_zoom`. O arraste da divisória entre formulário e pré-visualização compensa o fator de zoom. No fallback `launch-app.js` (Chrome/Edge), o zoom nativo do navegador continua valendo.

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
- Permite imprimir o orçamento e, ao clicar em `Imprimir orçamento`, gera automaticamente um PDF em `output/`.
- Guarda histórico local de pacientes, cirurgias, hospitais, extras, formas de pagamento, observações e tecnologias.
- Permite reordenar por drag and drop os dropdowns de histórico (**Nome**, **Cirurgia**, **Hospital**, **Tecnologias**, **Extras adicionais**, **Pagamento** e **Observações adicionais**), com ordem persistida nos JSON correspondentes; reordenar entradas de cirurgia nos campos do formulário (só visual/preview); e reordenar as listas rápidas de extras, pagamento e observações.
- Cria múltiplas entradas de cirurgia e hospital.
- Para Regina e Sapiranga, cria entradas auxiliares (`Reg1`, `Sap1`, etc.) com multiplicadores.
- Usa tabelas hospitalares locais para sugerir pacotes e calcular valores auxiliares no preview.
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
```

As tabelas de referência estruturadas ficam em:

```text
data/tabelas-hospitalares.json
data/tabela-implantes.json
```

Esses arquivos são usados pelo app (**Node ou Tauri**) e são versionados no repositório como base inicial. Quando o app altera históricos como extras, pagamentos, observações ou tecnologias, essas mudanças ficam locais até serem adicionadas a um commit. A ordem dos históricos pode ser ajustada pelo drag and drop nos dropdowns (handle `⋮⋮`, com duas ou mais opções visíveis) — persiste em `data/pacientes.json`, `data/cirurgias.json`, `data/hospitais.json`, `data/tecnologias.json`, `data/extras.json`, `data/pagamentos.json` e `data/observacoes.json`. As tabelas hospitalares e de implantes também podem ser editadas manualmente em `data/`; na versão Tauri, as alterações entram na próxima abertura do app, sem rebuild.

Os PDFs gerados automaticamente ficam em:

```text
output/
```

Essa pasta não é versionada no Git. Cada arquivo usa o nome da paciente, a data e o horário da geração, por exemplo `Maria da Silva 2026-06-18 14-30-05.pdf`.

## Impressão e PDF automático

Ao clicar em `Imprimir orçamento`, o app gera um PDF em `output/` e abre a impressão em seguida. O PDF é criado no clique, sem esperar o fim da impressão.

- **Node:** `app.js` envia o HTML ao servidor (`POST /api/pdf`); `pdf-export.js` renderiza com Puppeteer + Chrome/Edge.
- **Tauri:** `AppApi.exportPdf()` monta o HTML em `pdf-build.js` e o Rust invoca Chrome/Edge headless (`export_pdf`).

O PDF usa o mesmo layout paginado da pré-visualização (timbrado, fontes, estilos). CSS, fontes e imagens são embutidos localmente. Colisões de nome recebem sufixo `(2)`, `(3)`, etc.

## Hospitais Com Autofill

A seção `Hospital` tem checkbox no título e vem marcada por padrão a cada nova sessão do app. Quando desmarcada, o conteúdo da seção é recolhido no painel esquerdo e o bloco de hospital deixa de aparecer no documento.

O dropdown de histórico do nome do hospital aceita reordenação pelo handle `⋮⋮` (ordem em `data/hospitais.json`).

O botão verde ao lado do hospital preenche e reorganiza as entradas auxiliares.

Para Sapiranga, os pacotes de centro cirúrgico ficam no topo, ordenados do maior valor para o menor, e recebem multiplicadores progressivos. Depois vêm os pacotes de ambulatório, a hora excedente e, por último, as diárias. Diárias não entram no cálculo de tempo de sala e mantêm o multiplicador normal.

Para Regina, o app ordena os pacotes por valor decrescente e aplica multiplicadores automáticos (`1`, `0.7` e `0.5`) apenas sobre o valor de cada pacote. Adicionais de sala e pernoite de recuperação ficam depois, na ordem do JSON. Se faltar tempo em relação ao tempo previsto de hospital, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE` com multiplicador em unidades de meia hora, usando sempre o tempo bruto dos pacotes no cálculo.

Nos campos auxiliares `Reg#` e `Sap#`, a busca de pacotes/taxas usa um dropdown customizado (`#hospitalProcedureDropdown`): abre **à direita** do campo, ocupa **toda a altura visível da janela**, filtra conforme a digitação e funciona igual na versão Tauri e na versão Node no browser.

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
ARCHITECTURE.md
```

Detalhes sobre a origem e manutenção das tabelas hospitalares ficam em:

```text
docs/tabelas-hospitalares.md
docs/tabela-implantes.md
docs/tabela-tecnologias.md
docs/SNAPSHOT-node-web-v0.1.0.md
docs/SNAPSHOT-tauri-v0.2.0-paused.md
docs/MIGRATION-tauri.md
```

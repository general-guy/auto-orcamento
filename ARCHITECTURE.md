# Arquitetura

O Auto Orçamento é um app local para orçamentos cirúrgicos, servido por **Node.js** e exibido numa janela **WebView2** nativa (`pywebview`).

| Deploy | Entrada | Backend |
|--------|---------|---------|
| **Node (ativo)** | `abrir-auto-orcamento.bat` | `native_launcher.py` + `server.js` (HTTP `/api/*`) |

Históricos, tabelas, PDFs e snapshots JSON ficam em **`data/`** e **`output/`** na raiz do repo — sem banco de dados nem servidor externo.

> **Desenvolvimento ativo:** stack Node + WebView2 na `main`.  
> **Baseline congelada:** `stable/node-web-v0.1.0` / `v0.1.0-node-web` — `docs/SNAPSHOT-node-web-v0.1.0.md`.  
> **Tauri congelado:** `stable/tauri-v0.2.0-paused` — código legado em `src-tauri/`; ver [Referência Tauri](#referência-tauri-congelado) no fim deste documento.

## Visão Geral — deploy Node (válido na `main` e em `stable/node-web-v0.1.0`)

```text
abrir-auto-orcamento.bat
  -> launch-hidden.vbs (relançamento oculto, sem consola)
      -> native_launcher.py (pythonw)
          -> node server.js (CREATE_NO_WINDOW)
          -> janela WebView2 (pywebview) em http://localhost:3000
              -> index.html
              -> styles.css
              -> app.js
              -> data/*.json
```

Fallback (sem `pythonw` ou se `pywebview` falhar):

```text
abrir-auto-orcamento.bat
  -> launch-app.js
      -> server.js
      -> Chrome ou Edge em modo app
```

## Launcher

`abrir-auto-orcamento.bat` instala `node_modules` se necessário. No duplo clique, relança-se em modo oculto via `launch-hidden.vbs` (argumento interno `__hidden__`) e só então executa:

```text
pythonw native_launcher.py
```

Assim o utilizador vê apenas a janela WebView2 — sem terminais CMD ou Node persistentes. Pode haver um flash breve do CMD na primeira linha do `.bat`, antes do relançamento oculto.

`launch-hidden.vbs`:

- recebe o caminho completo do `.bat`;
- executa `abrir-auto-orcamento.bat __hidden__` com estilo de janela `0` (oculto) via `WScript.Shell.Run`.

`native_launcher.py`:

- define `AppUserModelID` no Windows (`auto-orcamento.app`) para identidade própria na barra de tarefas;
- inicia `server.js` com Node em subprocesso (`CREATE_NO_WINDOW` no Windows);
- aguarda `http://localhost:3000` responder;
- abre janela **WebView2** via `pywebview` com ícone `assets/app-icon.ico` (`webview.start(icon=...)`);
- maximiza a janela ao carregar;
- encerra o servidor Node ao fechar a janela.

Requer `python -m pip install -r requirements.txt` (`pywebview`). O ícone na barra de tarefas vem do `.ico` nativo da janela — não do favicon do Chrome (mesmo padrão do repositório `dados-clinica`).

Para debug com terminal visível, rode `python native_launcher.py` ou `abrir-auto-orcamento.bat __hidden__` a partir de um CMD já aberto (sem passar pelo relançamento VBS).

`launch-app.js` (fallback):

- inicia `server.js` com Node;
- aguarda o servidor anunciar `http://localhost:3000`;
- abre Chrome ou Edge em modo app com `--app=http://localhost:3000`;
- prioriza Google Chrome e usa Microsoft Edge apenas como fallback;
- abre a janela maximizada com `--start-maximized`;
- perfil em `%LOCALAPPDATA%\Auto Orcamento\browser-profile`;
- encerra o servidor quando a janela do navegador é fechada;
- **aviso:** ícone na barra de tarefas pode ficar borrado (limitação do modo `--app`).

Para forçar um navegador específico no fallback, defina `AUTO_ORCAMENTO_BROWSER` com o caminho do executável.

## Ambiente de Desenvolvimento

No Windows, recomenda-se usar PowerShell 7 (`pwsh`) no terminal integrado do Cursor, em vez do Windows PowerShell antigo (`powershell.exe`). O projeto não depende dele para executar o app, mas ele simplifica comandos de manutenção e aceita operadores modernos como `&&`.

O Windows PowerShell 5.1 também funciona para comandos básicos, mas alguns exemplos de terminal precisam ser adaptados para `;` ou executados em comandos separados.

## Dependências de runtime

| Componente | Papel |
|---|---|
| Node.js | Servidor HTTP, APIs, PDF |
| npm | Instala `puppeteer-core` |
| Python 3 + pywebview | Janela WebView2 nativa (`native_launcher.py`) |
| Chrome ou Edge | Fallback (`launch-app.js`) e renderização PDF (`pdf-export.js`) |

Sem Node instalado, o app não inicia. Sem Python/pywebview, o `.bat` cai para `launch-app.js`. Sem Chrome/Edge, a exportação automática de PDF não funciona (e o fallback do launcher também falha).

## Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Markup do formulário e preview |
| `styles.css` | Layout, timbrado, impressão |
| `app.js` | Lógica de UI, preview, históricos, autofill |
| `server.js` | Servidor na porta 3000, APIs REST |
| `budget-snapshot.js` | Snapshot JSON do formulário na impressão e validação na importação |
| `snapshot-open-dialog.js` | Invoca `scripts/open-snapshot-dialog.py` (pywebview/WebView2) ou PowerShell para seletor nativo de JSON |
| `pdf-export.js` | PDF via Puppeteer + Chrome/Edge; grava JSON ao lado do PDF |
| `native_launcher.py` | Launcher Windows (servidor + janela WebView2 + ícone `.ico`) |
| `launch-hidden.vbs` | Relançamento oculto do `.bat` (sem consola visível) |
| `launch-app.js` | Fallback: servidor + Chrome/Edge em modo app |
| `requirements.txt` | `pywebview` para o launcher nativo |
| `abrir-auto-orcamento.bat` | Atalho de entrada |
| `package.json` | Metadados; única dependência: `puppeteer-core` |

## Servidor Local

`server.js` usa apenas módulos nativos do Node:

- `http` para servir a aplicação;
- `fs` e `path` para ler e gravar arquivos locais;
- porta fixa `3000`.

Endpoints principais:

- `GET /` e arquivos estáticos: servem `index.html`, `app.js`, `styles.css`, fontes, imagens e JSONs.
- `GET /api/cirurgias`, `POST /api/cirurgias`, `DELETE /api/cirurgias`, `PUT /api/cirurgias`: histórico de cirurgias e persistência da ordem manual no dropdown.
- `GET /api/hospitais`, `POST /api/hospitais`, `DELETE /api/hospitais`, `PUT /api/hospitais`: histórico de hospitais e persistência da ordem manual no dropdown.
- `GET /api/pacientes`, `POST /api/pacientes`, `DELETE /api/pacientes`, `PUT /api/pacientes`: histórico de pacientes e persistência da ordem manual no dropdown.
- `GET /api/pagamentos`, `POST /api/pagamentos`, `DELETE /api/pagamentos`, `PUT /api/pagamentos`: histórico de formas de pagamento e persistência da ordem manual.
- `GET /api/observacoes`, `POST /api/observacoes`, `DELETE /api/observacoes`, `PUT /api/observacoes`: histórico de observações e persistência da ordem manual.
- `GET /api/extras`, `POST /api/extras`, `DELETE /api/extras`, `PUT /api/extras`: histórico de extras e persistência da ordem manual.
- `GET /api/tecnologias`, `POST /api/tecnologias`, `DELETE /api/tecnologias`, `PUT /api/tecnologias`: histórico de tecnologias com valor associado e persistência da ordem manual no dropdown.
- `GET /api/settings`, `PUT /api/settings`: preferências locais (zoom; `lastSnapshotDir` para o botão **Abrir**; grava em `data/settings.json`).
- `POST /api/open-snapshot`: abre seletor nativo de JSON no Windows (`pywebview`/WebView2 via `scripts/open-snapshot-dialog.py`), lê o arquivo, persiste a pasta em `lastSnapshotDir` e devolve o snapshot parseado.
- `POST /api/pdf`: gera PDF em `output/` e, se enviado no corpo, grava snapshot JSON (`snapshot`) com o mesmo nome base (`.json`).
- `POST /api/shutdown`: encerra o servidor quando acionado pela interface.

Os históricos de pacientes, cirurgias, hospitais, extras, pagamentos e observações são listas JSON simples, limitadas a 200 itens por tipo. O histórico de tecnologias também é limitado a 200 itens, mas cada item é um objeto com `nome` e `valor`.

## Frontend

`index.html` define duas áreas principais:

- painel esquerdo com o formulário;
- painel direito com a pré-visualização do documento final.

`styles.css` controla:

- layout em colunas com painel esquerdo redimensionável;
- visual dos campos, botões, dropdowns e pré-visualização;
- agrupamento visual das seções do formulário com bordas cinza discretas;
- papel A4 com imagem de fundo do papel timbrado;
- regras específicas de impressão (`@media print`): oculta formulário e chrome da UI; força A4 (`210mm` × `297mm`); anula o zoom da interface (`transform: none` no `body`) e alturas mínimas (`100vh`) que distorcem o diálogo **Imprimir** no WebView2.

`app.js` concentra a lógica de interação:

- sincronização entre formulário e preview;
- histórico/autocomplete de pacientes, cirurgias, hospitais, extras, pagamentos, observações e tecnologias;
- reordenação persistente nos dropdowns de histórico (handle `⋮⋮`, classe `history-dropdown--reorderable`, helper `installReorderableHistoryDropdown()` em `app.js`);
- campos dinâmicos e reordenáveis de cirurgia, além de hospital;
- entradas auxiliares de Regina e Sapiranga;
- multiplicadores de pacotes hospitalares;
- autofill das entradas auxiliares;
- carregamento e renderização da tabela de implantes;
- persistência de tecnologias com valor monetário associado;
- renderização da equipe fixa com itens selecionáveis e valor monetário;
- renderização opcional da seção de extras com lista rápida reordenável e campos dinâmicos adicionais;
- renderização da seção de pagamento com campos dinâmicos e lista rápida reordenável;
- renderização da seção de observações com lista rápida reordenável e campos dinâmicos adicionais;
- paginação da pré-visualização do documento em páginas A4;
- redimensionamento do painel;
- impressão, exportação automática de PDF e shutdown.

`pdf-export.js` usa o Chrome ou Edge instalado localmente, via `puppeteer-core`, para renderizar o HTML paginado recebido do frontend. O CSS, fontes e imagens do timbrado são embutidos a partir dos arquivos locais do projeto em base64, evitando depender de novas requisições HTTP enquanto o servidor processa a exportação. O nome do PDF combina o nome da paciente com data e horário locais; colisões recebem sufixo `(2)`, `(3)`, etc.

## Dados

Arquivos de histórico:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
data/extras.json
data/pagamentos.json
data/observacoes.json
data/tecnologias.json
```

Esses arquivos são persistência local do app e também são versionados no repositório para manter uma base inicial compartilhada. Alterações feitas pelo uso do app só vão para o GitHub quando forem adicionadas ao staging e commitadas.

Tabelas de referência estruturadas:

```text
data/tabelas-hospitalares.json
data/tabela-implantes.json
```

O app carrega `data/tabelas-hospitalares.json` via `AppApi.loadTable("hospitalares")` — servido por `server.js` a partir de `data/` na raiz.

As entradas auxiliares `Reg#`/`Sap#` não usam `<datalist>` nativo (limitado no WebView2). O app monta `#hospitalProcedureDropdown` em `app.js`: lista filtrável, posicionada à direita do input com altura de viewport completa (`positionHospitalProcedureDropdown`).

`data/tabela-implantes.json` guarda uma tabela independente de implantes, extraída de documento `.doc`, para preenchimento opcional da seção `Implantes`. O dropdown usa `rotulo`, `modelo` e `referencia`; itens com `favorito: true` recebem uma estrela ao final da opção.

`data/pacientes.json` guarda os nomes de pacientes usados no autocomplete. O dropdown de histórico do campo **Nome** permite reordenar entradas pelo handle `⋮⋮` (com duas ou mais opções visíveis); ao soltar, `app.js` envia a lista completa via `PUT /api/pacientes` / `AppApi.replaceHistory("pacientes", …)` e grava a ordem em `data/pacientes.json`. O menu fecha ao perder o foco do campo ou do dropdown.

`data/cirurgias.json` guarda as cirurgias cadastradas no formulário. O dropdown de histórico de **Cirurgia proposta** permite reordenar entradas pelo handle `⋮⋮` (com duas ou mais opções visíveis); ao soltar, `app.js` envia a lista via `PUT /api/cirurgias` / `AppApi.replaceHistory("cirurgias", …)` e grava em `data/cirurgias.json`. O menu fecha ao perder o foco do campo ou do dropdown.

Com duas ou mais entradas no formulário, `updateSurgeryFieldStructure()` exibe outro handle `⋮⋮` à esquerda de cada **campo** (não no dropdown), reorganizando só a ordem visual no painel e no preview — sem alterar `data/cirurgias.json`.

`data/hospitais.json` guarda os nomes de hospital usados no autocomplete da seção **Hospital**. O dropdown de histórico permite reordenar entradas pelo handle `⋮⋮`; ao soltar, `app.js` envia a lista via `PUT /api/hospitais` / `AppApi.replaceHistory("hospitais", …)`.

`data/tecnologias.json` guarda as tecnologias cadastradas no próprio app. Diferente dos históricos simples, cada item tem `nome` e `valor`, permitindo carregar o valor automaticamente quando a tecnologia é selecionada. O dropdown de histórico também permite reordenar pelo handle `⋮⋮`; ao soltar, `PUT /api/tecnologias` grava a ordem preservando `nome` e `valor` de cada item.

`data/pagamentos.json` guarda as formas de pagamento cadastradas no formulário. O arquivo é usado pelo dropdown de histórico da seção `Pagamento` (reordenável pelo handle `⋮⋮`, via `PUT /api/pagamentos`) e pela lista rápida reordenável acima dos campos manuais — ambos compartilham o mesmo JSON.

`data/extras.json` guarda os extras padrão e adicionais cadastrados no formulário. A lista rápida reordenável e o dropdown de histórico dos **Extras adicionais** compartilham o mesmo arquivo; reordenar em qualquer um deles persiste via `PUT /api/extras`.

`data/observacoes.json` guarda as observações padrão e adicionais cadastradas no formulário. A lista rápida reordenável e o dropdown de histórico das **Observações adicionais** compartilham o mesmo arquivo; reordenar em qualquer um deles persiste via `PUT /api/observacoes`.

A pasta `output/` guarda os PDFs e snapshots JSON gerados ao clicar em **Imprimir orçamento**. Ela é criada pelo servidor quando necessário e não entra no controle de versão. Cada par usa o mesmo nome base (`.pdf` e `.json`).

## Lógica de Cirurgia

A seção `Cirurgia` usa uma lista dinâmica de inputs com botões `+/-`. Cada input usa dropdown de histórico alimentado por `data/cirurgias.json` via `/api/cirurgias`, com reordenação persistente no JSON pelo drag and drop **dentro do dropdown** (handle `⋮⋮` à esquerda de cada opção, quando há duas ou mais visíveis).

Com duas ou mais entradas no formulário, `updateSurgeryFieldStructure()` exibe um handle de arraste (`⋮⋮`) à esquerda de cada **campo**, dentro de `.surgery-field-row`, mantendo o input em flex para ocupar toda a largura do painel. O rótulo `Cirurgia proposta` permanece sempre no primeiro campo, mesmo após reordenar.

O arraste usa eventos de ponteiro apenas no handle, sem interferir na digitação. Durante o movimento, `app.js` mostra a mesma linha de encaixe usada nas listas rápidas; ao soltar, reorganiza os `<label class="surgery-field">` no DOM, chama `updatePreview()` e não persiste nada no servidor. `getSurgeryValues()` lê a ordem atual dos inputs no DOM, e essa ordem alimenta o preview do documento.

## Lógica de Implantes

A seção `Implantes` no formulário é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, o dropdown fica desabilitado, o conteúdo da seção fica oculto, o espaçamento vertical do fieldset é reduzido no painel esquerdo e a seção não aparece no documento.

Quando um item é selecionado, o preview exibe uma caixa arredondada com duas colunas:

- à esquerda: `marca - rotulo - modelo - referencia`, com quebra de linha se necessário;
- à direita: `valorAVista` na primeira linha e `valorCartao7x` na segunda linha, ambos alinhados à direita.

## Lógica de Tecnologias

A seção `Tecnologias` no formulário é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, os campos ficam desabilitados, o conteúdo da seção fica oculto, o espaçamento vertical do fieldset é reduzido no painel esquerdo e a seção não aparece no documento.

O campo `Tecnologia` usa um dropdown de histórico alimentado por `data/tecnologias.json`. Ao selecionar uma opção, o app carrega o `valor` salvo junto com o `nome`. Com duas ou mais opções visíveis, o handle `⋮⋮` reordena o histórico no JSON (via `AppApi.replaceTechnologies()`).

O campo `Valor:` fica na mesma linha do input e normaliza moeda em padrão brasileiro ao sair do campo e antes de salvar. Exemplos: `10000` vira `R$ 10.000,00`; `10000,5` vira `R$ 10.000,50`.

No preview, a seção aparece em uma caixa arredondada com duas colunas: tecnologia à esquerda e valor à direita.

## Lógica de Equipe

A seção `Equipe` é fixa, sem checkbox no título. Ela contém checkboxes pré-marcados para `Cirurgião`, `Anestesista`, `Auxiliar`, `Eq. Enfermagem`, `Modelador`, `Placas` e `Meias`.

Os itens ficam em três colunas no formulário. No preview, apenas os itens marcados são exibidos, separados por ` + `.

O campo `Valor:` usa a mesma normalização monetária de tecnologias: valores como `10000` são convertidos para `R$ 10.000,00` ao sair do campo. O preview exibe os itens à esquerda e o valor à direita.

## Lógica de Extras

A seção `Extras` é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, o conteúdo do formulário fica oculto, os controles internos são desabilitados, o fieldset recebe `is-collapsed` e a seção não aparece no documento.

Quando habilitada, a seção é alimentada por `data/extras.json` via `/api/extras` e fica antes de `Pagamento` no formulário e no documento. O conteúdo interno usa `#extrasFormContent` com o mesmo `gap` em grid das outras seções opcionais, mantendo o espaçamento entre `Extras padrão`, a lista rápida e `Extras adicionais` alinhado ao de `Pagamento`. No painel, `renderExtrasQuickList()` exibe as entradas salvas como `Extras padrão`, com checkboxes marcados por padrão e botão de exclusão integrado ao histórico.

Os `Extras adicionais` usam uma lista dinâmica de inputs com botões `+/-`. Cada input usa dropdown de histórico alimentado pelo mesmo JSON; com duas ou mais opções visíveis, o handle `⋮⋮` reordena o histórico via `PUT /api/extras` (mesmo arquivo da lista rápida).

A lista rápida de extras padrão usa eventos de ponteiro para permitir drag and drop sem interferir nos checkboxes e no botão de exclusão. Durante o arraste, `app.js` mostra uma linha de encaixe entre os itens; ao soltar, reorganiza `extrasHistory`, atualiza o preview e envia a lista completa para `PUT /api/extras`, que normaliza duplicatas e grava a nova ordem em `data/extras.json`.

No preview, `updateExtrasPreview()` combina os extras padrão marcados com os adicionais preenchidos, remove duplicatas por texto normalizado e renderiza os itens em uma lista com marcadores. O espaçamento entre itens é controlado por `#extrasPreview` em `styles.css`.

## Lógica de Pagamento

A seção `Pagamento` mantém apenas as formas de pagamento. O antigo campo `Itens Incluídos` foi removido do formulário, do preview e da lista de campos sincronizados em `app.js`.

No formulário, `Pagamento` usa uma lista dinâmica de inputs com botões `+/-`, no mesmo padrão de `Cirurgia`. Cada input usa dropdown de histórico alimentado por `data/pagamentos.json` via `/api/pagamentos`; o dropdown também aceita reordenação pelo handle `⋮⋮` (`PUT /api/pagamentos`).

As entradas salvas em `data/pagamentos.json` também são renderizadas em uma lista rápida acima do campo manual. Cada item vem marcado por padrão, pode ser desmarcado sem sair do histórico e tem um botão de exclusão que remove a entrada via `/api/pagamentos`.

A lista rápida usa eventos de ponteiro para permitir drag and drop sem interferir nos checkboxes e no botão de exclusão. Durante o arraste, `app.js` mostra uma linha de encaixe entre os itens; ao soltar, reorganiza `paymentHistory`, atualiza o preview e envia a lista completa para `PUT /api/pagamentos`, que normaliza duplicatas e grava a nova ordem em `data/pagamentos.json`.

No preview, as formas de pagamento preenchidas são renderizadas como parágrafos sem marcadores, com espaçamento leve entre cada item.

## Lógica de Observações

A seção `Observações` é alimentada por `data/observacoes.json` via `/api/observacoes`. No formulário, `renderGuidanceQuickList()` exibe as entradas salvas como `Observações padrão`, com checkboxes marcados por padrão e botão de exclusão integrado ao histórico.

As `Observações adicionais` usam uma lista dinâmica de inputs com botões `+/-`. Cada input usa dropdown de histórico alimentado pelo mesmo JSON; com duas ou mais opções visíveis, o handle `⋮⋮` reordena via `PUT /api/observacoes`.

A lista rápida de observações padrão usa eventos de ponteiro para permitir drag and drop sem interferir nos checkboxes e no botão de exclusão. Durante o arraste, `app.js` mostra uma linha de encaixe entre os itens; ao soltar, reorganiza `guidanceHistory`, atualiza o preview e envia a lista completa para `PUT /api/observacoes`, que normaliza duplicatas e grava a nova ordem em `data/observacoes.json`.

No preview, `updateGuidance()` combina as observações padrão marcadas com as adicionais preenchidas, remove duplicatas por texto normalizado e renderiza os itens em uma lista com marcadores. O espaçamento entre itens é controlado por `#guidancePreview` em `styles.css`.

## Paginação do Documento

O documento é composto por uma página base (`#printPage`) e páginas geradas dinamicamente quando necessário. A função de paginação coleta os blocos existentes, remove páginas geradas anteriormente, esvazia o fluxo da primeira página e redistribui os blocos em ordem.

Cada seção do documento é tratada como bloco indivisível. Se uma seção não cabe antes da área reservada à data, ela é movida inteira para a próxima página. A data é renderizada no rodapé de cada página gerada.

Quando a paginação cria mais de uma página, `updateDocumentPageCounters()` exibe `Página X de Y` no rodapé esquerdo de cada página. Em documentos de uma página, o contador permanece oculto.

Durante `updatePreview()`, o app salva `scrollTop` e `scrollLeft` do painel de pré-visualização antes de redesenhar/paginar e restaura esses valores ao final da atualização, com um segundo ajuste no próximo frame.

## Navegação por teclado

`focusNextTextField()` avança o foco quando o usuário pressiona `Enter` em um campo de texto. Para listas dinâmicas de `Cirurgia`, `Hospital`, `Extras`, `Pagamento` e `Observações`, o escopo fica limitado ao container da seção (`#surgeryList`, `#hospitalList`, `#extrasList`, `#paymentList` ou `#guidanceList`), evitando saltos para campos de outra seção. No último campo de uma dessas listas, `Enter` remove o foco do campo atual, disparando o salvamento no histórico via `focusout` e a atualização do preview.

`Shift+Enter` continua criando uma nova linha na seção correspondente. A seleção de itens no dropdown legado com `Enter` também respeita o mesmo escopo ao avançar.

## Exportação de PDF e snapshot JSON

Quando o usuário clica em `Imprimir orçamento`, `app.js` salva os históricos pendentes, **aguarda** a exportação (`await exportPdfDocument()`) e só então chama `window.print()`.

`budget-snapshot.js` monta um snapshot estruturado (`schemaVersion: 1`) com o estado atual do formulário: textos (incluindo linhas vazias nos campos dinâmicos), checkboxes de seções opcionais, itens das listas rápidas (marcados e desmarcados), equipe, hospitais com entradas auxiliares e implante selecionado.

**Stack Node (ativa):**

```text
exportPdfDocument()
  -> BudgetSnapshot.collect()
  -> AppApi.exportPdf()  // envia pagesHtml + snapshot; NÃO usa PdfBuild no browser
  -> POST /api/pdf
  -> pdf-export.js: buildPdfDocumentHtml + puppeteer-core
  -> output/{nome}.pdf + output/{nome}.json
```

`pdf-build.js` permanece no projeto para referência do Tauri congelado; na stack Node ativa, a montagem do HTML autocontido ocorre **no servidor** (`pdf-export.js`).

Falhas de exportação exibem um `alert` além do log no console. Requer Chrome ou Edge instalado.

**Impressão no navegador:** após a exportação, `window.print()` usa o DOM visível. O zoom da UI (Node: `transform: scale()` em `api.js`) afeta só a tela; `@media print` em `styles.css` restaura layout A4 sem escala. O PDF automático nunca passa por esse transform — `pdf-export.js` monta HTML autocontido só com as `.print-page`.

## Importação de snapshot JSON

O botão **Abrir** (`#openButton`) chama `AppApi.openSnapshot()` → `POST /api/open-snapshot`. No Windows, `scripts/open-snapshot-dialog.py` usa **pywebview** (`window.create_file_dialog`, WebView2, janela oculta) para diálogo nativo nítido em HiDPI; fallback PowerShell/tkinter. Preferência: `lastSnapshotDir`; fallback `output/`. Imprimir grava `output/` em `lastSnapshotDir`. O launcher (`native_launcher.py`, `port-utils.js`) libera a porta 3000 antes de subir o Node. **Não** há fallback para `<input type="file">` na stack Node.

**Stack Tauri (congelada):** `export_pdf` gera só PDF; não há snapshot JSON nem importação.

## Lógica Hospitalar

A seção `Hospital` é controlada por um checkbox no título, marcado por padrão no HTML para cada nova sessão do app. Quando desmarcado, o conteúdo do formulário é ocultado, os controles internos são desabilitados e o bloco de hospital no preview recebe `hidden`.

O campo de nome do hospital usa dropdown de histórico (`data/hospitais.json`) com reordenação persistente pelo handle `⋮⋮` (`PUT /api/hospitais`).

Quando o nome do hospital contém `regin`, o app cria entradas auxiliares `Reg1`, `Reg2`, etc. Quando contém `sapirang`, cria `Sap1`, `Sap2`, etc.

Cada entrada auxiliar tem:

- campo de pacote/taxa;
- campo de multiplicador, iniciado com `1`;
- dropdown customizado de procedimentos (`#hospitalProcedureDropdown`), alimentado por `data/tabelas-hospitalares.json`.

O preview hospitalar é montado em três colunas:

- nome do hospital;
- procedimentos e tempos de sala;
- valor total do hospital.

O valor exibido é a soma de `valor * multiplicador` de todas as entradas válidas daquele hospital. O formatador troca espaços não quebráveis por espaços comuns para evitar problemas de largura com a fonte do documento.

## Autofill Sapiranga

O autofill de Sapiranga:

- identifica pacotes de centro cirúrgico, pacotes de ambulatório, hora excedente, diárias e entradas desconhecidas;
- ordena os pacotes de centro cirúrgico por valor decrescente;
- aplica multiplicadores `1`, `0.7` e `0.6` apenas aos pacotes de centro cirúrgico;
- ordena os pacotes de ambulatório na ordem do JSON;
- soma `tempoSalaHoras` dos pacotes de centro cirúrgico;
- compara com `Tempo previsto de hospital`;
- adiciona `Hora excedente em bloco cirúrgico` quando faltar tempo;
- posiciona as diárias depois da hora excedente, sem usá-las no cálculo de tempo de sala e sem multiplicador automático.

A ordem final é: `cirurgiasPlasticasCentroCirurgico`, `cirurgiasPlasticasAmbulatorio`, `excedente`, `diarias` e, ao fim, entradas não reconhecidas.

## Autofill Regina

O autofill de Regina:

- identifica pacotes, taxas adicionais e entradas desconhecidas;
- ordena os pacotes por valor decrescente;
- aplica multiplicadores automáticos nos pacotes: `1` no primeiro, `0.7` no segundo e `0.5` a partir do terceiro;
- soma o `tempoSalaHoras` bruto dos pacotes selecionados, sem usar os multiplicadores de valor;
- compara com `Tempo previsto de hospital`;
- quando faltar tempo, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE`;
- calcula o multiplicador em unidades de meia hora;
- mantém adicionais de sala e pernoite de recuperação fora desse fluxo de multiplicadores;
- ordena as taxas adicionais na ordem de `regina.taxasAdicionais`.

Exemplo: se faltam `6` horas, o multiplicador da taxa de meia hora é `12`.

A ordem final é: pacotes de cirurgia plástica, taxas adicionais e, ao fim, entradas não reconhecidas.

## Convenções

- O frontend é HTML, CSS e JavaScript servido por `server.js` na raiz do repo — **sem build step**.
- Fluxo diário: `abrir-auto-orcamento.bat` → WebView2 + `http://localhost:3000`.
- O estado persistente fica em JSON local (`data/`, `output/`).
- Alterações no preview devem chamar `updatePreview()` quando mudarem campos programaticamente.
- Alterações nas tabelas devem preservar o formato descrito em `docs/tabelas-hospitalares.md`.
- Novas features implementam-se na stack Node; **não** portar para `src-tauri/` enquanto Tauri estiver congelado.

## Estado do repositório

| Branch / tag | Papel |
|---|---|
| **`main`** | Desenvolvimento ativo (Node) |
| `stable/node-web-v0.1.0` | Node clássico congelado |
| `stable/tauri-v0.2.0-paused` | Tauri congelado (Fases 1–3) |
| `feature/tauri` | Congelada em `a739f1f` |

**Decisão (2026-06-26):** evolução **somente Node** na `main`. Tauri e `feature/tauri` permanecem congelados.

## Referência Tauri (congelado)

> Documentação histórica. **Não** use no fluxo diário. Retomada futura: `docs/SNAPSHOT-tauri-v0.2.0-paused.md` e `docs/MIGRATION-tauri.md`.

O repositório ainda contém `src-tauri/`, `api.js` (com detecção Tauri legada) e scripts de build do `.exe`. Esses artefatos correspondem ao snapshot `stable/tauri-v0.2.0-paused` e **não** recebem novas features.

Resumo do que existia no experimento Tauri:
- **`pdf-build.js`:** monta HTML autocontido para exportação (CSS/fontes inline).
- **`zoom.js`:** atalhos `Ctrl` + roda / `Ctrl` + `+`/`-`/`0`; indicador flutuante `#zoomFlag` (%, `−`/`+`, Redefinir). **Tauri:** persiste em `data/settings.json` via comandos `zoom_*` e `WebviewWindow::set_zoom`. **Node (WebView2):** `AppApi` persiste via `GET/PUT /api/settings` e aplica escala com `transform: scale()` no `body` (layout preenche a janela); o arraste da divisória entre painéis usa `AppApi.getWebZoomFactor()`. A impressão (`@media print`) anula esse transform para o papel coincidir com o PDF.
- **`src-tauri/src/paths.rs`:** resolve `data/` e `output/` com `std::env::current_exe()`. Em debug, raiz do repo. Em release: raiz do repo se o `.exe` está em `src-tauri/target/release/` ou na raiz (pasta `src-tauri/` ao lado); senão `{pasta-do-exe}/data/`. Não grava em `%AppData%`. Log de startup: `Diretório de dados: ...`.
- **`src-tauri/src/storage.rs`:** históricos, tecnologias, zoom e tabelas (`table_load` / `read_table`); seed único de tabelas a partir de `dist/data/` embutido no build.
- **`src-tauri/src/pdf.rs`:** grava PDF em `output/` via Chrome/Edge headless; comando `export_pdf`.
- **`scripts/copy-release-exe.cjs`:** após o build, copia `src-tauri/target/release/auto-orcamento.exe` para `auto-orcamento.exe` na raiz.
- **`src-tauri/target/`:** cache Rust (`.gitignore`); limpar com `cargo clean` dentro de `src-tauri/`.
- **PDF no Tauri congelado:** `export_pdf` via Chrome/Edge headless — **sem** snapshot JSON (feature só na stack Node).

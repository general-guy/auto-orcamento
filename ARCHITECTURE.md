# Arquitetura

O Auto Orçamento é um web app local servido por Node.js. A aplicação não depende de banco de dados nem de servidor externo: os arquivos estáticos, históricos e tabelas de referência ficam dentro do próprio projeto.

> **Baseline estável:** branch `stable/node-web-v0.1.0`, tag `v0.1.0-node-web`. Snapshot completo em `docs/SNAPSHOT-node-web-v0.1.0.md`. Próxima evolução planejada: Tauri (`docs/MIGRATION-tauri.md`).

## Visão Geral

```text
abrir-auto-orcamento.bat
  -> launch-app.js
      -> server.js
      -> Chrome em modo app
          -> index.html
          -> styles.css
          -> app.js
          -> data/*.json
```

## Launcher

`abrir-auto-orcamento.bat` apenas entra na pasta do projeto e executa:

```text
node launch-app.js
```

`launch-app.js`:

- inicia `server.js` com Node;
- aguarda o servidor anunciar `http://localhost:3000`;
- abre o navegador em modo app com `--app=http://localhost:3000`;
- prioriza Google Chrome e usa Microsoft Edge apenas como fallback;
- abre a janela maximizada com `--start-maximized`;
- usa um perfil temporário em `auto-orcamento-browser-profile`;
- encerra o servidor quando a janela do navegador é fechada.

Para forçar um navegador específico, defina a variável de ambiente `AUTO_ORCAMENTO_BROWSER` com o caminho do executável antes de iniciar o launcher.

## Ambiente de Desenvolvimento

No Windows, recomenda-se usar PowerShell 7 (`pwsh`) no terminal integrado do Cursor, em vez do Windows PowerShell antigo (`powershell.exe`). O projeto não depende dele para executar o app, mas ele simplifica comandos de manutenção e aceita operadores modernos como `&&`.

O Windows PowerShell 5.1 também funciona para comandos básicos, mas alguns exemplos de terminal precisam ser adaptados para `;` ou executados em comandos separados.

## Dependências de runtime

| Componente | Papel |
|---|---|
| Node.js | Servidor HTTP, APIs, PDF |
| npm | Instala `puppeteer-core` |
| Chrome ou Edge | Modo app (`launch-app.js`) e renderização PDF (`pdf-export.js`) |

Sem Node instalado, o app não inicia. Sem Chrome/Edge, o `.bat` falha ao abrir a janela e a exportação automática de PDF não funciona.

## Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Markup do formulário e preview |
| `styles.css` | Layout, timbrado, impressão |
| `app.js` | Lógica de UI, preview, históricos, autofill |
| `server.js` | Servidor na porta 3000, APIs REST |
| `pdf-export.js` | PDF via Puppeteer + Chrome/Edge |
| `launch-app.js` | Launcher Windows (servidor + janela app) |
| `abrir-auto-orcamento.bat` | Atalho de entrada |
| `package.json` | Metadados; única dependência: `puppeteer-core` |

## Servidor Local

`server.js` usa apenas módulos nativos do Node:

- `http` para servir a aplicação;
- `fs` e `path` para ler e gravar arquivos locais;
- porta fixa `3000`.

Endpoints principais:

- `GET /` e arquivos estáticos: servem `index.html`, `app.js`, `styles.css`, fontes, imagens e JSONs.
- `GET /api/cirurgias`, `POST /api/cirurgias`, `DELETE /api/cirurgias`: histórico de cirurgias.
- `GET /api/hospitais`, `POST /api/hospitais`, `DELETE /api/hospitais`: histórico de hospitais.
- `GET /api/pacientes`, `POST /api/pacientes`, `DELETE /api/pacientes`: histórico de pacientes.
- `GET /api/pagamentos`, `POST /api/pagamentos`, `DELETE /api/pagamentos`, `PUT /api/pagamentos`: histórico de formas de pagamento e persistência da ordem manual.
- `GET /api/observacoes`, `POST /api/observacoes`, `DELETE /api/observacoes`, `PUT /api/observacoes`: histórico de observações e persistência da ordem manual.
- `GET /api/extras`, `POST /api/extras`, `DELETE /api/extras`, `PUT /api/extras`: histórico de extras e persistência da ordem manual.
- `GET /api/tecnologias`, `POST /api/tecnologias`, `DELETE /api/tecnologias`: histórico de tecnologias com valor associado.
- `POST /api/pdf`: gera um PDF do documento atual e salva em `output/`.
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
- regras específicas de impressão.

`app.js` concentra a lógica de interação:

- sincronização entre formulário e preview;
- histórico/autocomplete de pacientes, cirurgias, hospitais, extras, pagamentos, observações e tecnologias;
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

O frontend carrega `data/tabelas-hospitalares.json` diretamente para montar as opções de Regina e Sapiranga e para calcular os valores exibidos no preview.

As entradas auxiliares `Reg#`/`Sap#` não usam `<datalist>` nativo (limitado no WebView2). O app monta `#hospitalProcedureDropdown` em `app.js`: lista filtrável, posicionada à direita do input com altura de viewport completa (`positionHospitalProcedureDropdown`).

`data/tabela-implantes.json` guarda uma tabela independente de implantes, extraída de documento `.doc`, para preenchimento opcional da seção `Implantes`. O dropdown usa `rotulo`, `modelo` e `referencia`; itens com `favorito: true` recebem uma estrela ao final da opção.

`data/cirurgias.json` guarda as cirurgias cadastradas no formulário. O arquivo é uma lista simples de textos, usada pelo dropdown de histórico da seção `Cirurgia`. A ordem manual dos campos no formulário não altera esse arquivo.

`data/tecnologias.json` guarda as tecnologias cadastradas no próprio app. Diferente dos históricos simples, cada item tem `nome` e `valor`, permitindo carregar o valor automaticamente quando a tecnologia é selecionada.

`data/pagamentos.json` guarda as formas de pagamento cadastradas no formulário. O arquivo é uma lista simples de textos, usada pelo dropdown de histórico da seção `Pagamento` e pela lista rápida reordenável.

`data/extras.json` guarda os extras padrão e adicionais cadastrados no formulário. O arquivo é uma lista simples de textos, usada pela lista rápida reordenável da seção `Extras` e pelo dropdown de histórico dos extras adicionais.

`data/observacoes.json` guarda as observações padrão e adicionais cadastradas no formulário. O arquivo é uma lista simples de textos, usada pela lista rápida reordenável da seção `Observações` e pelo dropdown de histórico das observações adicionais.

A pasta `output/` guarda os PDFs gerados automaticamente após a impressão. Ela é criada pelo servidor quando necessário e não entra no controle de versão.

## Lógica de Cirurgia

A seção `Cirurgia` usa uma lista dinâmica de inputs com botões `+/-`. Cada input usa dropdown de histórico alimentado por `data/cirurgias.json` via `/api/cirurgias`.

Com duas ou mais entradas, `updateSurgeryFieldStructure()` exibe um handle de arraste (`⋮⋮`) à esquerda de cada campo, dentro de `.surgery-field-row`, mantendo o input em flex para ocupar toda a largura do painel. O rótulo `Cirurgia proposta` permanece sempre no primeiro campo, mesmo após reordenar.

O arraste usa eventos de ponteiro apenas no handle, sem interferir na digitação. Durante o movimento, `app.js` mostra a mesma linha de encaixe usada nas listas rápidas; ao soltar, reorganiza os `<label class="surgery-field">` no DOM, chama `updatePreview()` e não persiste nada no servidor. `getSurgeryValues()` lê a ordem atual dos inputs no DOM, e essa ordem alimenta o preview do documento.

## Lógica de Implantes

A seção `Implantes` no formulário é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, o dropdown fica desabilitado, o conteúdo da seção fica oculto, o espaçamento vertical do fieldset é reduzido no painel esquerdo e a seção não aparece no documento.

Quando um item é selecionado, o preview exibe uma caixa arredondada com duas colunas:

- à esquerda: `marca - rotulo - modelo - referencia`, com quebra de linha se necessário;
- à direita: `valorAVista` na primeira linha e `valorCartao7x` na segunda linha, ambos alinhados à direita.

## Lógica de Tecnologias

A seção `Tecnologias` no formulário é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, os campos ficam desabilitados, o conteúdo da seção fica oculto, o espaçamento vertical do fieldset é reduzido no painel esquerdo e a seção não aparece no documento.

O campo `Tecnologia` usa um dropdown de histórico alimentado por `data/tecnologias.json`. Ao selecionar uma opção, o app carrega o `valor` salvo junto com o `nome`.

O campo `Valor:` fica na mesma linha do input e normaliza moeda em padrão brasileiro ao sair do campo e antes de salvar. Exemplos: `10000` vira `R$ 10.000,00`; `10000,5` vira `R$ 10.000,50`.

No preview, a seção aparece em uma caixa arredondada com duas colunas: tecnologia à esquerda e valor à direita.

## Lógica de Equipe

A seção `Equipe` é fixa, sem checkbox no título. Ela contém checkboxes pré-marcados para `Cirurgião`, `Anestesista`, `Auxiliar`, `Eq. Enfermagem`, `Modelador`, `Placas` e `Meias`.

Os itens ficam em três colunas no formulário. No preview, apenas os itens marcados são exibidos, separados por ` + `.

O campo `Valor:` usa a mesma normalização monetária de tecnologias: valores como `10000` são convertidos para `R$ 10.000,00` ao sair do campo. O preview exibe os itens à esquerda e o valor à direita.

## Lógica de Extras

A seção `Extras` é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, o conteúdo do formulário fica oculto, os controles internos são desabilitados, o fieldset recebe `is-collapsed` e a seção não aparece no documento.

Quando habilitada, a seção é alimentada por `data/extras.json` via `/api/extras` e fica antes de `Pagamento` no formulário e no documento. O conteúdo interno usa `#extrasFormContent` com o mesmo `gap` em grid das outras seções opcionais, mantendo o espaçamento entre `Extras padrão`, a lista rápida e `Extras adicionais` alinhado ao de `Pagamento`. No painel, `renderExtrasQuickList()` exibe as entradas salvas como `Extras padrão`, com checkboxes marcados por padrão e botão de exclusão integrado ao histórico.

Os `Extras adicionais` usam uma lista dinâmica de inputs com botões `+/-`. Cada input usa dropdown legado alimentado pelo mesmo histórico e permite salvar novas entradas, selecionar existentes ou excluir opções antigas.

A lista rápida de extras padrão usa eventos de ponteiro para permitir drag and drop sem interferir nos checkboxes e no botão de exclusão. Durante o arraste, `app.js` mostra uma linha de encaixe entre os itens; ao soltar, reorganiza `extrasHistory`, atualiza o preview e envia a lista completa para `PUT /api/extras`, que normaliza duplicatas e grava a nova ordem em `data/extras.json`.

No preview, `updateExtrasPreview()` combina os extras padrão marcados com os adicionais preenchidos, remove duplicatas por texto normalizado e renderiza os itens em uma lista com marcadores. O espaçamento entre itens é controlado por `#extrasPreview` em `styles.css`.

## Lógica de Pagamento

A seção `Pagamento` mantém apenas as formas de pagamento. O antigo campo `Itens Incluídos` foi removido do formulário, do preview e da lista de campos sincronizados em `app.js`.

No formulário, `Pagamento` usa uma lista dinâmica de inputs com botões `+/-`, no mesmo padrão de `Cirurgia`. Cada input usa dropdown de histórico alimentado por `data/pagamentos.json` via `/api/pagamentos`.

As entradas salvas em `data/pagamentos.json` também são renderizadas em uma lista rápida acima do campo manual. Cada item vem marcado por padrão, pode ser desmarcado sem sair do histórico e tem um botão de exclusão que remove a entrada via `/api/pagamentos`.

A lista rápida usa eventos de ponteiro para permitir drag and drop sem interferir nos checkboxes e no botão de exclusão. Durante o arraste, `app.js` mostra uma linha de encaixe entre os itens; ao soltar, reorganiza `paymentHistory`, atualiza o preview e envia a lista completa para `PUT /api/pagamentos`, que normaliza duplicatas e grava a nova ordem em `data/pagamentos.json`.

No preview, as formas de pagamento preenchidas são renderizadas como parágrafos sem marcadores, com espaçamento leve entre cada item.

## Lógica de Observações

A seção `Observações` é alimentada por `data/observacoes.json` via `/api/observacoes`. No formulário, `renderGuidanceQuickList()` exibe as entradas salvas como `Observações padrão`, com checkboxes marcados por padrão e botão de exclusão integrado ao histórico.

As `Observações adicionais` usam uma lista dinâmica de inputs com botões `+/-`. Cada input usa dropdown legado alimentado pelo mesmo histórico e permite salvar novas entradas, selecionar existentes ou excluir opções antigas.

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

## Exportação de PDF

Quando o usuário clica em `Imprimir orçamento`, `app.js` salva os históricos pendentes, dispara `exportPdfDocument()` e chama `window.print()`. A exportação do PDF ocorre no clique, em paralelo com a abertura da janela de impressão; o frontend envia o HTML das páginas (`#printPage` e `.generated-print-page`) para `POST /api/pdf` junto com o nome da paciente.

O servidor monta um documento HTML autocontido com `styles.css`, fontes e papel timbrado embutidos em base64, renderiza com `puppeteer-core` em modo impressão e grava o arquivo em `output/`.

## Lógica Hospitalar

A seção `Hospital` é controlada por um checkbox no título, marcado por padrão no HTML para cada nova sessão do app. Quando desmarcado, o conteúdo do formulário é ocultado, os controles internos são desabilitados e o bloco de hospital no preview recebe `hidden`.

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

- O projeto é intencionalmente simples: HTML, CSS, JavaScript e Node nativo.
- Não há build step.
- O estado persistente fica em JSON local.
- Alterações no preview devem chamar `updatePreview()` quando mudarem campos programaticamente.
- Alterações nas tabelas devem preservar o formato descrito em `docs/tabelas-hospitalares.md`.

## Evolução planejada

A stack descrita neste documento corresponde à versão **v0.1.0-node-web**, preservada no branch `stable/node-web-v0.1.0`. A migração para **Tauri** substitui Node.js e o launcher manual por um executável com WebView2, mantendo o frontend atual. Detalhes em `docs/MIGRATION-tauri.md`.

### Stack Tauri (branch `feature/tauri`)

```text
abrir-auto-orcamento-tauri.bat
  -> npm run tauri:dev
      -> copy-frontend -> dist/
      -> auto-orcamento.exe (WebView2)
          -> index.html + api.js + app.js
          -> invoke history_* / technologies_*  ->  data/*.json
          -> fetch data/tabelas-*.json          ->  dist/data/
```

- **`api.js`:** detecta Tauri vs Node; no Tauri usa `window.__TAURI__.core.invoke` (requer `withGlobalTauri: true`).
- **`src-tauri/src/storage.rs`:** grava JSON mutável; em debug usa `{projeto}/data/`, em release `{exe}/data/`.
- **PDF automático:** ainda via Node (`/api/pdf`) — pendente na Fase 3.

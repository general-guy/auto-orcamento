# Arquitetura

O Auto Orçamento é um web app local servido por Node.js. A aplicação não depende de banco de dados nem de servidor externo: os arquivos estáticos, históricos e tabelas de referência ficam dentro do próprio projeto.

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
- `POST /api/shutdown`: encerra o servidor quando acionado pela interface.

Os históricos são listas JSON simples, limitadas a 200 itens por tipo.

## Frontend

`index.html` define duas áreas principais:

- painel esquerdo com o formulário;
- painel direito com a pré-visualização do documento final.

`styles.css` controla:

- layout em colunas com painel esquerdo redimensionável;
- visual dos campos, botões, dropdowns e pré-visualização;
- papel A4 com imagem de fundo do papel timbrado;
- regras específicas de impressão.

`app.js` concentra a lógica de interação:

- sincronização entre formulário e preview;
- histórico/autocomplete de pacientes, cirurgias e hospitais;
- campos dinâmicos de cirurgia e hospital;
- entradas auxiliares de Regina e Sapiranga;
- multiplicadores de pacotes hospitalares;
- autofill das entradas auxiliares;
- redimensionamento do painel;
- impressão, limpeza e shutdown.

## Dados

Arquivos de histórico:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
```

Tabela hospitalar estruturada:

```text
data/tabelas-hospitalares.json
```

O frontend carrega `data/tabelas-hospitalares.json` diretamente para montar os `datalist` de Regina e Sapiranga e para calcular os valores exibidos no preview.

## Lógica Hospitalar

Quando o nome do hospital contém `regin`, o app cria entradas auxiliares `Reg1`, `Reg2`, etc. Quando contém `sapirang`, cria `Sap1`, `Sap2`, etc.

Cada entrada auxiliar tem:

- campo de pacote/taxa;
- campo de multiplicador, iniciado com `1`;
- sugestões vindas das tabelas hospitalares locais.

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
- ordena os pacotes na ordem de `regina.pacotesCirurgiaPlastica`;
- soma o `tempoSalaHoras` dos pacotes selecionados;
- compara com `Tempo previsto de hospital`;
- quando faltar tempo, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE`;
- calcula o multiplicador em unidades de meia hora;
- ordena as taxas adicionais na ordem de `regina.taxasAdicionais`.

Exemplo: se faltam `6` horas, o multiplicador da taxa de meia hora é `12`.

A ordem final é: pacotes de cirurgia plástica, taxas adicionais e, ao fim, entradas não reconhecidas.

## Convenções

- O projeto é intencionalmente simples: HTML, CSS, JavaScript e Node nativo.
- Não há build step.
- O estado persistente fica em JSON local.
- Alterações no preview devem chamar `updatePreview()` quando mudarem campos programaticamente.
- Alterações nas tabelas devem preservar o formato descrito em `docs/tabelas-hospitalares.md`.

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
- `GET /api/tecnologias`, `POST /api/tecnologias`, `DELETE /api/tecnologias`: histórico de tecnologias com valor associado.
- `POST /api/shutdown`: encerra o servidor quando acionado pela interface.

Os históricos de pacientes, cirurgias e hospitais são listas JSON simples, limitadas a 200 itens por tipo. O histórico de tecnologias também é limitado a 200 itens, mas cada item é um objeto com `nome` e `valor`.

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
- histórico/autocomplete de pacientes, cirurgias, hospitais e tecnologias;
- campos dinâmicos de cirurgia e hospital;
- entradas auxiliares de Regina e Sapiranga;
- multiplicadores de pacotes hospitalares;
- autofill das entradas auxiliares;
- carregamento e renderização da tabela de implantes;
- persistência de tecnologias com valor monetário associado;
- redimensionamento do painel;
- impressão, limpeza e shutdown.

## Dados

Arquivos de histórico:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
data/tecnologias.json
```

Tabelas de referência estruturadas:

```text
data/tabelas-hospitalares.json
data/tabela-implantes.json
```

O frontend carrega `data/tabelas-hospitalares.json` diretamente para montar os `datalist` de Regina e Sapiranga e para calcular os valores exibidos no preview.

`data/tabela-implantes.json` guarda uma tabela independente de implantes, extraída de documento `.doc`, para preenchimento opcional da seção `Implantes`. O dropdown usa `rotulo`, `modelo` e `referencia`; itens com `favorito: true` recebem uma estrela ao final da opção.

`data/tecnologias.json` guarda as tecnologias cadastradas no próprio app. Diferente dos históricos simples, cada item tem `nome` e `valor`, permitindo carregar o valor automaticamente quando a tecnologia é selecionada.

## Lógica de Implantes

A seção `Implantes` no formulário é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, o dropdown fica desabilitado e a seção não aparece no documento.

Quando um item é selecionado, o preview exibe uma caixa arredondada com duas colunas:

- à esquerda: `marca - rotulo - modelo - referencia`, com quebra de linha se necessário;
- à direita: `valorAVista` na primeira linha e `valorCartao7x` na segunda linha, ambos alinhados à direita.

## Lógica de Tecnologias

A seção `Tecnologias` no formulário é controlada por um checkbox no próprio título. Quando o checkbox está desmarcado, os campos ficam desabilitados e a seção não aparece no documento.

O campo `Tecnologia` usa um dropdown de histórico alimentado por `data/tecnologias.json`. Ao selecionar uma opção, o app carrega o `valor` salvo junto com o `nome`.

O campo `Valor:` fica na mesma linha do input e normaliza moeda em padrão brasileiro ao sair do campo e antes de salvar. Exemplos: `10000` vira `R$ 10.000,00`; `10000,5` vira `R$ 10.000,50`.

No preview, a seção aparece em uma caixa arredondada com duas colunas: tecnologia à esquerda e valor à direita.

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

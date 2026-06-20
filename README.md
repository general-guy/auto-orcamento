# Auto Orçamento

Aplicativo local para gerar orçamentos cirúrgicos em papel timbrado, com preenchimento rápido, histórico de campos e pré-visualização pronta para impressão.

## Como Usar

No Windows, clique duas vezes em:

```text
abrir-auto-orcamento.bat
```

Esse atalho inicia o servidor local, abre o app em uma janela do Chrome em modo app e mantém o servidor ativo enquanto essa janela estiver aberta. Ao fechar a janela do app, o processo do servidor também é encerrado.

Como alternativa, execute manualmente na pasta do projeto:

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:3000
```

## Requisitos

Para **usar** o app nesta versão (stack Node.js + browser):

| Recurso | Necessário |
|---|---|
| Node.js LTS | Sim |
| npm | Sim (vem com Node) |
| Google Chrome ou Microsoft Edge | Sim (janela do app e PDF automático) |
| Internet | Só na primeira execução, se `node_modules` ainda não existir |

Não são necessários Python, PowerShell nem Git para uso normal.

Para migrar a pasta para outro PC: instale Node.js, copie o projeto (de preferência com `node_modules` incluído para evitar download) e execute o `.bat`.

## Versão estável e migração Tauri

A versão atual da stack Node.js + browser está documentada em:

```text
docs/SNAPSHOT-node-web-v0.1.0.md
```

O branch **`stable/node-web-v0.1.0`** e a tag **`v0.1.0-node-web`** preservam esse estado estável enquanto a migração para Tauri é desenvolvida na `main`. O plano da migração está em `docs/MIGRATION-tauri.md`.

Para restaurar a versão Node:

```bash
git checkout stable/node-web-v0.1.0
npm install
```

## Versão Tauri (em desenvolvimento)

A migração para Tauri está em andamento no branch `feature/tauri`. Nesta fase, o app abre em uma janela nativa (WebView2) sem precisar do Node em runtime.

Desenvolvimento:

```bash
npm install
npm run tauri:dev
```

Ou clique duas vezes em `abrir-auto-orcamento-tauri.bat`.

Build do executável Windows:

```bash
npm run tauri:build
```

O `.exe` fica em `src-tauri/target/release/auto-orcamento.exe`. Instaladores NSIS e MSI são gerados em `src-tauri/target/release/bundle/`.

**Requisito de build:** Rust (`winget install Rustlang.Rustup`). WebView2 já vem no Windows 10/11.

Nesta fase (Fase 1), o formulário e o preview visual funcionam; históricos e PDF automático ainda dependem das fases seguintes. Detalhes em `docs/MIGRATION-tauri.md`.

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
- Permite reordenar por drag and drop as cirurgias propostas no formulário e as listas rápidas de extras, pagamento e observações.
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

Esses arquivos são usados pelo servidor Node.js e são versionados no repositório como base inicial do app. Quando o app altera históricos como extras, pagamentos, observações ou tecnologias, essas mudanças ficam locais até serem adicionadas a um commit.

Os PDFs gerados automaticamente ficam em:

```text
output/
```

Essa pasta não é versionada no Git. Cada arquivo usa o nome da paciente, a data e o horário da geração, por exemplo `Maria da Silva 2026-06-18 14-30-05.pdf`.

## Impressão e PDF automático

Ao clicar em `Imprimir orçamento`, o app envia o documento atual da pré-visualização ao servidor e abre a impressão do navegador em seguida. O PDF é gerado no clique, sem esperar o fim da impressão, e salvo em `output/`.

O PDF usa o mesmo layout paginado da pré-visualização, incluindo papel timbrado, fontes e estilos de impressão. A geração embute `styles.css`, fontes e imagens localmente, sem depender de novas requisições HTTP durante a exportação. Se já existir um arquivo com o mesmo nome, o app acrescenta um sufixo numérico, como `(2)`.

## Hospitais Com Autofill

A seção `Hospital` tem checkbox no título e vem marcada por padrão a cada nova sessão do app. Quando desmarcada, o conteúdo da seção é recolhido no painel esquerdo e o bloco de hospital deixa de aparecer no documento.

O botão verde ao lado do hospital preenche e reorganiza as entradas auxiliares.

Para Sapiranga, os pacotes de centro cirúrgico ficam no topo, ordenados do maior valor para o menor, e recebem multiplicadores progressivos. Depois vêm os pacotes de ambulatório, a hora excedente e, por último, as diárias. Diárias não entram no cálculo de tempo de sala e mantêm o multiplicador normal.

Para Regina, o app ordena os pacotes por valor decrescente e aplica multiplicadores automáticos (`1`, `0.7` e `0.5`) apenas sobre o valor de cada pacote. Adicionais de sala e pernoite de recuperação ficam depois, na ordem do JSON. Se faltar tempo em relação ao tempo previsto de hospital, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE` com multiplicador em unidades de meia hora, usando sempre o tempo bruto dos pacotes no cálculo.

## Implantes

A seção `Implantes` é opcional. Ao marcar o checkbox no título da seção, o dropdown é exibido e habilitado, e o implante selecionado aparece no documento em uma caixa arredondada. Quando desmarcada, o conteúdo da seção fica oculto e o espaçamento vertical é reduzido no painel esquerdo para economizar espaço visual.

O dropdown usa `rotulo`, `modelo` e `referencia`. Itens marcados com `favorito: true` recebem destaque e uma estrela no final da opção.

No documento, a caixa mostra a descrição do implante à esquerda e os valores à direita: primeiro o valor à vista, depois o valor em 7x no cartão.

## Tecnologias

A seção `Tecnologias` é opcional. Ao marcar o checkbox no título da seção, os campos de tecnologia e valor são exibidos e habilitados. Quando desmarcada, o conteúdo da seção fica oculto e o espaçamento vertical é reduzido no painel esquerdo para economizar espaço visual.

Cada tecnologia salva o `nome` junto com seu `valor`. Ao selecionar uma tecnologia já cadastrada, o valor correspondente é carregado automaticamente. O campo de valor normaliza moeda em padrão brasileiro, por exemplo `10000` vira `R$ 10.000,00`.

No documento, a tecnologia aparece em uma caixa arredondada com o nome à esquerda e o valor alinhado à direita.

## Equipe

A seção `Equipe` é fixa e vem com os itens `Cirurgião`, `Anestesista`, `Auxiliar`, `Eq. Enfermagem`, `Modelador`, `Placas` e `Meias` pré-marcados.

No formulário, os itens ficam em três colunas. O campo `Valor:` normaliza moeda em padrão brasileiro, como `10000` para `R$ 10.000,00`.

No documento, a caixa de equipe mostra os itens marcados separados por ` + ` e o valor alinhado à direita.

## Cirurgia

A seção `Cirurgia` usa campos dinâmicos com botões `+/-`, no mesmo padrão de `Hospital` e `Pagamento`. Cada entrada preenchida pode ser reaproveitada pelo dropdown de histórico e salva em `data/cirurgias.json`.

Com duas ou mais cirurgias propostas, aparece um indicador `⋮⋮` à esquerda de cada caixa de texto. Esse drag and drop é só visual: reorganiza os campos no painel e a ordem exibida no preview do documento, sem alterar a ordem do histórico em `data/cirurgias.json`.

## Extras

A seção `Extras` é opcional e fica antes de `Pagamento`. Ao marcar o checkbox no título da seção, a lista rápida, os campos adicionais e o bloco correspondente no documento são exibidos e habilitados. Quando desmarcada, o conteúdo da seção fica oculto, o espaçamento vertical é reduzido no painel esquerdo e os extras deixam de aparecer no preview.

No painel esquerdo, `Extras padrão` usa uma lista rápida alimentada por `data/extras.json`, com checkboxes marcados por padrão, botão `×` e drag and drop com persistência da ordem no JSON.

A lista rápida aceita drag and drop para reorganizar os extras. Ao soltar um item em outra posição, a ordem visual, o preview do documento e o arquivo `data/extras.json` são atualizados juntos.

`Extras adicionais` usa campos dinâmicos com dropdown de histórico e botões `+/-`, permitindo incluir novas entradas, reutilizar existentes ou excluir opções antigas.

No documento final, os extras aparecem como lista com marcadores redondos, com espaçamento de `6px` entre os itens.

## Atalhos de teclado

Nos campos dinâmicos de `Cirurgia`, `Hospital`, `Extras`, `Pagamento` e `Observações`, `Shift+Enter` adiciona outra linha na mesma seção. `Enter` avança apenas para a próxima linha da mesma seção; no último campo da seção, tira o foco da caixa atual para salvar no histórico e atualizar o preview, sem pular para a seção seguinte.

Nos demais campos de texto, `Enter` continua avançando para o próximo campo habilitado do formulário.

## Pagamento

A seção `Pagamento` reúne somente as formas de pagamento. No painel esquerdo, ela usa campos dinâmicos com botões `+/-`, seguindo o mesmo padrão da seção `Cirurgia`.

Cada forma preenchida pode ser reaproveitada pelo dropdown de histórico, salvo em `data/pagamentos.json`. As entradas salvas também aparecem como uma lista rápida acima do campo manual, com checkboxes marcados por padrão e botão de exclusão integrado ao histórico.

A lista rápida aceita drag and drop para reorganizar as formas de pagamento. Ao soltar um item em outra posição, a ordem visual, o preview do documento e o arquivo `data/pagamentos.json` são atualizados juntos.

No documento final, as formas de pagamento preenchidas aparecem como parágrafos sem marcadores, com espaçamento leve entre cada item.

## Observações

A seção `Observações` usa uma lista rápida de observações padrão alimentada por `data/observacoes.json`. As entradas aparecem com checkboxes marcados por padrão e podem ser removidas do histórico pelo botão `×`.

A lista rápida aceita drag and drop para reorganizar as observações. Ao soltar um item em outra posição, a ordem visual, o preview do documento e o arquivo `data/observacoes.json` são atualizados juntos.

Abaixo da lista padrão, `Observações adicionais` usa campos dinâmicos com dropdown de histórico e botões `+/-`, seguindo o mesmo padrão de preenchimento de `Pagamento`.

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
docs/MIGRATION-tauri.md
```

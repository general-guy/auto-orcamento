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
npm start
```

Depois acesse:

```text
http://localhost:3000
```

## Ambiente Recomendado

Para manutenção do projeto no Windows, recomenda-se usar PowerShell 7 (`pwsh`) como terminal padrão do Cursor, em vez do Windows PowerShell antigo (`powershell.exe`). O `pwsh` aceita operadores modernos como `&&` e evita diferenças de sintaxe do Windows PowerShell 5.1.

Se necessário, instale com:

```powershell
winget install Microsoft.PowerShell
```

Depois configure o Cursor para abrir novos terminais com o perfil `PowerShell 7`.

## O Que o App Faz

- Preenche os dados da paciente, cirurgia, hospital, implantes, tecnologias, equipe, formas de pagamento e orientações.
- Mostra uma pré-visualização do documento final sobre o papel timbrado.
- Permite imprimir ou salvar em PDF usando a impressão do navegador.
- Guarda histórico local de pacientes, cirurgias, hospitais, formas de pagamento e tecnologias.
- Cria múltiplas entradas de cirurgia e hospital.
- Para Regina e Sapiranga, cria entradas auxiliares (`Reg1`, `Sap1`, etc.) com multiplicadores.
- Usa tabelas hospitalares locais para sugerir pacotes e calcular valores auxiliares no preview.
- Permite incluir uma seção opcional de implantes, alimentada por `data/tabela-implantes.json`.
- Permite incluir uma seção opcional de tecnologias, com nome e valor salvos em `data/tecnologias.json`.
- Mantém uma seção fixa de equipe com itens pré-marcados e valor normalizado em moeda brasileira.

## Dados Locais

Os históricos ficam em arquivos JSON dentro de `data/`:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
data/pagamentos.json
data/tecnologias.json
```

As tabelas de referência estruturadas ficam em:

```text
data/tabelas-hospitalares.json
data/tabela-implantes.json
```

Esses arquivos são usados apenas localmente pelo servidor Node.js.

## Hospitais Com Autofill

O botão verde ao lado do hospital preenche e reorganiza as entradas auxiliares.

Para Sapiranga, os pacotes de centro cirúrgico ficam no topo, ordenados do maior valor para o menor, e recebem multiplicadores progressivos. Depois vêm os pacotes de ambulatório, a hora excedente e, por último, as diárias. Diárias não entram no cálculo de tempo de sala e mantêm o multiplicador normal.

Para Regina, o app reorganiza os itens na ordem do `data/tabelas-hospitalares.json`: pacotes primeiro e taxas adicionais depois. Se faltar tempo em relação ao tempo previsto de hospital, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE` com multiplicador em unidades de meia hora.

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

## Pagamento

A seção `Pagamento` reúne somente as formas de pagamento. No painel esquerdo, ela usa campos dinâmicos com botões `+/-`, seguindo o mesmo padrão da seção `Cirurgia`.

Cada forma preenchida pode ser reaproveitada pelo dropdown de histórico, salvo em `data/pagamentos.json`. No documento final, as formas de pagamento preenchidas aparecem em linhas separadas.

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
```

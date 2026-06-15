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

## O Que o App Faz

- Preenche os dados da paciente, cirurgia, hospital, valores, formas de pagamento, itens incluídos e orientações.
- Mostra uma pré-visualização do documento final sobre o papel timbrado.
- Permite imprimir ou salvar em PDF usando a impressão do navegador.
- Guarda histórico local de pacientes, cirurgias e hospitais.
- Cria múltiplas entradas de cirurgia e hospital.
- Para Regina e Sapiranga, cria entradas auxiliares (`Reg1`, `Sap1`, etc.) com multiplicadores.
- Usa tabelas hospitalares locais para sugerir pacotes e calcular valores auxiliares no preview.
- Permite incluir uma seção opcional de implantes, alimentada por `data/tabela-implantes.json`.

## Dados Locais

Os históricos ficam em arquivos JSON dentro de `data/`:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
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

A seção `Implantes` é opcional. Ao marcar o checkbox no título da seção, o dropdown é habilitado e o implante selecionado aparece no documento em uma caixa arredondada.

O dropdown usa `rotulo`, `modelo` e `referencia`. Itens marcados com `favorito: true` recebem destaque e uma estrela no final da opção.

No documento, a caixa mostra a descrição do implante à esquerda e os valores à direita: primeiro o valor à vista, depois o valor em 7x no cartão.

## Documentação Técnica

Detalhes de arquitetura, arquivos principais, endpoints locais e fluxo do launcher ficam em:

```text
ARCHITECTURE.md
```

Detalhes sobre a origem e manutenção das tabelas hospitalares ficam em:

```text
docs/tabelas-hospitalares.md
docs/tabela-implantes.md
```

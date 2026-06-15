# Tabela de implantes

Este documento descreve a referência de implantes extraída do arquivo `.doc` enviado para a raiz do projeto.

## Arquivo principal

Os dados estruturados estão em:

```text
data/tabela-implantes.json
```

O arquivo contém:

- `nome`: identificação geral da tabela.
- `origem`: nome do arquivo original usado na extração.
- `vigencia`: data inicial indicada na tabela original.
- `condicaoPagamento`: condição de pagamento principal da coluna parcelada.
- `observacoes`: notas gerais da tabela, como consulta de frete.
- `itens`: lista dos implantes extraídos.

Cada item contém:

- `rotulo`: texto curto usado como nome amigável no dropdown.
- `referencia`: código ou conjunto de códigos da referência.
- `modelo`: nome do modelo.
- `valorCartao7x`: valor da coluna `07x cartão`.
- `valorAVista`: valor da coluna `à vista`.
- `marca`: marca do implante.
- `favorito`: booleano usado para destacar opções preferenciais.

## Uso no app

A seção `Implantes` substitui a antiga seção `Valores` e é opcional. No formulário, o checkbox ao lado do título habilita ou desabilita o dropdown.

O dropdown usa `rotulo`, `modelo` e `referencia` para montar cada opção. Quando `favorito` é `true`, o item recebe destaque visual e uma estrela ao final da linha, depois do número de referência.

No documento final, o implante selecionado é exibido em uma caixa de bordas arredondadas:

- a coluna esquerda mostra `marca - rotulo - modelo - referencia`;
- a coluna direita mostra `valorAVista` na primeira linha, com o sufixo `à vista`;
- a coluna direita mostra `valorCartao7x` na segunda linha, com o sufixo `em 7x no cartão`.

A coluna de valores fica alinhada à direita. A descrição pode quebrar linha quando necessário para não invadir o espaço reservado aos valores.

## Extração

O arquivo original era um `.doc`. Como Word e LibreOffice não estavam disponíveis no ambiente, a conversão foi feita com o conversor local do OnlyOffice:

```text
C:\Program Files\ONLYOFFICE\DesktopEditors\converter\x2t.exe
```

Fluxo usado:

1. Converter o `.doc` para `.docx` em uma pasta temporária.
2. Ler `word/document.xml` dentro do `.docx`.
3. Extrair a única tabela encontrada no documento.
4. Normalizar os textos com acentuação corrompida pela conversão.
5. Salvar a estrutura em `data/tabela-implantes.json`.
6. Apagar o `.doc` original e arquivos temporários.

## Observações

- A tabela original tinha o cabeçalho `CIRURGIAS A PARTIR DE 01/01/2026`.
- A linha final `VALOR DO FRETE: FAVOR CONSULTAR A SUA CIDADE` foi preservada em `observacoes`.
- A referência permanente no projeto é o JSON, não o `.doc`.

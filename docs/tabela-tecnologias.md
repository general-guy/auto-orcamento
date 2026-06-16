# Tabela de tecnologias

Este documento descreve o histórico local usado pela seção opcional `Tecnologias`.

## Arquivo principal

Os dados ficam em:

```text
data/tecnologias.json
```

O arquivo é uma lista de objetos. Cada item contém:

- `nome`: nome da tecnologia exibido no dropdown e no documento.
- `valor`: valor associado à tecnologia, salvo como texto monetário em padrão brasileiro.

Exemplo:

```json
[
  {
    "nome": "Argoplasma",
    "valor": "R$ 10.000,00"
  }
]
```

## Uso no app

A seção `Tecnologias` é opcional. O checkbox no título habilita ou desabilita os campos.

O campo `Tecnologia` usa o histórico salvo em `data/tecnologias.json`. Quando uma opção existente é selecionada, o app preenche automaticamente o campo `Valor:` com o valor salvo no mesmo objeto.

Ao sair do campo `Valor:` ou antes de salvar/imprimir, o app normaliza o valor para moeda brasileira. Exemplos:

- `10000` vira `R$ 10.000,00`.
- `10000,5` vira `R$ 10.000,50`.
- `R$ 10.000,00` permanece `R$ 10.000,00`.

No documento final, a tecnologia aparece em uma caixa de bordas arredondadas com o nome à esquerda e o valor alinhado à direita.

## Manutenção

As tecnologias podem ser cadastradas pelo próprio formulário. Também é possível editar `data/tecnologias.json` manualmente, mantendo a lista como JSON válido e preservando os campos `nome` e `valor`.

# Procedimentos Unimed N

Este documento descreve o histórico editável usado pelos subitens `Uni#` quando o nome do hospital contém `Unimed N` (ex.: `Unimed Novo Hamburgo`).

## Arquivo principal

Os dados ficam em:

```text
data/unimed-n.json
```

O arquivo é uma lista de objetos. Cada item contém:

- `nome`: nome do procedimento exibido no dropdown e no documento.
- `valor`: valor associado, salvo como texto numérico em padrão brasileiro **sem** o prefixo `R$` (ex.: `7.950,00`). O rótulo `R$` fica ao lado do campo no formulário; no preview/documento o total aparece formatado com `R$`.

Exemplo:

```json
[
  {
    "nome": "Abdominoplastia + Lipoaspiração (6h de sala)",
    "valor": "7.950,00"
  }
]
```

Diferente de `data/tabelas-hospitalares.json` (Regina/Sapiranga), este arquivo **não** é uma tabela de referência fixa: o app alimenta e edita a lista pelo uso, no mesmo espírito de pacientes, cirurgias, hospitais e tecnologias.

## Detecção no formulário

Quando o nome do hospital (normalizado, sem acentos) contém a substring `unimed n`, o app cria entradas auxiliares `Uni1`, `Uni2`, etc., com:

- campo de procedimento;
- campo de valor (`R$` + caixa de texto), em vez do multiplicador `x` usado em Regina/Sapiranga;
- botões `+/-` para adicionar/remover linhas;
- **sem** botão verde de autofill.

## Uso no app

O dropdown `#hospitalProcedureDropdown` lista os procedimentos de `data/unimed-n.json`. Ao selecionar uma opção, o app preenche o nome e o valor salvos.

Ao sair do campo de procedimento ou de valor (ou ao imprimir), o app:

1. normaliza o valor para o padrão brasileiro sem `R$` no input;
2. grava/atualiza o item em `data/unimed-n.json` via `/api/unimed-n` (objetos `{ nome, valor }`).

No preview, o total do hospital Unimed N é a soma dos valores digitados nas linhas `Uni#`, formatados com `R$`.

## API

- `GET /api/unimed-n`
- `POST /api/unimed-n` — corpo `{ "nome", "valor" }`
- `DELETE /api/unimed-n` — corpo `{ "nome" }`
- `PUT /api/unimed-n` — corpo `{ "items": [ { "nome", "valor" }, ... ] }`

No cliente: `AppApi.getUnimedNProcedures`, `addUnimedNProcedure`, `removeUnimedNProcedure`, `replaceUnimedNProcedures`.

Limite: 200 itens.

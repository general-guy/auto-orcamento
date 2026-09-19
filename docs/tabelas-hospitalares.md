# Tabelas hospitalares

Este documento descreve a estrutura das referências hospitalares usadas pelo app.

## Arquivo principal

Os dados estruturados estão em `data/tabelas-hospitalares.json`.

Esse arquivo contém:

- `regina.pacotesCirurgiaPlastica`: pacotes de cirurgia plástica do Hospital Regina, com `pacote`, `tempoSala`, `tempoSalaHoras`, `tempoSR` e `valor`.
- `regina.taxasAdicionais`: taxas adicionais do Hospital Regina, com `descricao` e `valor`.
- `sapiranga.cirurgiasPlasticasCentroCirurgico`: pacotes de Cirurgias Plásticas - Centro Cirúrgico do Hospital Sapiranga, com `pacote`, `tempoSala`, `tempoSalaHoras`, `tempoSR` e `valor`.
- `sapiranga.cirurgiasPlasticasAmbulatorio`: pacotes de Cirurgias Plásticas - Ambulatório do Hospital Sapiranga, com `pacote`, `tempoSala`, `tempoSalaHoras`, `tempoSR` e `valor`.
- `sapiranga.diarias`: diária compacta em quarto privativo para cirurgia plástica, com `descricao` e `valor`.
- `sapiranga.excedente`: taxa de hora excedente em bloco cirúrgico, com `descricao` e `valor`.
- `blanc.pacotesCirurgiaPlastica`: pacotes de maior incidência e demais procedimentos do Blanc (exceto a taxa do Vibrolipo), com `pacote`, `tempoSala`, `tempoSalaHoras` e `valor`.
- `blanc.cirurgiasAssociadas`: procedimentos complementares da seção Cirurgias associadas, com os mesmos campos dos pacotes.
- `blanc.taxasAdicionais`: taxa de utilização do Vibrolipo, com `descricao` e `valor`.
- `blanc.diarias`: diárias e pernoite, com `descricao` e `valor`.
- `blanc.excedente`: meia hora excedente de cirurgia, meia hora de sala de pequenos procedimentos e hora excedente de recuperação, com `descricao` e `valor`.

Os valores do Blanc no JSON operacional já estão no **total do item** (parcela da coluna VALOR 1 + 3 SEM JUROS do PDF × 4). O frontend **não** lê `data/tabela-blanc-2026.json`; esse arquivo é só a extração seccionada (maior incidência, demais, associadas, diárias), com os mesmos totais e `fatorParcela: 4`.

Contagens atuais (tabela particular 2026): 304 pacotes em `pacotesCirurgiaPlastica` (13 de maior incidência + 292 demais, sem a taxa do Vibrolipo), 13 cirurgias associadas, 1 taxa, 4 diárias, 3 excedentes — 325 rótulos de opção únicos.

`data/tabela-Blanc.xlsx` é uma planilha antiga incompleta; não é fonte operacional e não entra no Git.

## Campos padronizados

- `pacote`: nome do pacote hospitalar.
- `descricao`: nome de uma taxa ou diária que não é pacote cirúrgico.
- `tempoSala`: tempo textual exibido no documento, como `2h`, `30min` ou `-`.
- `tempoSalaHoras`: tempo numérico usado nos cálculos, em horas decimais.
- `tempoSR`: tempo de sala de recuperação.
- `valor`: valor em reais, preservado como string formatada.

Os códigos originais da tabela Sapiranga não ficam no JSON operacional, porque não são usados no preenchimento do orçamento. Se forem necessários para auditoria, devem ser mantidos apenas em documentação ou material temporário de extração.

## Uso no app

O frontend carrega `data/tabelas-hospitalares.json` para montar as sugestões dos campos auxiliares `Reg#`, `Sap#` e `Bla#`.

Os subitens `Uni#` (Unimed N) **não** usam este arquivo: procedimentos e valores ficam no histórico editável `data/unimed-n.json`. Ver `docs/unimed-n.md`.

Também usa a tabela para:

- calcular `valor * multiplicador` no preview;
- somar `tempoSalaHoras`;
- adicionar hora excedente de Sapiranga quando o tempo previsto for maior que a soma dos pacotes;
- adicionar meia hora subsequente de Regina quando o tempo previsto for maior que a soma dos pacotes;
- adicionar meia hora excedente de cirurgia do Blanc quando o tempo previsto for maior que a soma dos pacotes e das cirurgias associadas;
- ordenar o resultado do botão verde conforme as seções do JSON; no Regina e no Blanc, os pacotes também são ordenados por valor decrescente.

O desconto de 3% à vista citado no PDF do Blanc **não** entra no `valor * multiplicador` do preview. Se precisar constar no documento, a frase fica nas formas de pagamento.

## Ordem usada pelo autofill

No Regina, o botão verde agrupa os itens nesta ordem:

1. `regina.pacotesCirurgiaPlastica`, ordenado por valor decrescente, com multiplicadores automáticos `1`, `0.7` e `0.5`
2. `regina.taxasAdicionais`, na ordem do JSON, incluindo meia hora subsequente e pernoite de recuperação

No Sapiranga, o botão verde agrupa os itens nesta ordem:

1. `sapiranga.cirurgiasPlasticasCentroCirurgico`, ordenado por valor decrescente
2. `sapiranga.cirurgiasPlasticasAmbulatorio`, na ordem do JSON
3. `sapiranga.excedente`
4. `sapiranga.diarias`

No Blanc, o botão verde agrupa os itens nesta ordem:

1. `blanc.pacotesCirurgiaPlastica` (procedimentos de maior incidência + demais procedimentos), ordenado por valor decrescente, com multiplicadores automáticos `1`, `0.6` e `0.5` (100% / 60% / 50% da tabela particular)
2. `blanc.cirurgiasAssociadas`, na ordem do JSON, sempre em `1` (não entram na escala 100/60/50)
3. `blanc.taxasAdicionais`, na ordem do JSON
4. `1/2 HORA EXCEDENTE DE CIRURGIA` quando faltar tempo em relação ao tempo previsto, com multiplicador em unidades de meia hora
5. demais itens de `blanc.excedente` escolhidos pelo usuário (meia hora de sala de pequenos procedimentos e hora de recuperação **não** são inseridos automaticamente)
6. `blanc.diarias`, na ordem do JSON

Diárias não entram no cálculo de tempo de sala e não recebem multiplicador automático, além do `1` padrão de novas entradas. No Blanc, cirurgias associadas entram na soma de `tempoSalaHoras` (junto com os pacotes), mas não recebem desconto: ficam em `1`.

Taxas adicionais de Regina (meia hora subsequente, centro de recuperação, pernoite etc.) ficam depois dos pacotes, na ordem do JSON, e não recebem os multiplicadores automáticos `1` / `0.7` / `0.5`.

## Como atualizar no futuro

Quando chegar uma nova tabela em PDF:

1. Coloque o PDF na raiz do projeto.
2. Extraia o texto inicialmente com a leitura de PDF do Cursor.
3. Se o texto sair em colunas embaralhadas, use extração por blocos com PyMuPDF (`fitz`), porque ela preserva melhor a posição visual dos trechos.
4. No PDF Regina, pareie os blocos pelo eixo vertical: o nome do pacote fica na coluna esquerda; tempo de sala cirúrgica, tempo de sala de recuperação e valor ficam na mesma altura, à direita.
5. No PDF Sapiranga, a extração textual linear costuma funcionar melhor: cada item pode ter código, pacote, valor particular e valor cartão saúde. Para este projeto, o dado usado como referência principal é o valor particular, salvo em `valor`.
6. No PDF Blanc (`PACOTE PLÁSTICA`), use sempre a coluna **VALOR 1 + 3 SEM JUROS** e multiplique por 4 para gravar o total do item. Procedimentos de maior incidência e demais procedimentos vão para `blanc.pacotesCirurgiaPlastica`, exceto a taxa do Vibrolipo (`blanc.taxasAdicionais`). Cirurgias associadas vão para `blanc.cirurgiasAssociadas`. Diárias de acomodação vão para `blanc.diarias`; as três linhas de hora excedente da seção Diárias vão para `blanc.excedente`. Atualize também `data/tabela-blanc-2026.json` se quiser manter o arquivo seccionado.
7. Atualize `data/tabelas-hospitalares.json` mantendo o mesmo formato de chaves.
8. Extraia o tempo de sala do nome do pacote de Sapiranga ou Blanc quando houver expressão como `até x horas`, preenchendo `tempoSala` e `tempoSalaHoras`.
9. Use `tempoSala: "-"` e `tempoSalaHoras: null` quando não houver tempo aplicável.
10. Depois de conferir a extração, apague o PDF temporário para não deixar duplicidade de fonte.

## Observações de extração

- No Regina, `LIPOASPIRACAO (SEDAÇÃO)` aparece duas vezes com tempos e valores diferentes; as duas linhas foram preservadas.
- No Regina, `LIPOENXERTIA` aparece sem tempo de sala e sem recuperação; foi mantido como `"-"`.
- No Sapiranga, o valor particular do código `000929` veio no PDF como `R$ 6.60600`; foi normalizado para `R$ 6.606,00`.
- No Blanc, os valores do PDF são a parcela (VALOR 1 + 3 SEM JUROS); o JSON operacional grava o total do item (`× 4`).
- No Blanc, `TAXA DE UTILIZAÇÃO DO VIBROLIPO` sai de `pacotesCirurgiaPlastica` e vai para `taxasAdicionais`.
- No Blanc, as três linhas de hora excedente da seção Diárias do PDF ficam em `excedente`; as diárias/pernoite ficam em `diarias`.
- No Blanc, o arquivo seccionado `data/tabela-blanc-2026.json` mantém a taxa do Vibrolipo em `demais`; o JSON operacional a separa.
- No Blanc, grafias do PDF foram preservadas (por exemplo `CIRURGA DE CASTANHARES`, `BLEFAROPLASIA`, `ATÉ 5:h`).
- Não use `data/tabela-Blanc.xlsx` como fonte (planilha antiga incompleta).
- Os PDFs originais foram tratados como temporários. A referência permanente fica no JSON.

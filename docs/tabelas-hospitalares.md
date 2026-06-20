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

## Campos padronizados

- `pacote`: nome do pacote hospitalar.
- `descricao`: nome de uma taxa ou diária que não é pacote cirúrgico.
- `tempoSala`: tempo textual exibido no documento, como `2h`, `30min` ou `-`.
- `tempoSalaHoras`: tempo numérico usado nos cálculos, em horas decimais.
- `tempoSR`: tempo de sala de recuperação.
- `valor`: valor em reais, preservado como string formatada.

Os códigos originais da tabela Sapiranga não ficam no JSON operacional, porque não são usados no preenchimento do orçamento. Se forem necessários para auditoria, devem ser mantidos apenas em documentação ou material temporário de extração.

## Uso no app

O frontend carrega `data/tabelas-hospitalares.json` para montar as sugestões dos campos auxiliares `Reg#` e `Sap#`.

Também usa a tabela para:

- calcular `valor * multiplicador` no preview;
- somar `tempoSalaHoras`;
- adicionar hora excedente de Sapiranga quando o tempo previsto for maior que a soma dos pacotes;
- adicionar meia hora subsequente de Regina quando o tempo previsto for maior que a soma dos pacotes.
- ordenar o resultado do botão verde conforme as seções do JSON; no Regina, os pacotes também são ordenados por valor decrescente.

## Ordem usada pelo autofill

No Regina, o botão verde agrupa os itens nesta ordem:

1. `regina.pacotesCirurgiaPlastica`, ordenado por valor decrescente, com multiplicadores automáticos `1`, `0.7` e `0.5`
2. `regina.taxasAdicionais`, na ordem do JSON, incluindo meia hora subsequente e pernoite de recuperação

No Sapiranga, o botão verde agrupa os itens nesta ordem:

1. `sapiranga.cirurgiasPlasticasCentroCirurgico`, ordenado por valor decrescente
2. `sapiranga.cirurgiasPlasticasAmbulatorio`, na ordem do JSON
3. `sapiranga.excedente`
4. `sapiranga.diarias`

Diárias não entram no cálculo de tempo de sala e não recebem multiplicador automático, além do `1` padrão de novas entradas.

Taxas adicionais de Regina (meia hora subsequente, centro de recuperação, pernoite etc.) ficam depois dos pacotes, na ordem do JSON, e não recebem os multiplicadores automáticos `1` / `0.7` / `0.5`.

## Como atualizar no futuro

Quando chegar uma nova tabela em PDF:

1. Coloque o PDF na raiz do projeto.
2. Extraia o texto inicialmente com a leitura de PDF do Cursor.
3. Se o texto sair em colunas embaralhadas, use extração por blocos com PyMuPDF (`fitz`), porque ela preserva melhor a posição visual dos trechos.
4. No PDF Regina, pareie os blocos pelo eixo vertical: o nome do pacote fica na coluna esquerda; tempo de sala cirúrgica, tempo de sala de recuperação e valor ficam na mesma altura, à direita.
5. No PDF Sapiranga, a extração textual linear costuma funcionar melhor: cada item pode ter código, pacote, valor particular e valor cartão saúde. Para este projeto, o dado usado como referência principal é o valor particular, salvo em `valor`.
6. Atualize `data/tabelas-hospitalares.json` mantendo o mesmo formato de chaves.
7. Extraia o tempo de sala do nome do pacote de Sapiranga quando houver expressão como `até x horas`, preenchendo `tempoSala` e `tempoSalaHoras`.
8. Use `tempoSala: "-"` e `tempoSalaHoras: null` quando não houver tempo aplicável.
9. Depois de conferir a extração, apague o PDF temporário para não deixar duplicidade de fonte.

## Observações de extração

- No Regina, `LIPOASPIRACAO (SEDAÇÃO)` aparece duas vezes com tempos e valores diferentes; as duas linhas foram preservadas.
- No Regina, `LIPOENXERTIA` aparece sem tempo de sala e sem recuperação; foi mantido como `"-"`.
- No Sapiranga, o valor particular do código `000929` veio no PDF como `R$ 6.60600`; foi normalizado para `R$ 6.606,00`.
- Os PDFs originais foram tratados como temporários. A referência permanente fica no JSON.

# Tabelas hospitalares

Esta pasta guarda as referências extraídas dos PDFs temporários de tabelas hospitalares.

## Arquivo principal

Os dados estruturados estão em `data/tabelas-hospitalares.json`.

Esse arquivo contém:

- `regina.pacotesCirurgiaPlastica`: pacotes de cirurgia plástica do Hospital Regina, de Abdominoplastia até Ritidoplastia, com tempo de sala cirúrgica, tempo de sala de recuperação e valor.
- `regina.taxasAdicionais`: taxas adicionais do Hospital Regina e seus valores.
- `sapiranga.cirurgiasPlasticasCentroCirurgico`: pacotes de Cirurgias Plásticas - Centro Cirúrgico do Hospital Sapiranga, com código, nome do pacote e valor particular.
- `sapiranga.cirurgiasPlasticasAmbulatorio`: pacotes de Cirurgias Plásticas - Ambulatório do Hospital Sapiranga, com código, nome do pacote e valor particular.
- `sapiranga.diarias`: diária compacta em quarto privativo para cirurgia plástica.

## Como atualizar no futuro

Quando chegar uma nova tabela em PDF:

1. Coloque o PDF na raiz do projeto.
2. Extraia o texto inicialmente com a leitura de PDF do Cursor.
3. Se o texto sair em colunas embaralhadas, use extração por blocos com PyMuPDF (`fitz`), porque ela preserva melhor a posição visual dos trechos.
4. No PDF Regina, pareie os blocos pelo eixo vertical: o nome do pacote fica na coluna esquerda; tempo de sala cirúrgica, tempo de sala de recuperação e valor ficam na mesma altura, à direita.
5. No PDF Sapiranga, a extração textual linear funciona melhor: cada item tem código, pacote, valor particular e valor cartão saúde. Para este projeto, o dado usado como referência principal é o valor particular.
6. Atualize `data/tabelas-hospitalares.json` mantendo o mesmo formato de chaves.
7. Depois de conferir a extração, apague o PDF temporário para não deixar duplicidade de fonte.

## Observações de extração

- No Regina, `LIPOASPIRACAO (SEDAÇÃO)` aparece duas vezes com tempos e valores diferentes; as duas linhas foram preservadas.
- No Regina, `LIPOENXERTIA` aparece sem tempo de sala e sem recuperação; foi mantido como `"-"`.
- No Sapiranga, o valor particular do código `000929` veio no PDF como `R$ 6.60600`; foi normalizado para `R$ 6.606,00`.
- Os PDFs originais foram tratados como temporários. A referência permanente fica no JSON.

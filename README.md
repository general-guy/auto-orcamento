# Auto Orçamento

Projeto local para automatizar a criação de orçamentos médicos em papel timbrado.

## Contexto

Durante a consulta, o médico precisa montar um orçamento para pacientes com cirurgia programada. Hoje esse processo é feito à mão em uma folha timbrada pessoal, incluindo informações como:

- nome da paciente;
- cirurgia proposta;
- hospital;
- tempo previsto de hospital;
- valores de hospital, equipe e tecnologias;
- formas de pagamento;
- itens incluídos nos valores;
- orientações adicionais.

O objetivo do projeto é reduzir a escrita manual, padronizar o documento e acelerar a entrega do orçamento ao final da consulta.

## Ideia do Produto

A proposta inicial é criar um mini programa de uso local, mais rápido e direto do que editar um documento no Word. A aplicação deve usar o papel timbrado como fundo e oferecer uma interface simples para preencher os campos variáveis do orçamento.

Também deve permitir selecionar modelos ou conjuntos de orientações por meio de opções como checkboxes, evitando reescrever textos repetitivos em cada consulta.

Ao final, o sistema deve gerar um documento pronto, padronizado e adequado para impressão, usando o papel timbrado como base visual.

## Decisao Tecnica Inicial

A abordagem escolhida inicialmente é um web app local em HTML, CSS e JavaScript.

Essa escolha favorece:

- uso local, sem depender de servidor externo;
- interface visual simples para preenchimento;
- facilidade para gerar uma página pronta para impressão;
- evolução gradual do projeto sem complexidade desnecessária.

## Objetivo Principal

Criar uma ferramenta que torne o preenchimento de orçamentos cirúrgicos mais rápido, padronizado e profissional, preservando a apresentação visual do papel timbrado.

# Auto Orcamento

Projeto local para automatizar a criacao de orcamentos medicos em papel timbrado.

## Contexto

Durante a consulta, o medico precisa montar um orcamento para pacientes com cirurgia programada. Hoje esse processo e feito a mao em uma folha timbrada pessoal, incluindo informacoes como:

- nome da paciente;
- cirurgia proposta;
- hospital;
- tempo previsto de hospital;
- valores de hospital, equipe e tecnologias;
- formas de pagamento;
- itens incluidos nos valores;
- orientacoes adicionais.

O objetivo do projeto e reduzir a escrita manual, padronizar o documento e acelerar a entrega do orcamento ao final da consulta.

## Ideia do Produto

A proposta inicial e criar um mini programa de uso local, mais rapido e direto do que editar um documento no Word. A aplicacao deve usar o papel timbrado como fundo e oferecer uma interface simples para preencher os campos variaveis do orcamento.

Tambem deve permitir selecionar modelos ou conjuntos de orientacoes por meio de opcoes como checkboxes, evitando reescrever textos repetitivos em cada consulta.

Ao final, o sistema deve gerar um documento pronto, padronizado e adequado para impressao, usando o papel timbrado como base visual.

## Decisao Tecnica Inicial

A abordagem escolhida inicialmente e um web app local em HTML, CSS e JavaScript.

Essa escolha favorece:

- uso local, sem depender de servidor externo;
- interface visual simples para preenchimento;
- facilidade para gerar uma pagina pronta para impressao;
- evolucao gradual do projeto sem complexidade desnecessaria.

## Objetivo Principal

Criar uma ferramenta que torne o preenchimento de orcamentos cirurgicos mais rapido, padronizado e profissional, preservando a apresentacao visual do papel timbrado.

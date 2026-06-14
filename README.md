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

## Dados Locais

Os históricos ficam em arquivos JSON dentro de `data/`:

```text
data/cirurgias.json
data/hospitais.json
data/pacientes.json
```

As tabelas hospitalares estruturadas ficam em:

```text
data/tabelas-hospitalares.json
```

Esses arquivos são usados apenas localmente pelo servidor Node.js.

## Hospitais Com Autofill

O botão verde ao lado do hospital preenche e reorganiza as entradas auxiliares.

Para Sapiranga, os pacotes são ordenados por valor e recebem multiplicadores progressivos. Se o tempo total dos pacotes for menor que o tempo previsto de hospital, o app adiciona uma entrada de hora excedente com multiplicador proporcional.

Para Regina, o app soma o `tempoSalaHoras` dos pacotes selecionados. Se faltar tempo em relação ao tempo previsto de hospital, adiciona `SALA CIRÚRGICA - MEIA HORA SUBSEQUENTE` com multiplicador em unidades de meia hora.

## Documentação Técnica

Detalhes de arquitetura, arquivos principais, endpoints locais e fluxo do launcher ficam em:

```text
ARCHITECTURE.md
```

Detalhes sobre a origem e manutenção das tabelas hospitalares ficam em:

```text
docs/tabelas-hospitalares.md
```

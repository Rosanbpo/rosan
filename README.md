# Dashboard financeiro

Painel financeiro em React + Vite + Recharts, com seletor de empresa e período.

## O que mostra

- **Saldo em caixa hoje** e projeção para 30 dias (saldo + pendentes do período)
- **Receitas, despesas e resultado** realizados no período (3, 6 ou 12 meses), com variação vs o período anterior
- **A receber / a pagar** em aberto, destacando o valor vencido
- **Entradas e saídas** por mês, **resultado mensal** e **despesas por categoria** (cada gráfico tem visão em tabela)
- **Saldo por conta bancária**
- **Vencimentos**: lançamentos em atraso e dos próximos 30 dias, filtráveis por tipo
- Tema claro/escuro e layout para celular

## Como rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera dist/
```

## Dados

Hoje o painel usa **dados de exemplo** (fictícios, gerados em `src/data/exemplo.ts`).
Para usar dados reais, implemente a interface `FonteDados` de `src/data/tipos.ts`
(listar empresas e carregar contas + lançamentos de uma empresa) e troque a fonte
exportada em `src/data/index.ts`. Todos os indicadores são calculados em
`src/lib/analise.ts` a partir desses lançamentos.

## Estrutura

```
src/
  App.tsx              layout, filtros e indicadores
  components/          Cartao, Indicador, Graficos
  data/                tipos, fonte de exemplo, fonte ativa
  lib/                 análises, datas, formatação (pt-BR)
```

# Rosan · Sistema de Gestão e Diagnóstico Financeiro

Plataforma multiempresa da Rosan. Transforma a planilha financeira de cada cliente em um dashboard executivo e **consultivo**: além dos números, mostra o que eles significam, o que piorou, o que melhorou e o que merece atenção.

```
Planilha → Importação → Validação → Tratamento → Cálculos → Indicadores → Dashboard → Diagnóstico → Insights
```

## Como rodar

Requisitos: **Node.js 22.13+**.

```bash
npm install
npm run demo        # opcional: cria 2 clientes com dados demonstrativos
npm run dev         # API em :3001 + interface em http://localhost:5173
```

No primeiro uso, o terminal mostra o e-mail e a **senha provisória do administrador** (`admin@rosan.com.br`). A troca da senha é pedida no primeiro acesso. Para definir a senha você mesmo, use as variáveis `ROSAN_ADMIN_EMAIL` e `ROSAN_ADMIN_SENHA` antes de iniciar.

Os dados demonstrativos (`npm run demo`) criam:

| Cliente | Login | Senha |
|---|---|---|
| Clínica Aurora (com centros de custo) | cliente.aurora@demo.rosan.com.br | Demo2026rosan |
| Comércio Horizonte (sem centro de custo, em dificuldade) | cliente.horizonte@demo.rosan.com.br | Demo2026rosan |

Os dois clientes aparecem com o selo **Dados demonstrativos** e **nunca recebem importações reais**, para que dados fictícios e reais não se misturem.

### Colocar no ar (Render)

O repositório já tem o `render.yaml`, que cria o serviço com HTTPS e um disco persistente para o banco.

1. Crie uma conta em [render.com](https://render.com) entrando com o GitHub e autorize o acesso ao repositório `rosan`.
2. Clique em **New → Blueprint**, escolha o repositório e a branch com o sistema.
3. Preencha as variáveis pedidas:
   - `ROSAN_ADMIN_EMAIL`: seu e-mail de administrador.
   - `ROSAN_ADMIN_SENHA`: uma senha provisória (mínimo 8 caracteres, com letras e números). A troca é pedida no primeiro acesso.
4. Confirme com **Apply**. O primeiro deploy leva de 3 a 5 minutos. O endereço fica como `https://rosan-gestao-financeira.onrender.com`.
5. Para ver os clientes demonstrativos, mude `ROSAN_DEMO` para `1` em *Environment*. Eles são criados uma única vez.

Custo: plano Starter (cerca de US$ 7/mês) + disco de 1 GB (cerca de US$ 0,25/mês). O plano gratuito não tem disco, e os dados se perdem a cada reinício. O Render faz snapshots diários do disco.

**Domínio próprio** (ex.: `painel.rosan.com.br`): em *Settings → Custom Domains*, adicione o domínio e crie no seu provedor de DNS o registro CNAME indicado. O certificado HTTPS é emitido automaticamente.

Toda alteração enviada para a branch configurada é publicada automaticamente.

### Outros provedores

O `Dockerfile` funciona em Railway, Fly.io ou em uma VPS. Monte um volume persistente em `/data` (onde fica o banco) e sirva por HTTPS.

| Variável | Uso |
|---|---|
| `PORT` | Porta HTTP (padrão 3001) |
| `ROSAN_DB` | Caminho do banco (padrão `dados/rosan.db`) |
| `ROSAN_ADMIN_EMAIL` / `ROSAN_ADMIN_SENHA` | Primeiro administrador (usado só se não houver nenhum) |
| `ROSAN_DEMO` | `1` cria os clientes demonstrativos uma vez |
| `NODE_ENV=production` | Ativa cookies `Secure` (exige HTTPS) |

## Perfis de acesso

**Administrador Rosan**: painel geral da carteira, cadastro e edição de clientes, criação de acessos, importação de planilhas, histórico, indicadores de todos os clientes, centros de custo, plano de contas, premissas e acesso ao dashboard de qualquer cliente.

**Cliente**: entra com login e senha e é levado ao dashboard da própria empresa (`/cliente/nome-da-empresa`). O link sozinho não dá acesso a nada.

## Segurança e isolamento entre clientes

A separação existe **no servidor e no acesso a dados**, nunca só na tela:

- Sessão em cookie `httpOnly` + `SameSite=Strict` (o token não fica acessível ao JavaScript). O token é guardado com hash no banco e expira em 12 h.
- Senhas com `scrypt` e sal. Login com limite de tentativas e mensagem genérica.
- Toda rota de cliente passa por `exigirAcessoCliente`. O servidor resolve a empresa pelo endereço e confere no banco se o usuário logado está vinculado a ela (`client_users`). O administrador acessa todas. Se o usuário não estiver vinculado, a resposta é 404, sem revelar que a empresa existe.
- O `client_id` **nunca** vem do navegador: parâmetros como `?clienteId=` são ignorados nas rotas de cliente. Todas as consultas financeiras (`server/repositorio.ts`) recebem o `client_id` já autorizado e filtram por ele.
- Rotas administrativas exigem perfil admin. As alterações exigem o cabeçalho anti-CSRF `X-Rosan`.
- Desativar um cliente ou usuário derruba as sessões abertas na hora.
- Cabeçalhos de segurança (CSP, frame-ancestors etc.) via Helmet.

Os testes em `tests/seguranca.test.ts` criam os clientes A e B e comprovam os pontos abaixo:
- A só acessa A, e B só acessa B.
- A não acessa a URL de B nem consegue manipular parâmetros para chegar a B.
- O cliente não acessa nenhuma rota administrativa.
- O administrador acessa ambos.

> **Sobre Supabase:** a especificação sugeria Supabase com RLS *se* fosse usado. Esta versão roda de forma autônoma (Node + SQLite) para funcionar e ser testada sem serviços externos. O isolamento é garantido no backend. Para migrar para PostgreSQL/Supabase, as tabelas já seguem o modelo `client_id` em todos os registros e as políticas RLS podem espelhar a regra de `exigirAcessoCliente`.

## Planilha padrão Rosan

Aba **Base_Financeira**, com as colunas:

`Data_Competencia · Data_Pagamento_Recebimento · Mes_Referencia · Tipo · Categoria · Subcategoria · Natureza · Centro_Custo · Descricao · Conta · Forma_Pagamento · Valor · Observacao`

O modelo com instruções, listas de valores e o plano de contas padrão pode ser baixado em **Importar Dados → Baixar modelo da planilha**.

- **Tipo**: Receita, Despesa ou Transferência Interna. Transferências não entram no resultado.
- **Natureza**: Fixa ou Variável. É necessária nas despesas para o ponto de equilíbrio.
- **Centro_Custo**: opcional. Quando existe, habilita o módulo de Centro de Custos.
- Datas em `dd/mm/aaaa`, mês em `mm/aaaa` e valores positivos (`1.234,56` ou número).

### Importação

1. Selecionar o cliente
2. Selecionar o arquivo
3. Leitura e validação
4. Prévia
5. Erros por linha e campo (ex.: *“A planilha possui 12 linhas que precisam ser corrigidas antes da importação.”*)
6. Confirmação
7. Processamento
8. Dashboard atualizado

Nada é gravado antes da confirmação. Regras contra duplicidade:
- O **mesmo arquivo** não é importado duas vezes.
- Se o **período já existe**, o sistema pergunta se deve **substituir** a importação anterior (corrige e mantém o histórico como "Substituído") ou **adicionar** novos dados (lançamentos idênticos são ignorados).
- Duplicidades dentro do arquivo geram aviso.

Centros de custo e categorias novos são cadastrados automaticamente no cliente.

## Dashboard do cliente

1. **Visão Geral**: faturamento, despesas, resultado, margem e ponto de equilíbrio, cada um com explicação. Inclui a leitura do período, as prioridades e onde está o dinheiro.
2. **Resultado Financeiro**: evolução de até 12 meses (gráfico + tabela), sinais de tendência e interpretação automática.
3. **Despesas**: as 5 maiores despesas com o impacto de cada uma, e a análise por categoria e subcategoria comparada ao período anterior.
4. **Centro de Custos**: aparece só quando há lançamentos classificados. Mostra o total e o % por centro, a variação, o peso sobre o faturamento, as maiores despesas e a evolução de cada centro, e as despesas ainda não classificadas.
5. **Ponto de Equilíbrio**: margem de contribuição, MC %, PE, distância e situação acima/abaixo. Sem dados suficientes, explica o motivo e **não estima**.
6. **Diagnóstico Financeiro**: cada ponto segue a cadeia *o que aconteceu → comparação → por que importa → leitura Rosan → recomendação*.
7. **Insights Estratégicos**: pontos positivos, pontos de atenção, oportunidades e até 3 prioridades.
8. **Histórico**: meses importados, data, arquivo, lançamentos e status.

Filtros de período: mês, trimestre, semestre, ano ou personalizado. Comparações: mês/período anterior, mesmo período do ano anterior ou acumulado do ano.

**Regra de ouro:** nenhum número é inventado. Sem histórico, o sistema diz que não há base de comparação. Sem classificação fixa/variável suficiente, não calcula o ponto de equilíbrio. Sem centro de custo, mostra apenas uma mensagem discreta.

As premissas do diagnóstico (variação relevante, queda de margem, concentração, folga mínima sobre o PE, margem de referência etc.) podem ser ajustadas por cliente em **Clientes → Configurar → Premissas**.

## Estrutura

```
shared/            código usado pelo servidor e pela interface
  analise.ts       motor de análise (KPIs, comparações, PE, diagnóstico, insights, prioridades)
  planilha.ts      definição e validação da planilha padrão
  periodos.ts      períodos e comparações
server/
  app.ts           rotas da API e autorização
  auth.ts          sessões, senhas, middlewares de acesso
  db.ts            esquema do banco e plano de contas padrão
  repositorio.ts   consultas sempre filtradas por client_id
  importacao.ts    leitura do Excel, prévia e confirmação
  modelo.ts        geração do modelo de planilha
  demo.ts          dados demonstrativos
web/src/           interface React (layouts, páginas do cliente e do admin)
tests/             segurança/isolamento, importação, validação e cálculos
```

## Testes

```bash
npm test          # 54 testes: segurança, isolamento, importação, validação e cálculos
npm run typecheck
```

## Próximas etapas previstas

A arquitetura já separa o **motor de análise** (função pura em `shared/analise.ts`) da interface. Por isso, o mesmo resultado pode alimentar exportação em PDF/Excel, relatório executivo mensal, envio automático por e-mail, comentários da Rosan, histórico de diagnósticos e metas, sem refazer os cálculos.

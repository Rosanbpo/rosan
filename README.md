# Central BPO

Aplicação web para gestão operacional de uma empresa de **BPO Financeiro** com vários clientes e operadores: centraliza tarefas, padroniza rotinas recorrentes, distribui responsabilidades e evidencia atrasos e pendências antes que comprometam as entregas.

> “Central BPO” é um nome provisório. Altere em `NEXT_PUBLIC_APP_NAME` (ou em `src/lib/app-config.ts`).
>
> O sistema **gerencia a execução** das atividades. Ele **não** executa pagamentos, não movimenta contas bancárias e não envia mensagens externas.

## Sumário

- [Stack e arquitetura](#stack-e-arquitetura)
- [O que foi implementado](#o-que-foi-implementado)
- [Publicar online (Vercel + Neon, sem terminal)](#publicar-online-vercel--neon-sem-terminal)
- [Instalação e execução](#instalação-e-execução)
- [Banco, migrações e dados demonstrativos](#banco-migrações-e-dados-demonstrativos)
- [Geração recorrente (agendador)](#geração-recorrente-agendador)
- [Testes](#testes)
- [Produção](#produção)
- [Premissas e decisões](#premissas-e-decisões)
- [Limitações conhecidas e dependências externas](#limitações-conhecidas-e-dependências-externas)

## Stack e arquitetura

- **Next.js 15** (App Router, Server Components e Server Actions) com **TypeScript**
- **Tailwind CSS 4**, componentes acessíveis (rótulos, foco visível, navegação por teclado, `aria-*`)
- **PostgreSQL + Prisma 6**
- **Auth.js (NextAuth v5)** com credenciais (e-mail/senha, bcrypt) e sessão JWT
- **Vitest** para testes unitários e de integração (contra PostgreSQL real)

```
src/
  domain/          Regras puras, sem banco: datas/fuso, recorrência, feriados,
                   transições de status, atraso, matriz de permissões
  server/
    services/      Casos de uso com escopo por empresa e por cliente
                   (clientes, tarefas, pendências, modelos, recorrências,
                   gerador, painel, usuários, feriados, auditoria)
    context.ts     Usuário autenticado montado a partir do banco a cada requisição
    action-utils.ts  Execução segura de Server Actions (erros → mensagens)
  app/
    (app)/         Telas autenticadas
    actions/       Server Actions (apenas autenticam e delegam aos serviços)
    api/cron/      Endpoint protegido para o agendador externo
  components/      UI (formulários, Kanban, tabelas, diálogos)
prisma/            schema, migrações e seed de desenvolvimento
scripts/           agendador (execução única e worker), criação do 1º admin
tests/             unit/ e integration/
```

**Segurança no servidor:** toda leitura e escrita passa pelos serviços, que sempre filtram por `organizationId` do usuário e, para gestores e operadores, pelos clientes aos quais estão vinculados (`ClientMember`). O papel e o vínculo são relidos do banco a cada requisição (desativar um usuário ou mudar o papel vale imediatamente). Recursos de outra empresa ou sem vínculo respondem como “não encontrado”.

## O que foi implementado

### Perfis e permissões

| Ação | Administrador | Gestor | Operador |
|---|---|---|---|
| Usuários, feriados, dados da empresa, executar gerador | ✔ | | |
| Cadastrar/editar/arquivar clientes e vínculos | ✔ | | |
| Criar/editar/arquivar modelos de rotina | ✔ | consulta | |
| Criar/editar/pausar recorrências | ✔ (todos os clientes) | ✔ (clientes vinculados) | |
| Painel do gestor | ✔ | ✔ (clientes vinculados) | |
| Ver clientes e tarefas | todos | vinculados | vinculados |
| Criar tarefas | ✔ | ✔ | ✔ (apenas para si) |
| Atribuir responsável/revisor, alterar prazo e prioridade | ✔ | ✔ | |
| Movimentar tarefa | ✔ | ✔ | se for o responsável |
| Revisar (aprovar/devolver) | ✔ | ✔ | se for o revisor |
| Cancelar e reabrir | ✔ | ✔ | |

Quem executou a tarefa não pode aprovar a própria entrega. Não há portal do cliente nesta versão.

### Clientes
Razão social, nome fantasia, CNPJ opcional (dígitos verificadores validados), contato principal e canais, status (implantação, ativo, pausado, encerrado), operador responsável, gestor, demais usuários com acesso, serviços contratados, data de início, observações operacionais e rotinas vinculadas. A página do cliente reúne indicadores (abertas, atrasadas, aguardando, em revisão, concluídas e % no prazo em 30 dias), tarefas abertas, pendências, concluídas recentes, rotinas e histórico. Arquivar preserva o histórico e pausa as recorrências.

### Tarefas
Título, descrição, cliente obrigatório, categoria (11 categorias iniciais), responsável, revisor opcional, prioridade (baixa, normal, alta, crítica), competência, início e prazo com horário (fuso America/Sao_Paulo), estimativa, checklist com itens obrigatórios, comentários, evidências por link, exigência de evidência, origem (manual ou rotina) e trilha de auditoria (criação, alterações campo a campo, transições, checklist, evidências).

**Status:** A fazer, Em andamento, Aguardando cliente, Aguardando terceiro, Em revisão, Concluída, Cancelada. **“Atrasada” é calculada** (prazo vencido e status diferente de concluída/cancelada), nunca um status manual.

**Regras de transição** (`src/domain/task-rules.ts`), aplicadas igualmente em botões, diálogos e Kanban:
- Aguardar cliente/terceiro exige motivo (informação necessária), data de próximo acompanhamento e, opcionalmente, quem precisa responder → cria uma **Pendência**. Retomar resolve a pendência.
- Com revisor, a tarefa precisa ir para **Em revisão**; concluir diretamente é bloqueado.
- Devolver ao operador exige justificativa (registrada em comentário e auditoria; aparece em destaque para o operador).
- Concluir/enviar para revisão/aprovar exige itens obrigatórios do checklist marcados e evidência quando exigida.
- Registra quem executou, quem revisou e quem concluiu.
- Reabrir (concluída ou cancelada) e cancelar exigem justificativa e perfil de gestor/administrador; o histórico é preservado.
- Atualização condicional evita sobrescrever alterações concorrentes.

### Rotinas recorrentes
Modelos reutilizáveis (título, descrição, categoria, prioridade, estimativa, checklist, exigência de evidência, regra de competência e regra de prazo padrão) e **recorrências por cliente** com:
- Frequência: diária em dias úteis; semanal em dias selecionados; quinzenal em duas datas do mês; mensal em dia fixo; mensal no n-ésimo dia útil.
- Antecedência de geração, início da execução (dias antes do prazo), horário do prazo, responsável e revisor padrão, data de início e término.
- Fim de semana/feriado: antecipar ou postergar. Datas inexistentes (ex.: 31 em fevereiro) usam o último dia do mês **antes** de aplicar a regra de dia útil.
- Calendário de feriados configurável por empresa.
- Consulta da próxima ocorrência e da data em que será gerada.

Regras garantidas (com testes):
- **Idempotência:** chave única `(recurrenceId, occurrenceKey)` no banco (data nominal da ocorrência) + verificação de prazo repetido + trava com expiração para execuções simultâneas.
- Alterar o modelo afeta só as próximas ocorrências: cada tarefa gerada guarda cópia de título, checklist, prioridade etc.
- Alterar a regra da recorrência vale a partir de hoje (não gera retroativamente com a nova regra).
- Tarefas vencidas continuam visíveis após a geração da próxima ocorrência.
- Pausar interrompe novas gerações e preserva as tarefas existentes; reativar não gera o período pausado.
- Se o agendador ficar parado, a próxima execução recupera ocorrências de até 90 dias para trás (desde a criação/reativação).

Modelos iniciais (no seed, editáveis): Conciliação bancária diária, Preparação da agenda de pagamentos, Acompanhamento de recebimentos, Cobrança de inadimplentes, Atualização do fluxo de caixa, Solicitação de documentos, Fechamento financeiro mensal, Preparação de relatório gerencial e Reunião mensal de resultados.

### Telas
- **Painel do gestor:** vencem hoje, atrasadas, aguardando cliente (e terceiros), em revisão, próximos 7 dias, carga por operador (abertas, atrasadas, horas estimadas), top 5 clientes com atrasos e % de entregas no prazo. Filtros por período, cliente, responsável, categoria e prioridade. O período e as fórmulas aparecem na tela.
  - *Entregas no prazo* = tarefas concluídas no período com `concluída em ≤ prazo` ÷ tarefas concluídas no período.
- **Minha operação:** atrasadas, de hoje, devolvidas pelo revisor, para eu revisar, pendências a acompanhar e próximas 15 dias, com ações rápidas (iniciar, enviar, concluir, aguardar…).
- **Tarefas:** lista paginada, **Kanban** (arrastar e soltar ou “Mover para…” por teclado, com as mesmas validações) e **calendário** mensal; pesquisa, filtros combináveis e ordenação por prazo, prioridade ou criação.
- **Pendências:** cliente, tarefa, informação necessária, quem responde, data da solicitação, próximo acompanhamento (destacado quando vence) e tempo em espera; reagendamento do acompanhamento.
- **Clientes**, **Modelos e recorrências**, **Configurações** (empresa, usuários, feriados, histórico do agendador e execução manual) e **Minha conta** (troca de senha).

Interface em português do Brasil, responsiva (menu lateral vira gaveta no celular), estados vazios com orientação, feedback de carregamento/sucesso/erro, confirmação em ações destrutivas e cores consistentes por status.

## Publicar online (Vercel + Neon, sem terminal)

1. Crie uma conta gratuita em https://vercel.com usando **“Continue with GitHub”**.
2. Clique em **Add New… → Project**, escolha o repositório e clique em **Import**. Ainda **não** clique em Deploy.
3. Em **Environment Variables**, cadastre:
   - `AUTH_SECRET`: uma sequência aleatória longa (32+ caracteres);
   - `CRON_SECRET`: outra sequência aleatória longa, diferente da anterior.
4. Clique em **Deploy**. A primeira tentativa falha por falta de banco; isso é esperado.
5. No projeto, abra a aba **Storage → Create Database → Neon (Postgres)**, aceite os padrões e clique em **Connect**. A Vercel cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
6. Em **Deployments**, abra o menu “⋯” do último deploy e clique em **Redeploy**. O build aplica as migrações sozinho (`scripts/vercel-build.mjs`).
7. Abra o endereço do site. Na primeira visita aparece a tela **Primeiro acesso**: informe o nome da empresa, seu nome, e-mail e senha. São criados o administrador, os 9 modelos de rotina e os feriados nacionais do ano atual e do próximo. Essa tela só funciona enquanto não houver nenhum usuário, então faça isso logo após publicar.

A geração automática de tarefas recorrentes já vem configurada no `vercel.json` para rodar **uma vez por dia às 06:00 (Brasília)**, que é o limite do plano gratuito (a Vercel pode executar em qualquer momento entre 06:00 e 06:59). Com antecedência 0, uma rotina cujo prazo seja antes das 07:00 seria criada já vencida; nesses casos use antecedência de 1 dia. No plano pago, troque a programação para `0 * * * *` (de hora em hora).

## Instalação e execução

Requisitos: **Node.js 20+** (testado com 22) e **PostgreSQL 14+** (testado com 16).

```bash
npm install
```

```bash
cp .env.example .env
```

Edite `.env` com a URL do banco e gere os segredos:

```bash
openssl rand -base64 32
```

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Banco principal |
| `TEST_DATABASE_URL` | Banco **exclusivo** dos testes de integração (é apagado a cada teste) |
| `AUTH_SECRET` | Assinatura das sessões (obrigatório) |
| `AUTH_TRUST_HOST` | `true` quando atrás de proxy/host próprio |
| `CRON_SECRET` | Token da rota do agendador (mín. 16 caracteres) |
| `APP_TIMEZONE` | Fuso das rotinas (padrão `America/Sao_Paulo`) |
| `NEXT_PUBLIC_APP_NAME` | Nome exibido |
| `SCHEDULER_INTERVAL_MINUTES` | Intervalo do worker opcional (padrão 60) |

Desenvolvimento:

```bash
npm run dev
```

Acesse http://localhost:3000.

## Banco, migrações e dados demonstrativos

Criar o banco e aplicar as migrações (desenvolvimento):

```bash
npm run db:migrate
```

Carregar os dados demonstrativos (empresa fictícia, 1 admin, 1 gestor, 3 operadores, 5 clientes, tarefas em vários status — atrasadas, aguardando cliente/terceiro, em revisão, devolvida, concluídas no prazo e com atraso — e recorrências configuradas):

```bash
npm run db:seed
```

Usuários de demonstração (senha `demo1234`): `admin@demo.centralbpo.test`, `gestor@demo.centralbpo.test`, `operador1@…`, `operador2@…`, `operador3@…`.

Recriar tudo do zero:

```bash
npx prisma migrate reset
```

Proteções: o seed **se recusa a rodar com `NODE_ENV=production`**, e os usuários criados por ele são marcados como demonstrativos — **o login deles é bloqueado em produção**. (Para uma homologação deliberada é possível liberar com `ALLOW_DEMO_LOGIN=true`; nunca use em produção real.)

## Geração recorrente (agendador)

A geração roda **no servidor**, sem depender de alguém abrir a aplicação. Toda execução é idempotente, então pode ser agendada com folga (recomendado: **a cada hora**). Escolha **uma** das opções:

**1. Cron do sistema (VPS/servidor próprio)**

```bash
crontab -e
```

```
5 * * * * cd /caminho/central-bpo && /usr/bin/npm run scheduler:run >> /var/log/central-bpo-scheduler.log 2>&1
```

**2. Worker de longa duração (pm2, systemd, Docker)**

```bash
npm run scheduler:worker
```

**3. Agendador HTTP externo (Vercel Cron, GitHub Actions, cron + curl)** — a rota `GET/POST /api/cron/gerar-tarefas` exige `Authorization: Bearer <CRON_SECRET>`:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/gerar-tarefas
```

Na Vercel, o `vercel.json` já declara a execução diária às 06:00 de Brasília (09:00 UTC, compatível com o plano gratuito) e a plataforma envia o `CRON_SECRET` automaticamente. Em planos pagos, use `0 * * * *` para rodar de hora em hora.

Cada execução fica registrada (tabela `SchedulerRun`) e é exibida em **Configurações → Empresa e agendador**, onde o administrador também pode executar manualmente. Ao criar ou reativar uma recorrência, as ocorrências já dentro da antecedência são geradas na hora.

## Testes

```bash
npm test
```
Testes unitários (domínio): recorrências, fuso, fins de semana, feriados, datas inexistentes, n-ésimo dia útil, janela de geração, transições de status, atraso e matriz de permissões.

```bash
npm run test:integration
```
Testes de integração contra PostgreSQL real (requer `TEST_DATABASE_URL` apontando para um banco **dedicado**; as migrações são aplicadas automaticamente). Cobrem os critérios de aceite: cadastro de cliente com vínculos; tarefa com checklist; recorrência sem duplicação (inclusive execuções simultâneas); pendência e acompanhamento; revisão, devolução, conclusão com exigências e reabertura com histórico; isolamento entre empresas e entre clientes; prazos, fuso, fins de semana, feriados e datas inexistentes; alteração de modelo e pausa.

```bash
npm run test:all
```

Verificações adicionais:

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run build
```

O workflow `.github/workflows/ci.yml` executa lint, typecheck, todos os testes (com PostgreSQL) e o build.

## Produção

```bash
npm ci
```

```bash
npm run db:deploy
```

```bash
npm run build
```

Na primeira visita ao site, a tela **Primeiro acesso** cria a empresa e o administrador. Alternativamente, pelo terminal (a senha vem de variável de ambiente para não ficar no histórico):

```bash
ADMIN_PASSWORD='uma-senha-forte' npm run admin:create -- --org "Minha BPO" --name "Nome do Admin" --email admin@minhabpo.com.br
```

```bash
npm start
```

Configure também o agendador (seção anterior). Use HTTPS, segredos fortes e backups do banco.

## Premissas e decisões

- **Uma empresa ativa por sessão:** o modelo suporta usuário em várias empresas (`Membership`), mas o login entra na primeira empresa ativa. Não há seletor de empresa nesta versão.
- **Modelo de rotina = uma tarefa** (com checklist). Rotinas com várias tarefas são modeladas como vários modelos.
- O **operador responsável** do cliente é o responsável padrão das tarefas recorrentes sem responsável definido.
- **Gestores** veem apenas clientes em que são gestor ou estão vinculados; **administradores** veem todos.
- Tarefas não são excluídas: o caminho é **cancelar** (com justificativa) para preservar o histórico. Clientes e modelos são **arquivados**.
- Tarefas “aguardando cliente/terceiro” com prazo vencido **continuam contando como atrasadas** (a regra pede exclusão apenas de concluídas e canceladas).
- Diária em dias úteis **não** desloca ocorrências: dias não úteis simplesmente não têm tarefa.
- Se duas datas nominais caírem no mesmo dia útil após o ajuste, é gerada uma única tarefa.
- Horários são exibidos e interpretados no fuso `APP_TIMEZONE` (padrão America/Sao_Paulo), independentemente do fuso do servidor ou do navegador.

## Limitações conhecidas e dependências externas

- **Feriados:** não há integração com fonte oficial. O sistema calcula e *sugere* os feriados nacionais (datas fixas da legislação federal e Sexta-feira Santa); estaduais, municipais e pontos facultativos precisam ser cadastrados/revisados pelo administrador. Mudanças afetam apenas gerações futuras.
- **Agendador:** depende de infraestrutura externa (cron, worker ou chamada HTTP). Sem ele configurado, as recorrências só geram tarefas ao serem criadas/reativadas ou pela execução manual em Configurações.
- **Autenticação:** apenas e-mail e senha. Não há recuperação de senha por e-mail (o administrador redefine), 2FA, SSO nem limitação de tentativas de login — recomenda-se proteção no proxy/WAF.
- **Notificações:** nenhuma mensagem é enviada (e-mail/WhatsApp); pendências e atrasos são exibidos na aplicação.
- **Evidências** são apenas links; não há upload de arquivos.
- **Sem portal do cliente** e sem integrações bancárias/ERP (fora do escopo desta versão).
- O Kanban mostra até 300 tarefas abertas e as concluídas/canceladas dos últimos 14 dias; o calendário, até 500 tarefas no mês (use filtros).
- Sem relatórios exportáveis (CSV/PDF) nesta versão.

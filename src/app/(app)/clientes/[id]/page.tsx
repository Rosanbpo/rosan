import { billingDaysLabel, monthlyInstallments } from "@/domain/installments";
import Link from "next/link";
import {
  Briefcase,
  CalendarCheck,
  Hourglass,
  FileSignature,
  FolderKanban,
  History,
  Landmark,
  Mail,
  Pencil,
  Phone,
  Plus,
  Repeat,
  UserRound,
  Wallet,
  Workflow,
  BookOpenCheck,
  KeyRound,
  StickyNote,
  NotebookPen,
  LayoutDashboard,
} from "lucide-react";
import { dbDateToLocalDate } from "@/domain/dates";
import {
  PENDING_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/domain/enums";
import { CONTRACT_STATUS_LABEL } from "@/domain/contract";
import { ClientVaultPanel } from "@/components/client-vault-panel";
import { vaultConfigured } from "@/server/crypto";
import { listVault, vaultAccessLog } from "@/server/services/vault";
import { ClientNotesPanel } from "@/components/client-notes-panel";
import { ClientProceduresPanel } from "@/components/client-procedures-panel";
import { BankAccountsPanel } from "@/components/bank-accounts-panel";
import { EsteiraIcon } from "@/components/esteira-icon";
import { esteiraCounts } from "@/domain/esteiras";
import { STAGE_LABEL } from "@/domain/enums";
import { TONE } from "@/lib/ui";
import { listBankAccounts } from "@/server/services/bank-accounts";
import { esteiraProgress, listEsteirasFor } from "@/server/services/esteiras";
import { PROPOSAL_STATUS_LABEL, type ProposalStatus } from "@/domain/proposal";
import { can } from "@/domain/permissions";
import { Card, EmptyState, Stat } from "@/components/ui/layout";
import { ClientRoutineAgenda } from "@/components/client-routine-agenda";
import { ClientRoutineForm } from "@/components/client-routine-form";
import { projectOptions } from "@/server/services/projects";
import { listTemplates } from "@/server/services/templates";
import { assignableUsers } from "@/server/services/tasks";
import { DocumentChecklist } from "@/components/document-checklist";
import { isCompetence, previousCompetence } from "@/domain/documents";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { getDocumentChecklist } from "@/server/services/documents";
import { ClientForm } from "@/components/client-form";
import { updateClientAction } from "@/app/actions/clients";
import { moneyInput } from "@/lib/format";
import { ClientStatusBadge } from "@/components/ui/badges";
import { TaskTable } from "@/components/task-table";
import { ClientDashboardTop } from "@/components/client-dashboard-top";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { volumeOverview } from "@/server/services/diagnosis";
import { CopyButton } from "@/components/copy-button";
import { saveOnboardingAction, createOnboardingTasksAction } from "@/app/actions/onboarding";
import { getOnboarding } from "@/server/services/onboarding";
import { onboardingSteps } from "@/server/services/checklists";
import { getDiagnosis } from "@/server/services/diagnosis";
import { headers } from "next/headers";
import { prisma } from "@/server/db";
import { CHURN_REASONS } from "@/domain/renewal";
import { closeClientAction } from "@/app/actions/gestao";
import { NpsCard } from "@/components/nps-card";
import { clientNps } from "@/server/services/nps";
import { ClosingPanel } from "@/components/closing-panel";
import { ClientLogoBox } from "@/components/client-logo-box";
import { getClosing, closingHistory, currentCompetence } from "@/server/services/closings";
import { isCompetenceMonth } from "@/domain/closing";
import { getClientLogo } from "@/server/services/client-logo";
import { ConfirmAction } from "@/components/confirm-action";
import { archiveClientAction } from "@/app/actions/clients";
import {
  fmtCnpj,
  fmtDateTime,
  fmtHours,
  fmtLocalDate,
  fmtMoney,
  fmtPercent,
  waitingTime,
} from "@/lib/format";
import { requireActor } from "@/server/context";
import { getRunningTimer } from "@/server/services/timer";
import {
  clientHistory,
  clientIndicators,
  clientPanelExtras,
  getClient,
} from "@/server/services/clients";
import { listClientNotes } from "@/server/services/client-notes";
import { listClientProcedures, procedureOptions } from "@/server/services/procedures";
import { listTasks } from "@/server/services/tasks";
import { listPendings } from "@/server/services/pendings";
import { clientMonthSummary } from "@/server/services/portfolio";
import { orNotFound } from "@/server/page-utils";

const TABS: Array<{
  key: string;
  label: string;
  icon: typeof Mail;
  show: (
    actor: Parameters<typeof can>[0],
    extras: { contracts: unknown[]; proposals: unknown[] },
    finance: unknown,
  ) => boolean;
}> = [
  { key: "resumo", label: "Resumo", icon: LayoutDashboard, show: () => true },
  { key: "dados", label: "Dados", icon: UserRound, show: () => true },
  { key: "cofre", label: "Cofre", icon: KeyRound, show: () => true },
  { key: "onboarding", label: "Onboarding", icon: Workflow, show: () => true },
  { key: "rotinas", label: "Rotina", icon: Repeat, show: () => true },
  { key: "pops", label: "POPs e particularidades", icon: BookOpenCheck, show: () => true },
  { key: "pendencias", label: "Pendências", icon: Hourglass, show: () => true },
  { key: "atas", label: "Atas", icon: NotebookPen, show: () => true },
  { key: "fechamentos", label: "Fechamentos", icon: FolderKanban, show: () => true },
  { key: "historico", label: "Histórico", icon: History, show: () => true },
];

const TAB_TONE: Record<string, string> = {
  resumo: "text-blue-600",
  dados: "text-sky-500",
  financeiro: "text-emerald-500",
  bancos: "text-indigo-500",
  cofre: "text-amber-500",
  onboarding: "text-rose-400",
  rotinas: "text-blue-500",
  pops: "text-violet-500",
  pendencias: "text-orange-500",
  atas: "text-teal-500",
  fechamentos: "text-fuchsia-500",
  historico: "text-slate-400",
};

const LEGACY_TABS: Record<string, string> = {
  cadastro: "dados",
  financeiro: "dados",
  bancos: "dados",
  projetos: "fechamentos",
  jornada: "onboarding",
  documentos: "pendencias",
  particularidades: "pops",
};

export const metadata = { title: "Painel do cliente" };

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const sp = await searchParams;
  const requested = LEGACY_TABS[sp.aba ?? ""] ?? sp.aba;
  const aba = TABS.some((t) => t.key === requested) ? (requested as string) : "resumo";
  const competence = isCompetence(sp.competencia)
    ? sp.competencia
    : previousCompetence(instantToLocalDate(new Date(), APP_TIMEZONE));
  const client = await orNotFound(getClient(actor, id));
  const [
    running,
    extras,
    indicators,
    openTasks,
    recentDone,
    pendings,
    history,
    documents,
    banks,
    vaultItems,
    vaultLog,
    clientPops,
    standardPops,
    clientNotes,
    journey,
    ESTEIRAS,
  ] = await Promise.all([
    getRunningTimer(actor),
    clientPanelExtras(actor, id),
    clientIndicators(actor, id),
    listTasks(actor, { clientId: id, open: true, pageSize: aba === "pendencias" ? 50 : 15 }),
    listTasks(actor, {
      clientId: id,
      status: ["CONCLUIDA"],
      sort: "completed",
      pageSize: 5,
    }),
    listPendings(actor, { clientId: id }),
    clientHistory(actor, id),
    getDocumentChecklist(actor, id, competence),
    aba === "dados" ? listBankAccounts(actor, id) : Promise.resolve([]),
    aba === "cofre" ? listVault(actor, id) : Promise.resolve([]),
    aba === "cofre" ? vaultAccessLog(actor, id) : Promise.resolve([]),
    aba === "pops" ? listClientProcedures(actor, id) : Promise.resolve([]),
    aba === "pops" && can(actor, "procedures.manage") ? procedureOptions(actor) : Promise.resolve([]),
    aba === "pops" || aba === "atas" ? listClientNotes(actor, id, aba === "atas" ? "ATA" : "PARTICULARIDADE") : Promise.resolve([]),
    aba === "onboarding" ? esteiraProgress(actor, { clientId: id }) : Promise.resolve({}),
    aba === "onboarding" ? listEsteirasFor(actor.organizationId) : Promise.resolve([]),
  ]);
  const routineForm =
    aba === "rotinas" && can(actor, "recurrences.manage")
      ? {
          templates: (await listTemplates(actor)).map((t) => ({
            id: t.id,
            name: t.name,
          })),
          people: (await assignableUsers(actor, id)).map((u) => ({
            id: u.id,
            name: u.name,
          })),
          projects: (await projectOptions(actor, id)).map((p) => ({
            id: p.id,
            name: p.name,
          })),
        }
      : null;
  const manage = can(actor, "clients.manage");
  const formPeople = aba === "dados" && manage ? await assignableUsers(actor) : null;
  const finance = can(actor, "finance.view")
    ? await clientMonthSummary(actor, id)
    : null;
  const now = new Date();
  const showFinance = !!finance || can(actor, "contracts.manage") || extras.contracts.length > 0 || extras.proposals.length > 0;
  const closingMonth = isCompetenceMonth(sp.mes) ? sp.mes : currentCompetence();
  const closingSummary = aba === "resumo" ? await getClosing(actor, id, currentCompetence()) : null;
  const closingData = aba === "fechamentos" ? await getClosing(actor, id, closingMonth) : null;
  const closingHist = aba === "fechamentos" ? await closingHistory(actor, id) : [];
  const vol = aba === "dados" ? await volumeOverview(actor, id) : null;
  const onb = aba === "onboarding" ? await getOnboarding(actor, id) : null;
  const obSteps = aba === "onboarding" ? await onboardingSteps(actor.organizationId) : [];
  const onbDiag = aba === "onboarding" ? await getDiagnosis(actor, id) : null;
  const hdr = aba === "onboarding" ? await headers() : null;
  const origin = hdr ? `${hdr.get("x-forwarded-proto") ?? "https"}://${hdr.get("x-forwarded-host") ?? hdr.get("host")}` : "";
  const npsData = aba === "resumo" ? await clientNps(actor, id) : null;
  const npsTok = aba === "resumo" ? await prisma.npsLink.findUnique({ where: { clientId: id } }) : null;
  const hdr2 = aba === "resumo" ? await headers() : null;
  const npsLinkUrl = npsTok && hdr2 ? `${hdr2.get("x-forwarded-proto") ?? "https"}://${hdr2.get("x-forwarded-host") ?? hdr2.get("host")}/nps/${npsTok.token}` : null;
  const hasLogo = !!(await getClientLogo(actor, id));
  const ours = openTasks.rows.filter((t) => t.status === "A_FAZER" || t.status === "EM_ANDAMENTO" || t.status === "EM_REVISAO");
  const clientSide = pendings.rows.filter((p) => p.type === "CLIENTE");
  const thirdSide = pendings.rows.filter((p) => p.type === "TERCEIRO");
  const missingDocs = documents.filter((d) => !d.receivedAt);

  return (
    <>
      <section className="card mb-5 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between" aria-label="Resumo do cliente">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/clientes" className="btn-secondary btn-sm shrink-0">
            ← Clientes
          </Link>
          <ClientLogoBox clientId={id} name={client.tradeName} hasLogo={hasLogo} />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-[1.45rem] leading-tight font-bold text-brand-900">
              {client.tradeName}
              <ClientStatusBadge status={client.status} />
              {client.journeyStage && (
                <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-200 ring-inset">{STAGE_LABEL[client.journeyStage]}</span>
              )}
              {client.archivedAt && <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 ring-inset">Arquivado</span>}
            </h1>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {client.legalName}
              {client.cnpj ? ` · ${fmtCnpj(client.cnpj)}` : ""}
            </p>
            {finance && finance.monthlyFee !== null && (
              <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                {fmtMoney(finance.monthlyFee)}/mês
                {finance.billingDay ? <span className="ml-2 font-normal text-slate-500">vence {billingDaysLabel(finance.billingDay, finance.billingDay2)}</span> : null}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link href={`/tarefas/nova?clientId=${id}`} className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> Nova tarefa
          </Link>
          {can(actor, "contracts.manage") && (
            <Link href="/contratos/novo" className="btn-secondary">
              <FileSignature aria-hidden className="h-4 w-4" /> Novo contrato
            </Link>
          )}
          {manage &&
            (client.archivedAt ? (
              <ConfirmAction action={archiveClientAction.bind(null, id, false)} label="Reativar" className="btn-secondary" confirm="Reativar este cliente?" />
            ) : (
              <ConfirmAction
                action={archiveClientAction.bind(null, id, true)}
                label="Arquivar"
                className="btn border border-red-200 bg-white text-red-700 hover:bg-red-50"
                confirm="Arquivar o cliente? O histórico é preservado e as recorrências ativas serão pausadas."
              />
            ))}
        </div>
      </section>

      <div className="card overflow-hidden">
        <nav aria-label="Seções do cliente" className="flex gap-1 overflow-x-auto border-b border-hair bg-slate-50/60 px-3">
          {TABS.filter((t) => t.show(actor, extras, finance)).map((t) => (
            <Link
              key={t.key}
              href={`/clientes/${id}?aba=${t.key}`}
              aria-current={aba === t.key ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                aba === t.key ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-brand-900"
              }`}
            >
              <t.icon aria-hidden className={`h-4 w-4 ${aba === t.key ? "text-brand-700" : TAB_TONE[t.key] ?? "text-slate-400"}`} />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="p-5">
      {aba === "resumo" && (
        <>
          <ClientDashboardTop
            clientId={id}
            closing={closingSummary}
            ours={ours.length}
            clientSide={clientSide.length}
            thirdSide={thirdSide.length}
            missingDocs={missingDocs.length}
            fee={finance?.monthlyFee ?? null}
            billing={finance?.billingDay ? billingDaysLabel(finance.billingDay, finance.billingDay2) : null}
            overdue={indicators.overdue}
          />
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="Abertas"
              value={indicators.open}
              href={`/tarefas?clientId=${id}&abertas=1`}
            />
            <Stat
              label="Atrasadas"
              value={indicators.overdue}
              tone={indicators.overdue ? "danger" : "default"}
              href={`/tarefas?clientId=${id}&atrasadas=1`}
            />
            <Stat
              label="Aguardando"
              value={indicators.waiting}
              hint="Cliente ou terceiro"
              href={`/pendencias?clientId=${id}`}
            />
            <Stat
              label="Em revisão"
              value={indicators.review}
              tone="info"
              href={`/tarefas?clientId=${id}&status=EM_REVISAO`}
            />
            <Stat label="Concluídas (30 dias)" value={indicators.completed30} />
            <Stat
              label="No prazo (30 dias)"
              value={fmtPercent(indicators.onTimeRate)}
              hint="Concluídas até o prazo ÷ concluídas"
              tone="success"
            />
          </div>

          <div className="space-y-6">
            <Card
              title="Tarefas abertas"
              actions={
                <Link
                  className="text-sm text-brand-700 hover:underline"
                  href={`/tarefas?clientId=${id}`}
                >
                  Ver todas
                </Link>
              }
              bodyClassName="p-0"
            >
              {openTasks.rows.length ? (
                <TaskTable
                  rows={openTasks.rows}
                  showClient={false}
                  showAssignee={false}
                  caption="Tarefas abertas do cliente"
                  actor={actor}
                  running={running}
                />
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="Nenhuma tarefa aberta"
                    description="Crie uma tarefa ou vincule uma rotina recorrente a este cliente."
                  />
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm">
                    <p className="font-semibold text-brand-900">Primeiros passos com este cliente</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
                      <li>
                        Complete bancos e sistema em <Link href={`/clientes/${id}?aba=bancos`} className="font-medium text-brand-700 hover:underline">Bancos</Link> e guarde os acessos no <Link href={`/clientes/${id}?aba=cofre`} className="font-medium text-brand-700 hover:underline">Cofre</Link>.
                      </li>
                      <li>
                        Registre o que é específico dele em <Link href={`/clientes/${id}?aba=pops`} className="font-medium text-brand-700 hover:underline">Particularidades</Link>.
                      </li>
                      <li>
                        Crie as rotinas do mês em <Link href="/rotinas/recorrencias" className="font-medium text-brand-700 hover:underline">Modelos e recorrências</Link>.
                      </li>
                      <li>
                        Ou comece pela primeira <Link href={`/tarefas/nova?clientId=${id}`} className="font-medium text-brand-700 hover:underline">tarefa</Link>.
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Concluídas recentemente" bodyClassName="p-0">
              {recentDone.rows.length ? (
                <TaskTable
                  rows={recentDone.rows}
                  showClient={false}
                  compact
                  caption="Tarefas concluídas recentemente"
                />
              ) : (
                <p className="p-4 text-sm text-slate-500">
                  Nenhuma tarefa concluída ainda.
                </p>
              )}
            </Card>
          </div>
        </>
      )}

      {aba === "pendencias" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Dependem de nós" value={String(ours.length)} tone={ours.some((t) => t.dueAt < now) ? "danger" : "default"} hint="Tarefas abertas com a equipe" />
            <Stat label="Dependem do cliente" value={String(clientSide.length + missingDocs.length)} tone="warning" hint="Pendências e documentos" />
            <Stat label="Dependem de terceiros" value={String(thirdSide.length)} tone="info" hint="Banco, contador, órgãos" />
          </div>

          <Card title="Dependem de nós" description="Tarefas abertas deste cliente que estão com a equipe" bodyClassName="p-0">
            {ours.length ? (
              <TaskTable rows={ours} showClient={false} compact caption="Tarefas que dependem da equipe" actor={actor} running={running} />
            ) : (
              <p className="p-4 text-sm text-slate-500">Nada pendente com a equipe. Tudo em dia.</p>
            )}
          </Card>

          <Card title="Dependem do cliente" description="Informações e documentos que estamos esperando dele">
            {clientSide.length ? (
              <ul className="divide-y divide-slate-100">
                {clientSide.map((p) => (
                  <li key={p.id} className="py-2 text-sm">
                    <Link href={`/tarefas/${p.task.id}`} className="font-medium hover:underline">
                      {p.task.title}
                    </Link>
                    <p>{p.reason}</p>
                    <p className="text-xs text-slate-500">
                      Aguardando há {waitingTime(p.requestedAt, now)}
                      {p.respondent ? ` · com ${p.respondent}` : ""} · acompanhar em {fmtLocalDate(dbDateToLocalDate(p.followUpAt))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma pendência com o cliente.</p>
            )}
          </Card>

          <Card title="Documentos do mês" description="O que o cliente precisa enviar por mês. Marque o que já chegou.">
            <DocumentChecklist
              clientId={id}
              competence={competence}
              canConfigure={manage}
              items={documents.map((d) => ({
                ...d,
                receivedAt: d.receivedAt ? d.receivedAt.toISOString() : null,
              }))}
            />
          </Card>

          <Card title="Dependem de terceiros" description="Aguardando banco, contador, órgãos ou fornecedores">
            {thirdSide.length ? (
              <ul className="divide-y divide-slate-100">
                {thirdSide.map((p) => (
                  <li key={p.id} className="py-2 text-sm">
                    <Link href={`/tarefas/${p.task.id}`} className="font-medium hover:underline">
                      {p.task.title}
                    </Link>
                    <p>{p.reason}</p>
                    <p className="text-xs text-slate-500">
                      Aguardando há {waitingTime(p.requestedAt, now)}
                      {p.respondent ? ` · com ${p.respondent}` : ""} · acompanhar em {fmtLocalDate(dbDateToLocalDate(p.followUpAt))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma pendência com terceiros.</p>
            )}
          </Card>
        </div>
      )}

      {aba === "cofre" && <ClientVaultPanel clientId={id} items={vaultItems} log={vaultLog} canEdit={manage} configured={vaultConfigured()} />}

      {aba === "pops" && (
        <div className="space-y-8">
          <section aria-labelledby="sec-part">
            <h2 id="sec-part" className="mb-3 text-sm font-semibold text-brand-900">
              Particularidades
            </h2>
            <ClientNotesPanel clientId={id} kind="PARTICULARIDADE" rows={clientNotes} canDelete={manage} />
          </section>
          <section aria-labelledby="sec-pops">
            <h2 id="sec-pops" className="mb-3 text-sm font-semibold text-brand-900">
              POPs
            </h2>
            <ClientProceduresPanel clientId={id} rows={clientPops} standard={standardPops} canManage={can(actor, "procedures.manage")} />
          </section>
        </div>
      )}

      {aba === "atas" && (
        <ClientNotesPanel clientId={id} kind="ATA" rows={clientNotes} canDelete={manage} />
      )}

      {aba === "resumo" && npsData && (
        <div className="mt-6"><NpsCard clientId={id} rows={npsData.rows} nps={npsData.nps} manage={manage} flash={{ ok: sp.nps === "ok" ? "ok" : undefined, erro: sp.npserro }} link={npsLinkUrl} /></div>
      )}

      {aba === "onboarding" && (
        <div className="max-w-4xl space-y-5">
          {sp.ob && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{sp.ob === "tarefas" ? "Tarefas de onboarding criadas." : "Onboarding salvo."}</p>}
          {sp.oberro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.oberro}</p>}
          <form action={saveOnboardingAction.bind(null, id)} className="space-y-5">
            <label className="block text-sm"><span className="font-medium text-slate-700">Objetivos da parceria (um por linha)</span>
              <textarea name="goals" rows={4} defaultValue={onb?.goals ?? ""} className="input mt-1" placeholder="Ex.: Organização completa dos processos financeiros" /></label>

            <section className="rounded-xl border border-hair bg-slate-50 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-brand-900">Diagnóstico financeiro do cliente</h3>
                <span className="text-xs text-slate-500">{onbDiag?.submittedAt ? "✅ Respondido pelo cliente" : onbDiag ? "Lançado manualmente" : "Aguardando o cliente preencher"}</span>
              </div>
              <p className="mt-1 text-slate-600">Mande esse link para o cliente novo preencher sozinho (regime tributário, faturamento, bancos, plataformas), sem precisar de conta no sistema.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onbDiag?.token ? <CopyButton text={`${origin}/diagnostico/${onbDiag.token}`} label="Copiar link do diagnóstico" /> : <span className="text-xs text-slate-500">Gere o link em Dados, no bloco Diagnóstico.</span>}
                <Link href={`/clientes/${id}?aba=dados`} className="btn-secondary btn-sm">Ver diagnóstico em Dados</Link>
              </div>
            </section>

            <section className="rounded-xl border border-hair bg-slate-50 p-4 text-sm">
              <h3 className="font-semibold text-brand-900">Checklist de onboarding ({obSteps.length} etapas)</h3>
              <p className="mt-1 text-slate-600">{obSteps.map((s) => s.title).join(" · ")}</p>
              <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">💡 Quer um passo a passo pronto de cada etapa? Em Esteiras, aplique a esteira de Onboarding a este cliente (abaixo).</p>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm"><span className="font-medium text-slate-700">Nossas responsabilidades (uma por linha)</span>
                <textarea name="ourResponsibilities" rows={5} defaultValue={onb?.ourResponsibilities ?? ""} className="input mt-1" /></label>
              <label className="block text-sm"><span className="font-medium text-slate-700">Responsabilidades do cliente (uma por linha)</span>
                <textarea name="clientResponsibilities" rows={5} defaultValue={onb?.clientResponsibilities ?? ""} className="input mt-1" /></label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm"><span className="font-medium text-slate-700">Canal oficial</span><input name="officialChannel" defaultValue={onb?.officialChannel ?? ""} className="input mt-1" placeholder="Ex.: grupo de WhatsApp" /></label>
              <label className="block text-sm"><span className="font-medium text-slate-700">ERP / sistema usado</span><input name="erp" defaultValue={onb?.erp ?? client.software ?? ""} className="input mt-1" /></label>
              <label className="block text-sm"><span className="font-medium text-slate-700">E-mail padrão de atendimento</span><input name="defaultEmail" type="email" defaultValue={onb?.defaultEmail ?? ""} className="input mt-1" /></label>
            </div>
            <button type="submit" className="btn-primary">Salvar onboarding</button>
          </form>

          <form action={createOnboardingTasksAction.bind(null, id)}>
            <button type="submit" className="btn-secondary">➕ Criar as {obSteps.length} tarefas de onboarding</button>
          </form>

          <div className="space-y-4 border-t border-hair pt-5">
            <p className="text-sm text-slate-600">
              Etapa atual: <strong>{client.journeyStage ? STAGE_LABEL[client.journeyStage] : "não definida"}</strong>
              {manage && (<>{" "}· <Link href={`/clientes/${id}/editar`} className="font-medium text-brand-700 hover:underline">alterar</Link></>)}
            </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ESTEIRAS.filter((e) => e.slug === "pre-onboarding" || e.slug === "onboarding" || e.slug === "implantacao").map((e) => {
              const tone = TONE[e.tone];
              const c = esteiraCounts(e);
              const prog = (journey as Record<string, { clients: Array<{ total: number; done: number }> }>)[e.slug]?.clients[0];
              const pct = prog && prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
              return (
                <div key={e.slug} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${tone.border}`}>
                  <div className={`flex items-center gap-2 bg-gradient-to-r px-4 py-2.5 text-white ${tone.band}`}>
                    <EsteiraIcon icon={e.icon} className="h-5 w-5" />
                    <span className="text-sm font-semibold">{e.name}</span>
                  </div>
                  <div className="space-y-2 p-4 text-sm">
                    {prog ? (
                      <>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{prog.done} de {prog.total} tarefas concluídas</span>
                          <span className="font-semibold">{pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${tone.solid}`} style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">Ainda não aplicada ({c.tasks} tarefas disponíveis).</p>
                    )}
                    {can(actor, "projects.manage") && (
                      <Link href={`/esteiras/${e.slug}?cliente=${id}`} className={`inline-block text-xs font-medium hover:underline ${tone.text}`}>
                        {prog ? "Aplicar mais tarefas" : "Ver e aplicar"} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {aba === "fechamentos" && closingData && (
        <ClosingPanel clientId={id} month={closingMonth} closing={closingData.closing} tasks={closingData.tasks} history={closingHist} manage={manage} />
      )}

      {aba === "rotinas" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-4 text-sm text-slate-700">
            <p className="font-semibold text-brand-900">
              O que é a rotina do cliente?
            </p>
            <p className="mt-1">
              É a agenda fixa deste cliente: o que precisa ser feito, em que dia
              e horário. Cadastrada aqui, a rotina gera as tarefas sozinha, no
              dia e horário certos.
            </p>
          </div>
          <Card
            title="Agenda de rotinas"
            actions={
              can(actor, "recurrences.manage") && (
                <Link
                  className="text-sm text-brand-700 hover:underline"
                  href={`/rotinas/recorrencias/nova?clientId=${id}`}
                >
                  Cadastro avançado
                </Link>
              )
            }
          >
            <ClientRoutineAgenda
              editable={can(actor, "recurrences.manage")}
              routines={client.recurrences.map((r) => ({
                id: r.id,
                name: r.template.title,
                frequency: r.frequency,
                weekdays: r.weekdays,
                monthDays: r.monthDays,
                nthBusinessDay: r.nthBusinessDay,
                dueTime: r.dueTime,
                status: r.status,
                assignee: r.assignee?.name ?? null,
              }))}
            />
          </Card>
          {routineForm && (
            <Card
              title="Nova rotina"
              description="Cadastro rápido: dia, horário e pronto."
            >
              <ClientRoutineForm
                clientId={id}
                templates={routineForm.templates}
                people={routineForm.people}
                projects={routineForm.projects}
              />
            </Card>
          )}
        </div>
      )}

      {aba === "dados" && sp.salvo && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Dados salvos.</p>
      )}
      {aba === "dados" && (
        manage && formPeople ? (
          <ClientForm
            action={updateClientAction.bind(null, id)}
            people={formPeople}
            submitLabel="Salvar dados"
            cancelHref={`/clientes/${id}`}
            values={{
              ...client,
              monthlyFee: moneyInput(client.monthlyFee === null ? null : Number(client.monthlyFee)),
              directCost: moneyInput(client.directCost === null ? null : Number(client.directCost)),
              startDate: client.startDate ? dbDateToLocalDate(client.startDate) : null,
              memberIds: client.members.map((m) => m.userId),
            }}
          />
        ) : (
          <dl className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">CNPJ</dt>
            <dd>{client.cnpj ? fmtCnpj(client.cnpj) : "—"}</dd>
            <dt className="text-slate-500">Razão social</dt>
            <dd>{client.legalName}</dd>
            <dt className="text-slate-500">Contato</dt>
            <dd>{client.contactName ?? "—"}</dd>
            <dt className="text-slate-500">E-mail</dt>
            <dd className="break-all">{client.contactEmail ?? "—"}</dd>
            <dt className="text-slate-500">Telefone</dt>
            <dd>{client.contactPhone ?? "—"}</dd>
            <dt className="text-slate-500">Responsável</dt>
            <dd>{client.responsibleOperator?.name ?? "—"}</dd>
          </dl>
        )
      )}

      {aba === "dados" && <div className="mt-6" />}
      {aba === "dados" && showFinance && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {finance && (
              <Card title="Contrato e rentabilidade" description="Mês atual">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">Mensalidade</dt>
                  <dd className="font-medium">
                    {fmtMoney(finance.monthlyFee)}
                  </dd>
                  <dt className="text-slate-500">Vencimento</dt>
                  <dd>
                    {finance.billingDay ? (
                      finance.billingDay2 ? (
                        <span>
                          {monthlyInstallments(finance.monthlyFee ?? 0, finance.billingDay, finance.billingDay2, finance.firstInstallmentPct)
                            .map((i) => `${fmtMoney(i.amount)} no dia ${i.day}`)
                            .join(" e ")}
                        </span>
                      ) : (
                        `Dia ${finance.billingDay}`
                      )
                    ) : (
                      "—"
                    )}
                  </dd>
                  <dt className="text-slate-500">Horas no mês</dt>
                  <dd>{fmtHours(finance.minutes)}</dd>
                  <dt className="text-slate-500">Custo</dt>
                  <dd>{fmtMoney(finance.cost)}</dd>
                  <dt className="text-slate-500">Margem</dt>
                  <dd
                    className={
                      finance.margin !== null && finance.margin < 0
                        ? "font-semibold text-red-700"
                        : "font-medium"
                    }
                  >
                    {fmtMoney(finance.margin)}{" "}
                    {finance.marginPct !== null && (
                      <span className="text-xs text-slate-500">
                        ({fmtPercent(finance.marginPct)})
                      </span>
                    )}
                  </dd>
                </dl>
              </Card>
            )}
            <Card title="Horas trabalhadas" description="Últimos 6 meses">
              {(() => {
                const max = Math.max(
                  1,
                  ...extras.hoursByMonth.map((m) => m.minutes),
                );
                return (
                  <ul className="space-y-1.5">
                    {extras.hoursByMonth.map((m) => (
                      <li
                        key={m.month}
                        className="grid grid-cols-[3.2rem_1fr_3.4rem] items-center gap-2 text-xs"
                      >
                        <span className="text-slate-500">
                          {m.month.slice(5)}/{m.month.slice(2, 4)}
                        </span>
                        <span className="h-2 rounded-full bg-slate-100">
                          <span
                            className="block h-2 rounded-full bg-brand-500"
                            style={{ width: `${(m.minutes / max) * 100}%` }}
                          />
                        </span>
                        <span className="text-right tabular-nums text-slate-700">
                          {fmtHours(m.minutes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
              {extras.hoursByPerson.length > 0 && (
                <>
                  <h3 className="mt-4 text-xs font-semibold text-slate-500">
                    Por pessoa neste mês
                  </h3>
                  <ul className="mt-1 divide-y divide-slate-100 text-sm">
                    {extras.hoursByPerson.map((p) => (
                      <li key={p.name} className="flex justify-between py-1">
                        <span>{p.name}</span>
                        <span className="font-medium tabular-nums">
                          {fmtHours(p.minutes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
          <div className="space-y-6">
            {(can(actor, "contracts.manage") ||
              extras.contracts.length > 0) && (
              <Card
                title="Contratos"
                actions={
                  can(actor, "contracts.manage") && (
                    <Link
                      className="text-sm text-brand-700 hover:underline"
                      href="/contratos"
                    >
                      Ver todos
                    </Link>
                  )
                }
              >
                {extras.contracts.length ? (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {extras.contracts.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div>
                          <Link
                            href={`/contratos/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            Contrato {c.number}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {fmtMoney(c.monthlyFee)} · {c.termMonths} meses
                            {c.startDate
                              ? ` · desde ${fmtLocalDate(c.startDate)}`
                              : ""}
                            {c.hasDistrato ? " · com distrato" : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          {
                            CONTRACT_STATUS_LABEL[
                              c.status as keyof typeof CONTRACT_STATUS_LABEL
                            ]
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    Nenhum contrato vinculado a este cliente.
                  </p>
                )}
              </Card>
            )}

            {extras.proposals.length > 0 && (
              <Card title="Propostas">
                <ul className="divide-y divide-slate-100 text-sm">
                  {extras.proposals.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <Link
                        href={`/propostas/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        Proposta {p.number} · {fmtMoney(p.monthlyFee)}
                      </Link>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        {PROPOSAL_STATUS_LABEL[p.status as ProposalStatus]}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {aba === "dados" && manage && client.status !== "ENCERRADO" && (
        <details className="mt-6 rounded-xl border border-red-200 bg-red-50/40 p-4">
          <summary className="cursor-pointer text-sm font-medium text-red-700">Encerrar cliente (registrar saída)</summary>
          <form action={closeClientAction.bind(null, id)} className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-sm"><span className="font-medium text-slate-700">Motivo</span>
              <select name="reason" required className="input mt-1" defaultValue=""><option value="" disabled>Escolha</option>{CHURN_REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="text-sm md:col-span-2"><span className="font-medium text-slate-700">Detalhes (opcional)</span><input name="detail" maxLength={1000} className="input mt-1" /></label>
            <div><button type="submit" className="btn-secondary border-red-300 text-red-700">Encerrar e registrar saída</button></div>
          </form>
        </details>
      )}

      {aba === "dados" && vol && <DiagnosisPanel clientId={id} diagnosis={vol.diagnosis} rows={vol.rows} manage={manage} flash={{ dx: sp.dx, erro: sp.dxerro }} />}

      {aba === "dados" && (
        <div className="mt-6">
          <BankAccountsPanel clientId={id} accounts={banks} canEdit={manage} />
        </div>
      )}

      {aba === "historico" && (
        <div className="max-w-3xl">
          <Card
            title="Histórico"
            description="Últimos eventos do cliente e de suas tarefas"
          >
            {history.length ? (
              <ol className="space-y-2">
                {history.map((e) => (
                  <li
                    key={e.id}
                    className="border-l-2 border-slate-200 pl-3 text-sm"
                  >
                    <p>
                      {e.taskId ? (
                        <Link
                          className="hover:underline"
                          href={`/tarefas/${e.taskId}`}
                        >
                          {e.summary}
                        </Link>
                      ) : (
                        e.summary
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.actor?.name ?? "Sistema"} · {fmtDateTime(e.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Sem eventos.</p>
            )}
          </Card>
        </div>
      )}
        </div>
      </div>
    </>
  );
}

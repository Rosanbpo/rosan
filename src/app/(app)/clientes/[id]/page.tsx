import Link from "next/link";
import {
  Briefcase,
  CalendarCheck,
  FileCheck2,
  FileSignature,
  FolderKanban,
  History,
  LayoutDashboard,
  Mail,
  Pencil,
  Phone,
  Plus,
  Repeat,
  UserRound,
  Wallet,
} from "lucide-react";
import { dbDateToLocalDate } from "@/domain/dates";
import {
  PENDING_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/domain/enums";
import { CONTRACT_STATUS_LABEL } from "@/domain/contract";
import { PROPOSAL_STATUS_LABEL, type ProposalStatus } from "@/domain/proposal";
import { can } from "@/domain/permissions";
import { Card, EmptyState, Stat } from "@/components/ui/layout";
import { ClientRoutineAgenda } from "@/components/client-routine-agenda";
import { ClientRoutineForm } from "@/components/client-routine-form";
import { listTemplates } from "@/server/services/templates";
import { assignableUsers } from "@/server/services/tasks";
import { DocumentChecklist } from "@/components/document-checklist";
import { isCompetence, previousCompetence } from "@/domain/documents";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { getDocumentChecklist } from "@/server/services/documents";
import { ClientStatusBadge } from "@/components/ui/badges";
import { TaskTable } from "@/components/task-table";
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
  {
    key: "documentos",
    label: "Documentos",
    icon: FileCheck2,
    show: () => true,
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    show: (a, e, f) =>
      !!f ||
      can(a, "contracts.manage") ||
      e.contracts.length > 0 ||
      e.proposals.length > 0,
  },
  { key: "projetos", label: "Projetos", icon: FolderKanban, show: () => true },
  { key: "rotinas", label: "Rotinas", icon: Repeat, show: () => true },
  { key: "cadastro", label: "Cadastro", icon: UserRound, show: () => true },
  { key: "historico", label: "Histórico", icon: History, show: () => true },
];

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
  const aba = TABS.some((t) => t.key === sp.aba)
    ? (sp.aba as string)
    : "resumo";
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
  ] = await Promise.all([
    getRunningTimer(actor),
    clientPanelExtras(actor, id),
    clientIndicators(actor, id),
    listTasks(actor, { clientId: id, open: true, pageSize: 15 }),
    listTasks(actor, {
      clientId: id,
      status: ["CONCLUIDA"],
      sort: "completed",
      pageSize: 5,
    }),
    listPendings(actor, { clientId: id }),
    clientHistory(actor, id),
    getDocumentChecklist(actor, id, competence),
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
        }
      : null;
  const manage = can(actor, "clients.manage");
  const finance = can(actor, "finance.view")
    ? await clientMonthSummary(actor, id)
    : null;
  const now = new Date();

  return (
    <>
      <Link href="/clientes" className="text-sm text-brand-700 hover:underline">
        ← Clientes
      </Link>
      <section
        className="mt-2 mb-6 overflow-hidden rounded-xl bg-brand-900 text-brand-100 shadow-[0_2px_8px_rgb(12_22_51/0.18)]"
        aria-label="Resumo do cliente"
      >
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-500 uppercase">
              Painel do cliente
            </p>
            <h1 className="mt-1.5 flex flex-wrap items-center gap-3 font-serif text-[1.9rem] leading-tight text-brand-100">
              {client.tradeName} <ClientStatusBadge status={client.status} />
              {client.archivedAt && (
                <span className="rounded bg-zinc-200 px-2 py-0.5 font-sans text-xs text-zinc-700">
                  Arquivado
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-brand-200/90">
              {client.legalName}
              {client.cnpj ? ` · CNPJ ${fmtCnpj(client.cnpj)}` : ""}
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <HeroFact
                icon={UserRound}
                label="Contato"
                value={client.contactName ?? "—"}
              />
              {client.contactEmail && (
                <HeroFact
                  icon={Mail}
                  label="E-mail"
                  value={client.contactEmail}
                />
              )}
              {client.contactPhone && (
                <HeroFact
                  icon={Phone}
                  label="Telefone"
                  value={client.contactPhone}
                />
              )}
              <HeroFact
                icon={Briefcase}
                label="Responsável"
                value={client.responsibleOperator?.name ?? "—"}
              />
              <HeroFact
                icon={CalendarCheck}
                label="Cliente desde"
                value={
                  client.startDate
                    ? fmtLocalDate(dbDateToLocalDate(client.startDate))
                    : "—"
                }
              />
              {finance && (
                <HeroFact
                  icon={Wallet}
                  label="Mensalidade"
                  value={`${fmtMoney(finance.monthlyFee)}${finance.billingDay ? ` · dia ${finance.billingDay}` : ""}`}
                />
              )}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href={`/tarefas/nova?clientId=${id}`}
              className="btn bg-brand-500 text-brand-900 hover:bg-brand-200"
            >
              <Plus aria-hidden className="h-4 w-4" /> Nova tarefa
            </Link>
            {manage && (
              <Link
                href={`/clientes/${id}/editar`}
                className="btn border border-white/25 text-brand-100 hover:bg-white/10"
              >
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </Link>
            )}
            {can(actor, "contracts.manage") && (
              <Link
                href="/contratos/novo"
                className="btn border border-white/25 text-brand-100 hover:bg-white/10"
              >
                <FileSignature aria-hidden className="h-4 w-4" /> Novo contrato
              </Link>
            )}
            {manage &&
              (client.archivedAt ? (
                <ConfirmAction
                  action={archiveClientAction.bind(null, id, false)}
                  label="Reativar"
                  className="btn border border-white/25 text-brand-100 hover:bg-white/10"
                  confirm="Reativar este cliente?"
                />
              ) : (
                <ConfirmAction
                  action={archiveClientAction.bind(null, id, true)}
                  label="Arquivar"
                  className="btn text-red-300 hover:bg-white/10"
                  confirm="Arquivar o cliente? O histórico é preservado e as recorrências ativas serão pausadas."
                />
              ))}
          </div>
        </div>
      </section>

      <nav
        aria-label="Seções do cliente"
        className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {TABS.filter((t) => t.show(actor, extras, finance)).map((t) => (
          <Link
            key={t.key}
            href={`/clientes/${id}?aba=${t.key}`}
            aria-current={aba === t.key ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              aba === t.key
                ? "border-brand-500 text-brand-900"
                : "border-transparent text-slate-500 hover:text-brand-900"
            }`}
          >
            <t.icon aria-hidden className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </nav>

      {aba === "resumo" && (
        <>
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
                </div>
              )}
            </Card>

            <Card title="Pendências em aberto">
              {pendings.rows.length ? (
                <ul className="divide-y divide-slate-100">
                  {pendings.rows.map((p) => (
                    <li key={p.id} className="py-2 text-sm">
                      <Link
                        href={`/tarefas/${p.task.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.task.title}
                      </Link>
                      <p>{p.reason}</p>
                      <p className="text-xs text-slate-500">
                        Aguardando {PENDING_TYPE_LABEL[p.type].toLowerCase()} há{" "}
                        {waitingTime(p.requestedAt, now)} · acompanhar em{" "}
                        {fmtLocalDate(dbDateToLocalDate(p.followUpAt))}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Nenhuma pendência em aberto.
                </p>
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

      {aba === "documentos" && (
        <div className="max-w-2xl">
          <Card
            title="Documentos do cliente"
            description="O que o cliente precisa enviar por mês"
          >
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
        </div>
      )}

      {aba === "financeiro" && (
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
                    {finance.billingDay ? `Dia ${finance.billingDay}` : "—"}
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
                  <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
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

      {aba === "projetos" && (
        <div className="max-w-2xl">
          <Card
            title="Projetos"
            actions={
              <Link
                className="text-sm text-brand-700 hover:underline"
                href={`/projetos/novo?cliente=${client.id}`}
              >
                Implantação / novo
              </Link>
            }
          >
            {extras.projects.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {extras.projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <Link
                        href={`/projetos/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.dueDate && (
                        <p className="text-xs text-slate-500">
                          Prazo {fmtLocalDate(p.dueDate)}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {PROJECT_STATUS_LABEL[p.status as ProjectStatus]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum projeto para este cliente.
              </p>
            )}
          </Card>
        </div>
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
              />
            </Card>
          )}
        </div>
      )}

      {aba === "cadastro" && (
        <div className="max-w-2xl">
          <Card title="Cadastro">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Contato</dt>
              <dd>{client.contactName ?? "—"}</dd>
              <dt className="text-slate-500">E-mail</dt>
              <dd className="break-all">{client.contactEmail ?? "—"}</dd>
              <dt className="text-slate-500">Telefone</dt>
              <dd>{client.contactPhone ?? "—"}</dd>
              <dt className="text-slate-500">Canais</dt>
              <dd>{client.contactChannels ?? "—"}</dd>
              <dt className="text-slate-500">Início</dt>
              <dd>
                {client.startDate
                  ? fmtLocalDate(dbDateToLocalDate(client.startDate))
                  : "—"}
              </dd>
              <dt className="text-slate-500">Responsável</dt>
              <dd>{client.responsibleOperator?.name ?? "—"}</dd>
              <dt className="text-slate-500">Gestor</dt>
              <dd>{client.manager?.name ?? "—"}</dd>
              <dt className="text-slate-500">Equipe</dt>
              <dd>
                {client.members.map((m) => m.user.name).join(", ") || "—"}
              </dd>
            </dl>
            <h3 className="mt-4 text-xs font-semibold text-slate-500 uppercase">
              Serviços contratados
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {client.services.length ? (
                client.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
            {client.notes && (
              <>
                <h3 className="mt-4 text-xs font-semibold text-slate-500 uppercase">
                  Observações operacionais
                </h3>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {client.notes}
                </p>
              </>
            )}
          </Card>
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
    </>
  );
}

function HeroFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-brand-500">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div>
        <dt className="text-[10px] font-semibold tracking-[0.18em] text-brand-500 uppercase">
          {label}
        </dt>
        <dd className="text-sm text-brand-100">{value}</dd>
      </div>
    </div>
  );
}

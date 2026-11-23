import Link from "next/link";
import { CalendarDays, Columns3, List, Plus } from "lucide-react";
import {
  addDays,
  addMonths,
  daysInMonth,
  instantToLocalDate,
  isValidLocalDate,
  localDateTimeToInstant,
  makeLocalDate,
  parseLocalDate,
  weekday,
} from "@/domain/dates";
import { PRIORITIES, STATUS_LABEL, TASK_CATEGORIES, TASK_STATUSES, WEEKDAY_LABEL, type TaskStatus } from "@/domain/enums";
import { isOverdue } from "@/domain/task-rules";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { TaskTable } from "@/components/task-table";
import { KanbanBoard } from "@/components/kanban-board";
import { Select, categoryOptions, priorityOptions } from "@/components/filter-select";
import { fmtDateTime } from "@/lib/format";
import { STATUS_DOT, cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { getRunningTimer } from "@/server/services/timer";
import { clientOptions } from "@/server/services/clients";
import { assignableUsers, countTasks, listTasks, type TaskFilters } from "@/server/services/tasks";
import { list, oneOf, pageOf, str } from "@/server/page-utils";

export const metadata = { title: "Tarefas" };

type SP = Record<string, string | string[] | undefined>;

const VIEWS = ["lista", "kanban", "calendario"] as const;

function buildFilters(sp: SP, now: Date): TaskFilters {
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const prazo = str(sp, "prazo");
  const dia = str(sp, "dia");
  const range =
    dia && isValidLocalDate(dia)
      ? { dueFrom: localDateTimeToInstant(dia, "00:00", APP_TIMEZONE), dueTo: localDateTimeToInstant(addDays(dia, 1), "00:00", APP_TIMEZONE) }
      : prazo === "hoje"
      ? { dueFrom: localDateTimeToInstant(today, "00:00", APP_TIMEZONE), dueTo: localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE) }
      : prazo === "7dias"
        ? { dueFrom: localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE), dueTo: localDateTimeToInstant(addDays(today, 8), "00:00", APP_TIMEZONE) }
        : {};
  const statuses = list(sp, "status").filter((s): s is TaskStatus => (TASK_STATUSES as readonly string[]).includes(s));
  return {
    q: str(sp, "q"),
    clientId: str(sp, "clientId"),
    assigneeId: str(sp, "assigneeId"),
    status: statuses,
    open: (str(sp, "f") === "1" ? str(sp, "abertas") === "1" : true) || prazo === "hoje" || prazo === "7dias",
    overdue: str(sp, "atrasadas") === "1",
    category: oneOf(str(sp, "category"), TASK_CATEGORIES),
    priority: oneOf(str(sp, "priority"), PRIORITIES),
    origin: oneOf(str(sp, "origin"), ["MANUAL", "RECORRENTE"] as const),
    sort: oneOf(str(sp, "sort"), ["due", "priority", "created"] as const) ?? "due",
    ...range,
  };
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const now = new Date();
  const view = oneOf(str(sp, "view"), VIEWS) ?? "lista";
  const filters = buildFilters(sp, now);
  const [clients, users] = await Promise.all([clientOptions(actor), assignableUsers(actor)]);
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const dayStart = (d: string) => localDateTimeToInstant(d, "00:00", APP_TIMEZONE);
  const [nOpen, nLate, nToday, nWeek, nMine, nWaiting] = await Promise.all([
    countTasks(actor, { open: true }),
    countTasks(actor, { open: true, overdue: true }),
    countTasks(actor, { open: true, dueFrom: dayStart(today), dueTo: dayStart(addDays(today, 1)) }),
    countTasks(actor, { open: true, dueFrom: dayStart(addDays(today, 1)), dueTo: dayStart(addDays(today, 8)) }),
    countTasks(actor, { open: true, assigneeId: actor.userId }),
    countTasks(actor, { status: ["AGUARDANDO_CLIENTE"] }),
  ]);
  const quick = [
    { key: "todas", label: "Abertas", n: nOpen, qs: "", tone: "" },
    { key: "atrasadas", label: "Atrasadas", n: nLate, qs: "atrasadas=1&f=1&abertas=1", tone: "red" },
    { key: "hoje", label: "Vencem hoje", n: nToday, qs: "prazo=hoje", tone: "amber" },
    { key: "7dias", label: "Próximos 7 dias", n: nWeek, qs: "prazo=7dias", tone: "" },
    { key: "minhas", label: "Minhas", n: nMine, qs: `assigneeId=${actor.userId}`, tone: "" },
    { key: "aguardando", label: "Aguardando cliente", n: nWaiting, qs: "status=AGUARDANDO_CLIENTE&f=1", tone: "" },
  ];
  const activeQuick =
    str(sp, "atrasadas") === "1" && !str(sp, "prazo") ? "atrasadas"
    : str(sp, "prazo") === "hoje" ? "hoje"
    : str(sp, "prazo") === "7dias" ? "7dias"
    : str(sp, "assigneeId") === actor.userId ? "minhas"
    : str(sp, "status") === "AGUARDANDO_CLIENTE" ? "aguardando"
    : !Object.keys(sp).some((k) => !["view", "page", "mes"].includes(k)) ? "todas"
    : "";
  const hasAdvanced = !!(filters.category || filters.priority || filters.origin || filters.sort !== "due" || filters.clientId);

  const viewHref = (v: string) => {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(sp)) {
      if (k === "view" || k === "page" || val === undefined) continue;
      for (const item of Array.isArray(val) ? val : [val]) params.append(k, item);
    }
    params.set("view", v);
    return `/tarefas?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Tarefas"
        description="Pesquise, filtre e acompanhe as tarefas dos clientes que você atende."
        actions={
          <Link href="/tarefas/nova" className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> Nova tarefa
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Atalhos">
        {quick.map((c) => (
          <Link
            key={c.key}
            href={`/tarefas?view=${view}${c.qs ? `&${c.qs}` : ""}`}
            aria-current={activeQuick === c.key ? "true" : undefined}
            className={cx(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              activeQuick === c.key
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-[#d3dae5] bg-white text-slate-700 hover:border-brand-700 hover:text-brand-900",
            )}
          >
            {c.label}
            <span
              className={cx(
                "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                activeQuick === c.key
                  ? "bg-white/20 text-white"
                  : c.tone === "red" && c.n > 0
                    ? "bg-red-100 text-red-700"
                    : c.tone === "amber" && c.n > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600",
              )}
            >
              {c.n}
            </span>
          </Link>
        ))}
      </div>

      <form className="card mb-4 p-3" aria-label="Filtros de tarefas">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="f" value="1" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="f-q" className="label text-xs">
              Pesquisa
            </label>
            <input id="f-q" name="q" defaultValue={filters.q} className="input" placeholder="Título, descrição ou cliente" />
          </div>
          <div className="w-44">
            <Select name="assigneeId" label="Responsável" value={filters.assigneeId} options={[{ value: "none", label: "Sem responsável" }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
          </div>
          <div className="w-44">
            <Select name="status" label="Status" value={filters.status?.[0]} options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-sm">
            <input type="checkbox" name="abertas" value="1" defaultChecked={str(sp, "f") === "1" ? str(sp, "abertas") === "1" : true} /> Só abertas
          </label>
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
          <Link href={`/tarefas?view=${view}`} className="btn-secondary">
            Limpar
          </Link>
        </div>
        <details className="mt-3 border-t border-slate-100 pt-3" open={hasAdvanced}>
          <summary className="cursor-pointer text-[13px] font-medium text-brand-700 select-none">Mais filtros</summary>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Select name="clientId" label="Cliente" value={filters.clientId} options={[{ value: "interna", label: "Tarefas internas" }, ...clients.map((c) => ({ value: c.id, label: c.tradeName }))]} />
            <Select name="category" label="Categoria" value={filters.category} options={categoryOptions} placeholder="Todas" />
            <Select name="priority" label="Prioridade" value={filters.priority} options={priorityOptions} placeholder="Todas" />
            <Select name="prazo" label="Prazo" value={str(sp, "prazo")} placeholder="Qualquer" options={[{ value: "hoje", label: "Vence hoje" }, { value: "7dias", label: "Próximos 7 dias" }]} />
            <Select name="origin" label="Origem" value={filters.origin} options={[{ value: "MANUAL", label: "Manual" }, { value: "RECORRENTE", label: "Rotina recorrente" }]} />
            <Select name="sort" label="Ordenar por" value={filters.sort} placeholder="Prazo" options={[{ value: "priority", label: "Prioridade" }, { value: "created", label: "Mais recentes" }]} />
            <label className="flex items-center gap-1.5 text-sm md:col-span-2">
              <input type="checkbox" name="atrasadas" value="1" defaultChecked={filters.overdue} /> Só atrasadas
            </label>
          </div>
        </details>
      </form>

      <nav aria-label="Visualização" className="mb-4 inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        {[
          { v: "lista", label: "Lista", Icon: List },
          { v: "kanban", label: "Kanban", Icon: Columns3 },
          { v: "calendario", label: "Calendário", Icon: CalendarDays },
        ].map(({ v, label, Icon }) => (
          <Link
            key={v}
            href={viewHref(v)}
            aria-current={view === v ? "page" : undefined}
            className={cx(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm",
              view === v ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Icon aria-hidden className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>

      {view === "lista" && <ListView actorFilters={filters} sp={sp} />}
      {view === "kanban" && <KanbanView actorFilters={filters} />}
      {view === "calendario" && <CalendarView actorFilters={filters} sp={sp} />}
    </>
  );
}

async function ListView({ actorFilters, sp }: { actorFilters: TaskFilters; sp: SP }) {
  const actor = await requireActor();
  const [result, running] = await Promise.all([listTasks(actor, { ...actorFilters, page: pageOf(sp) }), getRunningTimer(actor)]);
  if (result.total === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa encontrada"
        description="Ajuste os filtros ou crie uma nova tarefa. Tarefas de rotinas aparecem automaticamente conforme a antecedência configurada."
        action={
          <Link href="/tarefas/nova" className="btn-primary">
            Nova tarefa
          </Link>
        }
      />
    );
  }
  return (
    <div className="card">
      <TaskTable rows={result.rows} caption="Lista de tarefas" actor={actor} running={running} />
      <div className="border-t border-slate-100 px-3">
        <Pagination total={result.total} page={result.page} pageSize={result.pageSize} searchParams={sp} basePath="/tarefas" />
      </div>
    </div>
  );
}

async function KanbanView({ actorFilters }: { actorFilters: TaskFilters }) {
  const actor = await requireActor();
  const now = new Date();
  const closedSince = new Date(now.getTime() - 14 * 86_400_000);
  const wantsClosed = actorFilters.status?.some((s) => s === "CONCLUIDA" || s === "CANCELADA");
  const [open, closed] = await Promise.all([
    listTasks(actor, { ...actorFilters, open: !actorFilters.status?.length, pageSize: 300 }),
    actorFilters.open || (actorFilters.status?.length && !wantsClosed)
      ? Promise.resolve({ rows: [] })
      : listTasks(actor, {
          ...actorFilters,
          status: actorFilters.status?.length ? actorFilters.status : ["CONCLUIDA", "CANCELADA"],
          dueFrom: actorFilters.dueFrom,
          pageSize: 60,
          sort: "created",
        }).then((r) => ({ rows: r.rows.filter((t) => (t.completedAt ?? t.updatedAt) >= closedSince) })),
  ]);
  const map = new Map([...open.rows, ...closed.rows].map((t) => [t.id, t]));
  const tasks = [...map.values()].map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as TaskStatus,
    priority: t.priority,
    clientName: t.client?.tradeName ?? "Interna",
    assigneeName: t.assignee?.name ?? null,
    dueLabel: fmtDateTime(t.dueAt),
    overdue: isOverdue({ status: t.status as TaskStatus, dueAt: t.dueAt }, now),
  }));
  return <KanbanBoard tasks={tasks} closedNote="Colunas Concluída e Cancelada exibem apenas os últimos 14 dias." />;
}

async function CalendarView({ actorFilters, sp }: { actorFilters: TaskFilters; sp: SP }) {
  const actor = await requireActor();
  const now = new Date();
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const monthParam = str(sp, "mes");
  const base = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const { y, m } = parseLocalDate(`${base}-01`);
  const first = makeLocalDate(y, m, 1);
  const last = makeLocalDate(y, m, daysInMonth(y, m));
  const result = await listTasks(actor, {
    ...actorFilters,
    dueFrom: localDateTimeToInstant(first, "00:00", APP_TIMEZONE),
    dueTo: localDateTimeToInstant(addDays(last, 1), "00:00", APP_TIMEZONE),
    pageSize: 500,
  });
  const byDay = new Map<string, typeof result.rows>();
  for (const t of result.rows) {
    const d = instantToLocalDate(t.dueAt, APP_TIMEZONE);
    byDay.set(d, [...(byDay.get(d) ?? []), t]);
  }
  const lead = weekday(first);
  const cells: Array<string | null> = [...Array(lead).fill(null)];
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(makeLocalDate(y, m, d));
  while (cells.length % 7) cells.push(null);
  const prev = addMonths(y, m, -1);
  const next = addMonths(y, m, 1);
  const monthHref = (yy: number, mm: number) => {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(sp)) {
      if (k === "mes" || val === undefined) continue;
      for (const item of Array.isArray(val) ? val : [val]) params.append(k, item);
    }
    params.set("mes", `${yy}-${String(mm).padStart(2, "0")}`);
    return `/tarefas?${params}`;
  };
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link className="btn-secondary btn-sm" href={monthHref(prev.y, prev.m)}>
          ← Anterior
        </Link>
        <h2 className="text-base font-semibold capitalize">{monthName}</h2>
        <Link className="btn-secondary btn-sm" href={monthHref(next.y, next.m)}>
          Próximo →
        </Link>
      </div>
      {result.total > result.rows.length && (
        <p className="mb-2 text-xs text-amber-700">Exibindo as primeiras {result.rows.length} tarefas do mês. Refine os filtros.</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs">
          <caption className="sr-only">Calendário de prazos de {monthName}</caption>
          <thead>
            <tr>
              {WEEKDAY_LABEL.map((d) => (
                <th key={d} scope="col" className="py-1 text-center font-semibold text-slate-500">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, w) => (
              <tr key={w}>
                {cells.slice(w * 7, w * 7 + 7).map((date, i) => {
                  const items = date ? byDay.get(date) ?? [] : [];
                  return (
                    <td
                      key={i}
                      className={cx(
                        "h-28 border border-slate-200 p-1 align-top",
                        !date && "bg-slate-50",
                        date === today && "bg-brand-50",
                      )}
                    >
                      {date && (
                        <>
                          <div className={cx("mb-1 text-right font-medium", date === today ? "text-brand-700" : "text-slate-500")}>
                            {Number(date.slice(8))}
                          </div>
                          <ul className="space-y-0.5">
                            {items.slice(0, 4).map((t) => {
                              const overdue = isOverdue({ status: t.status as TaskStatus, dueAt: t.dueAt }, now);
                              return (
                                <li key={t.id}>
                                  <Link
                                    href={`/tarefas/${t.id}`}
                                    title={`${t.title} — ${t.client?.tradeName ?? "Interna"}`}
                                    className={cx(
                                      "flex items-center gap-1 truncate rounded px-1 py-0.5 hover:bg-slate-100",
                                      overdue && "bg-red-50 font-semibold text-red-700",
                                      t.status === "CONCLUIDA" && "text-slate-400 line-through",
                                    )}
                                  >
                                    <span aria-hidden className={cx("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[t.status as TaskStatus])} />
                                    <span className="truncate">
                                      {t.client?.tradeName ?? "Interna"}: {t.title}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                            {items.length > 4 && (
                              <li>
                                <Link
                                  className="px-1 text-brand-700 hover:underline"
                                  href={`/tarefas?view=lista&dia=${date}`}
                                >
                                  +{items.length - 4} tarefas
                                </Link>
                              </li>
                            )}
                          </ul>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

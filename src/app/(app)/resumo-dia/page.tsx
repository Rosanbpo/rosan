import Link from "next/link";
import { DayGoalBoard } from "@/components/day-goal-board";
import { PageHeader } from "@/components/ui/layout";
import { addDays, instantToLocalDate, localDateTimeToInstant, startOfToday } from "@/domain/dates";
import { requireActor } from "@/server/context";
import { APP_TIMEZONE } from "@/server/config";
import { prisma } from "@/server/db";
import { clientScope } from "@/server/services/access";
import { agendaMonth } from "@/server/services/agenda";
import { dayGoal } from "@/server/services/day-goal";
import { focusStats } from "@/server/services/focus";
import { googleEvents } from "@/server/services/google-agenda";
import { buildTaskWhere } from "@/server/services/tasks";

export const metadata = { title: "Resumo do dia" };

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`);
const time = (d: Date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIMEZONE }).format(d);

function Box({ title, count, children, tone }: { title: string; count?: number; children: React.ReactNode; tone?: "red" }) {
  return (
    <section className={`card p-4 ${tone === "red" ? "border-red-200" : ""}`}>
      <h2 className="mb-2 flex items-center justify-between text-sm font-semibold text-brand-900">
        {title}
        {count !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs ${tone === "red" && count ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{count}</span>}
      </h2>
      {children}
    </section>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-slate-500">{children}</p>;

export default async function ResumoDia() {
  const actor = await requireActor();
  const now = new Date();
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const dayStart = localDateTimeToInstant(today, "00:00", APP_TIMEZONE);
  const dayEnd = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const mine = buildTaskWhere(actor, { assigneeId: actor.userId });
  const range = { gte: dayStart, lt: dayEnd };

  const [goal, focus, done, overdue, stillOpen, pendings, resolvedToday, notes, comments, entries, agenda, g] = await Promise.all([
    dayGoal(actor, now),
    focusStats(actor, now),
    prisma.task.findMany({ where: { AND: [mine, { status: "CONCLUIDA", completedAt: range }] }, select: { id: true, title: true, completedAt: true, client: { select: { tradeName: true } } }, orderBy: { completedAt: "asc" } }),
    prisma.task.findMany({ where: { AND: [mine, { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: startOfToday(now) } }] }, select: { id: true, title: true, dueAt: true, client: { select: { tradeName: true } } }, orderBy: { dueAt: "asc" }, take: 30 }),
    prisma.task.findMany({ where: { AND: [mine, { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { gte: startOfToday(now), lt: dayEnd } }] }, select: { id: true, title: true, client: { select: { tradeName: true } } }, take: 30 }),
    prisma.pending.findMany({ where: { organizationId: actor.organizationId, resolvedAt: null, client: clientScope(actor) }, select: { id: true, reason: true, followUpAt: true, respondent: true, client: { select: { id: true, tradeName: true } } }, orderBy: { followUpAt: "asc" }, take: 20 }),
    prisma.pending.count({ where: { organizationId: actor.organizationId, resolvedAt: range, client: clientScope(actor) } }),
    prisma.clientNote.findMany({ where: { organizationId: actor.organizationId, createdAt: range, client: clientScope(actor) }, select: { id: true, title: true, kind: true, tone: true, clientId: true, client: { select: { tradeName: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.comment.findMany({ where: { authorId: actor.userId, createdAt: range, task: buildTaskWhere(actor, {}) }, select: { id: true, body: true, taskId: true, task: { select: { title: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.timeEntry.findMany({ where: { userId: actor.userId, workedOn: new Date(`${today}T00:00:00Z`) }, select: { minutes: true, client: { select: { tradeName: true } } } }),
    agendaMonth(actor, today.slice(0, 7)),
    googleEvents(actor, today, addDays(today, 1)),
  ]);
  const appts = [...agenda.events.filter((e) => e.date === today && e.kind !== "TAREFA" && e.kind !== "VENCIMENTO"), ...g.events].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
  const minutes = entries.reduce((a, e) => a + e.minutes, 0);
  const byClient = new Map<string, number>();
  for (const e of entries) byClient.set(e.client?.tradeName ?? "Interno", (byClient.get(e.client?.tradeName ?? "Interno") ?? 0) + e.minutes);
  const late = (d: Date) => Math.max(1, Math.round((startOfToday(now).getTime() - d.getTime()) / 86400000));

  return (
    <>
      <PageHeader title="Resumo do dia" description="O que você fez, o que ficou para trás, as pendências e as observações de hoje." actions={<Link href="/foco/resumo" className="btn-secondary">Resumo do foco</Link>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Concluídas hoje", String(done.length)],
          ["Tempo registrado", hm(minutes)],
          ["Focos completos", `${focus.today.n} (${hm(focus.today.min)})`],
          ["Em atraso", String(overdue.length)],
        ].map(([l, v]) => (
          <div key={l} className="card px-4 py-3"><p className="text-xs text-slate-500">{l}</p><p className="text-2xl font-semibold tabular-nums text-brand-900">{v}</p></div>
        ))}
      </div>
      <DayGoalBoard goal={goal} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="O que eu fiz hoje" count={done.length}>
          {done.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {done.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-1.5"><Link href={`/tarefas/${t.id}`} className="truncate hover:underline">✓ {t.title}</Link><span className="shrink-0 text-xs text-slate-500">{t.client?.tradeName ?? "Interna"} · {t.completedAt ? time(t.completedAt) : ""}</span></li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma tarefa concluída ainda hoje.</Empty>
          )}
          {byClient.size > 0 && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">Tempo por cliente: {[...byClient.entries()].map(([c, m]) => `${c} ${hm(m)}`).join(" · ")}</p>
          )}
        </Box>
        <Box title="Ficou em atraso" count={overdue.length} tone="red">
          {overdue.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {overdue.slice(0, 12).map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-1.5"><Link href={`/tarefas/${t.id}`} className="truncate hover:underline">{t.title}</Link><span className="shrink-0 text-xs text-red-700">{t.client?.tradeName ?? "Interna"} · {late(t.dueAt)}d</span></li>
              ))}
              {overdue.length > 12 && <li className="py-1.5 text-xs"><Link href="/tarefas?atrasadas=1" className="text-brand-700 hover:underline">Ver as outras {overdue.length - 12} →</Link></li>}
            </ul>
          ) : (
            <Empty>Nada atrasado. 🎉</Empty>
          )}
        </Box>
        <Box title="Ainda abertas de hoje" count={stillOpen.length}>
          {stillOpen.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {stillOpen.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-1.5"><Link href={`/tarefas/${t.id}`} className="truncate hover:underline">{t.title}</Link><span className="shrink-0 text-xs text-slate-500">{t.client?.tradeName ?? "Interna"}</span></li>
              ))}
            </ul>
          ) : (
            <Empty>Tudo de hoje foi feito.</Empty>
          )}
        </Box>
        <Box title="Pendências com clientes" count={pendings.length}>
          {pendings.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {pendings.map((p) => {
                const due = p.followUpAt <= new Date(`${today}T00:00:00Z`);
                return (
                  <li key={p.id} className="py-1.5">
                    <Link href={`/clientes/${p.client.id}?aba=pendencias`} className="block truncate hover:underline">{p.reason}</Link>
                    <span className={`text-xs ${due ? "text-red-700" : "text-slate-500"}`}>{p.client.tradeName}{p.respondent ? ` · ${p.respondent}` : ""} · {due ? "cobrar hoje ou antes" : `cobrar em ${p.followUpAt.toISOString().slice(8, 10)}/${p.followUpAt.toISOString().slice(5, 7)}`}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Nenhuma pendência aberta.</Empty>
          )}
          {resolvedToday > 0 && <p className="mt-2 text-xs text-emerald-700">{resolvedToday} resolvida{resolvedToday === 1 ? "" : "s"} hoje.</p>}
        </Box>
        <Box title="Observações e comentários de hoje" count={notes.length + comments.length}>
          {notes.length + comments.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {notes.map((n) => (
                <li key={n.id} className="py-1.5"><Link href={`/clientes/${n.clientId}?aba=${n.kind === "ATA" ? "atas" : "pops"}`} className="block truncate hover:underline">{n.kind === "ATA" ? "Ata" : "Observação"}: {n.title}</Link><span className="text-xs text-slate-500">{n.client.tradeName}</span></li>
              ))}
              {comments.map((c) => (
                <li key={c.id} className="py-1.5"><Link href={`/tarefas/${c.taskId}`} className="block truncate hover:underline">{c.body}</Link><span className="text-xs text-slate-500">em {c.task.title}</span></li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma observação registrada hoje. Anote o que combinou com o cliente.</Empty>
          )}
        </Box>
        <Box title="Compromissos de hoje" count={appts.length}>
          {appts.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {appts.map((e, i) => (
                <li key={i} className="flex gap-3 py-1.5"><span className="w-20 shrink-0 text-xs font-semibold text-brand-700 tabular-nums">{e.time ? `${e.time}${e.endTime ? `–${e.endTime}` : ""}` : "Dia todo"}</span><span className="truncate">{e.label}</span></li>
              ))}
            </ul>
          ) : (
            <Empty>Nada marcado para hoje.</Empty>
          )}
        </Box>
      </div>
    </>
  );
}

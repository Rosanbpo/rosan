import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { addDays, instantToLocalDate, localDateTimeToInstant } from "@/domain/dates";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { dayOverview } from "@/server/services/tasks";

export const metadata = { title: "Hoje" };

export default async function TodayPage() {
  const actor = await requireActor();
  const now = new Date();
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const start = localDateTimeToInstant(today, "00:00", APP_TIMEZONE);
  const end = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const rows = await dayOverview(actor, start, end);
  const todayTotal = rows.reduce((n, r) => n + r.today, 0);
  const lateTotal = rows.reduce((n, r) => n + r.late, 0);
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIMEZONE }).format(now);

  return (
    <>
      <PageHeader
        title="Hoje"
        description={`${label} · ${todayTotal} para hoje${lateTotal ? ` · ${lateTotal} atrasadas` : ""}. Escolha um cliente, faça as tarefas do dia e passe para o próximo.`}
      />
      {rows.length === 0 ? (
        <EmptyState title="Nada pendente para hoje" description="Não há tarefas abertas com prazo até hoje." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const href = r.clientId ? `/clientes/${r.clientId}?aba=hoje` : "/avulsas";
            return (
              <li key={r.clientId ?? "avulsas"}>
                <Link
                  href={href}
                  className={cx(
                    "card group flex items-center gap-3 p-4 transition-colors hover:border-brand-700",
                    !r.clientId && "border-brand-200 bg-brand-50/50",
                  )}
                >
                  <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold", r.clientId ? "bg-brand-50 text-brand-700" : "bg-brand-100 text-brand-900")}>
                    {r.clientId ? r.name.slice(0, 2).toUpperCase() : <Inbox aria-hidden className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-brand-900">{r.clientId ? r.name : "Avulsas"}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                      {r.today > 0 && <span className="font-medium text-amber-700">{r.today} hoje</span>}
                      {r.late > 0 && <span className="font-medium text-red-700">{r.late} atrasadas</span>}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="h-4 w-4 text-slate-300 group-hover:text-brand-700" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

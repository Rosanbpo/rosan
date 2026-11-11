import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cx } from "@/lib/ui";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <Link href={breadcrumb.href} className="text-sm text-brand-700 hover:underline">
            ← {breadcrumb.label}
          </Link>
        )}
        <h1 className="page-title mt-1">{title}</h1>
        <span aria-hidden className="mt-2 block h-0.5 w-10 rounded bg-brand-500" />
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("card", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            {title && <h2 className="text-[13px] font-semibold tracking-wide text-brand-900 uppercase">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <Inbox aria-hidden className="h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-medium text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pagination({
  total,
  page,
  pageSize,
  searchParams,
  basePath,
}: {
  total: number;
  page: number;
  pageSize: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  };
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3 px-1 py-3 text-sm text-slate-600">
      <span>
        {total === 0 ? "Nenhum registro" : `${first}–${last} de ${total}`}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn-secondary btn-sm" href={href(page - 1)}>
            Anterior
          </Link>
        ) : (
          <span className="btn-secondary btn-sm pointer-events-none opacity-50" aria-disabled>
            Anterior
          </span>
        )}
        <span className="px-1 py-1 text-xs">
          Página {page} de {pages}
        </span>
        {page < pages ? (
          <Link className="btn-secondary btn-sm" href={href(page + 1)}>
            Próxima
          </Link>
        ) : (
          <span className="btn-secondary btn-sm pointer-events-none opacity-50" aria-disabled>
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "danger" | "warning" | "info" | "success";
  href?: string;
}) {
  const tones = {
    default: "text-slate-900",
    danger: "text-red-700",
    warning: "text-amber-700",
    info: "text-violet-700",
    success: "text-emerald-700",
  };
  const body = (
    <>
      <p className="text-[11px] font-semibold tracking-wider text-brand-900/60 uppercase">{label}</p>
      <p className={cx("mt-1.5 text-[1.65rem] leading-none font-semibold tabular-nums", tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card block border-t-2 border-t-brand-500 p-4 transition-shadow hover:shadow-md">
      {body}
    </Link>
  ) : (
    <div className="card border-t-2 border-t-brand-500 p-4">{body}</div>
  );
}

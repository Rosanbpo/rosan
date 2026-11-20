import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cx } from "@/lib/ui";

const TITLE_EMOJI: Record<string, string> = {
  "Avulsas": "📥", "CRM comercial": "🎯", "Carteira e rentabilidade": "📈", "Central operacional": "🛰️", "Clientes": "🏢", "Cofre": "🔐",
  "Configurações": "⚙️", "Contratos": "✍️", "Custo por hora e planos": "🧮", "Cópia dos dados": "💾", "Documentos dos clientes": "📄",
  "Equipe": "👥", "Esteiras": "🚀", "Implantação de cliente novo": "🚀", "Importar clientes": "📤", "Minha conta": "🙋",
  "Modelos e recorrências": "🔁", "Painel do gestor": "📊", "Painel executivo": "🧭", "Pendências externas": "⏳",
  "Precificação consultiva": "🧭", "Processos e POPs": "📚", "Projetos": "🗂️", "Propostas": "📑", "Relatórios": "📊", "Tarefas": "✅",
};

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
    <div className="mb-7 flex flex-col gap-3 border-b border-hair pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <Link href={breadcrumb.href} className="text-sm text-brand-700 hover:underline">
            ← {breadcrumb.label}
          </Link>
        )}
        <h1 className="page-title mt-1">{typeof title === "string" && TITLE_EMOJI[title] ? <span aria-hidden className="mr-2">{TITLE_EMOJI[title]}</span> : null}{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
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
        <header className="flex items-start justify-between gap-3 border-b border-hair px-5 py-3.5">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-brand-900">{title}</h2>}
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d3dae5] bg-white px-6 py-10 text-center">
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
  const t = {
    default: { value: "text-brand-900", bar: "bg-brand-500", bg: "from-brand-50/70" },
    danger: { value: "text-red-700", bar: "bg-red-500", bg: "from-red-50/70" },
    warning: { value: "text-amber-700", bar: "bg-amber-500", bg: "from-amber-50/70" },
    info: { value: "text-violet-700", bar: "bg-violet-500", bg: "from-violet-50/70" },
    success: { value: "text-emerald-700", bar: "bg-emerald-500", bg: "from-emerald-50/70" },
  }[tone];
  const body = (
    <>
      <span aria-hidden className={cx("absolute inset-y-3 left-0 w-1 rounded-r", t.bar)} />
      <p className="text-[13px] font-medium text-slate-600">{label}</p>
      <p className={cx("mt-2 text-[1.85rem] leading-none font-semibold tabular-nums", t.value)}>{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = cx("card relative block overflow-hidden bg-gradient-to-br to-white to-60% p-4 pl-5", t.bg);
  return href ? (
    <Link href={href} className={cx(cls, "transition-colors hover:border-brand-500")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

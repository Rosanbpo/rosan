"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Calculator,
  FileText,
  FileSignature,
  FileCheck2,
  Workflow,
  FolderKanban,
  Hourglass,
  LineChart,
  Menu,
  Repeat,
  Settings,
  Target,
  UserCircle,
  X,
} from "lucide-react";
import { cx } from "@/lib/ui";

/** Cor de cada ícone do menu (identidade Rosan + toques de cor para leitura rápida). */
const ICON_COLOR: Record<keyof typeof ICONS, string> = {
  painel: "bg-sky-500/20 text-sky-300",
  operacao: "bg-emerald-500/20 text-emerald-300",
  tarefas: "bg-emerald-500/20 text-emerald-300",
  pendencias: "bg-orange-500/20 text-orange-300",
  documentos: "bg-teal-500/20 text-teal-300",
  clientes: "bg-brand-500/25 text-brand-200",
  carteira: "bg-brand-500/25 text-brand-200",
  crm: "bg-sky-500/20 text-sky-300",
  propostas: "bg-sky-500/20 text-sky-300",
  contratos: "bg-sky-500/20 text-sky-300",
  precificacao: "bg-sky-500/20 text-sky-300",
  projetos: "bg-violet-500/20 text-violet-300",
  esteiras: "bg-violet-500/20 text-violet-300",
  pops: "bg-amber-500/20 text-amber-300",
  rotinas: "bg-violet-500/20 text-violet-300",
  config: "bg-slate-500/25 text-slate-300",
  conta: "bg-slate-500/25 text-slate-300",
};

const ICONS = {
  painel: BarChart3,
  operacao: CalendarClock,
  tarefas: ClipboardList,
  pendencias: Hourglass,
  clientes: Briefcase,
  rotinas: Repeat,
  config: Settings,
  conta: UserCircle,
  carteira: LineChart,
  crm: Target,
  pops: BookOpen,
  projetos: FolderKanban,
  propostas: FileText,
  precificacao: Calculator,
  contratos: FileSignature,
  documentos: FileCheck2,
  esteiras: Workflow,
};

export interface NavItem {
  group?: string;
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
}

export function Sidebar({
  items,
  appName,
  orgName: _orgName,
  userName,
  roleLabel,
  footer,
}: {
  items: NavItem[];
  appName: string;
  orgName: string;
  userName: string;
  roleLabel: string;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-0.5 px-3">
      {items.map((item, idx) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const heading = item.group && item.group !== items[idx - 1]?.group ? item.group : null;
        return (
          <div key={item.href} className="flex flex-col">
            {heading && <p className="mt-3 mb-1 px-3 text-[10px] font-semibold tracking-[0.18em] text-brand-200/60 uppercase">{heading}</p>}
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white shadow-[inset_3px_0_0_#b08d57]" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", ICON_COLOR[item.icon])}>
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700" aria-label={`${item.badge} itens`}>
                  {item.badge}
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex flex-col items-center px-6 pt-5 pb-3">
      <Image src="/logo.png" alt={appName} width={620} height={530} priority className="h-auto w-36" />
      <p className="mt-1 truncate text-[11px] tracking-[0.2em] text-brand-200/80 uppercase">Escritório virtual</p>
    </div>
  );

  const user = (
    <div className="border-t border-white/10 px-6 py-4">
      <p className="truncate text-sm font-medium text-white">{userName}</p>
      <p className="text-xs text-slate-400">{roleLabel}</p>
      <div className="mt-2">{footer}</div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-900 px-4 py-3 text-white lg:hidden">
        <span className="text-sm font-semibold tracking-wide text-brand-200">{appName}</span>
        <button
          type="button"
          className="btn text-slate-200 hover:bg-white/10"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" id="mobile-menu">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-brand-900 shadow-xl">
            <div className="flex items-start justify-between pr-3">
              {brand}
              <button type="button" className="btn mt-3 text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {user}
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto bg-brand-900 lg:flex">
        {brand}
        {nav}
        {user}
      </aside>
    </>
  );
}

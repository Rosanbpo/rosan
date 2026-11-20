"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Home,
  Inbox,
  Users,
  KeyRound,
  BookOpen,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Calculator,
  FileText,
  FileSignature,
  FileCheck2,
  Workflow,
  Radar,
  Gauge,
  FolderKanban,
  Hourglass,
  LineChart,
  UserMinus,
  CalendarDays,
  Flag,
  SlidersHorizontal,
  Menu,
  Repeat,
  Settings,
  Target,
  UserCircle,
  X,
} from "lucide-react";
import { cx } from "@/lib/ui";

const ICONS = {
  painel: BarChart3,
  inicio: Home,
  avulsas: Inbox,
  equipe: Users,
  cofre: KeyRound,
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
  central: Radar,
  executivo: Gauge,
  relatorios: BarChart3,
  churn: UserMinus,
  agenda: CalendarDays,
  metas: Flag,
  simulador: SlidersHorizontal,
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
    <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-px px-3 pb-4">
      {items.map((item, idx) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const heading = item.group && item.group !== items[idx - 1]?.group ? item.group : null;
        return (
          <div key={item.href} className="flex flex-col">
            {heading && <p className="mt-4 mb-1 px-3 text-[10.5px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{heading}</p>}
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "group relative flex items-center gap-3 rounded-md px-3 py-[7px] text-[13.5px] transition-colors",
                active ? "bg-white/10 font-medium text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-sky-400" : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <Icon aria-hidden className={cx("h-[17px] w-[17px] shrink-0", active ? "text-sky-300" : "text-slate-500 group-hover:text-slate-300")} strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-red-500/90 px-1.5 text-xs font-medium text-white" aria-label={`${item.badge} itens`}>
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
    <div className="flex flex-col items-center px-6 pt-4 pb-3">
      <Image src="/logo.png" alt={appName} width={620} height={530} priority className="h-auto w-28" />
      <p className="mt-1 truncate text-xs text-brand-200/70">Escritório virtual</p>
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

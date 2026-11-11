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
};

export interface NavItem {
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
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-white/10 text-brand-200" : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon aria-hidden className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700" aria-label={`${item.badge} itens`}>
                {item.badge}
              </span>
            )}
          </Link>
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

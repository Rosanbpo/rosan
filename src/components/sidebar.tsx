"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Hourglass,
  Menu,
  Repeat,
  Settings,
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
  orgName,
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
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
    <div className="flex items-center gap-2 px-6 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        {appName.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{appName}</p>
        <p className="truncate text-xs text-slate-500">{orgName}</p>
      </div>
    </div>
  );

  const user = (
    <div className="border-t border-slate-200 px-6 py-4">
      <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
      <p className="text-xs text-slate-500">{roleLabel}</p>
      <div className="mt-2">{footer}</div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold">{appName}</span>
        <button
          type="button"
          className="btn-ghost"
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
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {user}
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {brand}
        {nav}
        {user}
      </aside>
    </>
  );
}

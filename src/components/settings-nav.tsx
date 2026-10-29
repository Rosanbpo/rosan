import Link from "next/link";
import { cx } from "@/lib/ui";

const TABS = [
  { href: "/configuracoes", label: "Empresa e agendador" },
  { href: "/configuracoes/usuarios", label: "Usuários" },
  { href: "/configuracoes/feriados", label: "Feriados" },
];

export function SettingsNav({ current }: { current: string }) {
  return (
    <nav aria-label="Configurações" className="mb-6 flex gap-1 border-b border-slate-200">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={current === t.href ? "page" : undefined}
          className={cx(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            current === t.href ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

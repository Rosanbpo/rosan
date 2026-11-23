import Link from "next/link";
import { cx } from "@/lib/ui";

const TABS = [
  { href: "/marketing", label: "Conteúdos", key: "conteudos" },
  { href: "/marketing/calendario", label: "Calendário", key: "calendario" },
  { href: "/marketing/stories", label: "Stories", key: "stories" },
  { href: "/marketing/plano", label: "Plano do Instagram", key: "plano" },
  { href: "/marketing/identidade", label: "Identidade visual", key: "identidade" },
] as const;

export function MarketingTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Seções do Marketing" className="mb-5 flex flex-wrap gap-1 border-b border-[#d3dae5]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cx("-mb-px border-b-2 px-3.5 py-2 text-[13px] font-medium", active === t.key ? "border-brand-900 text-brand-900" : "border-transparent text-slate-600 hover:text-brand-900")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

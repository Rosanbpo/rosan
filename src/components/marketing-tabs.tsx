import Link from "next/link";
import { CalendarDays, Layers, Palette, Smartphone, Target } from "lucide-react";
import { cx } from "@/lib/ui";

const TABS = [
  { href: "/marketing", label: "Conteúdos", key: "conteudos", Icon: Layers },
  { href: "/marketing/calendario", label: "Calendário", key: "calendario", Icon: CalendarDays },
  { href: "/marketing/stories", label: "Stories", key: "stories", Icon: Smartphone },
  { href: "/marketing/plano", label: "Plano do Instagram", key: "plano", Icon: Target },
  { href: "/marketing/identidade", label: "Identidade visual", key: "identidade", Icon: Palette },
] as const;

export function MarketingTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Seções do Marketing" className="mb-5 flex flex-wrap gap-1.5 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-[#d3dae5]">
      {TABS.map(({ href, label, key, Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={cx("flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors", active === key ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-brand-900")}
        >
          <Icon aria-hidden className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}

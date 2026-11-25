"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/ui";

export interface SectionDef {
  tabs: { href: string; label: string }[];
}

export function SectionTabs({ sections }: { sections: SectionDef[] }) {
  const pathname = usePathname();
  const section = sections.find((s) => s.tabs.some((t) => t.href === pathname));
  if (!section || section.tabs.length < 2) return null;
  return (
    <nav aria-label="Seções desta área" className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
      {section.tabs.map((t) => {
        const active = t.href === pathname;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx("-mb-px border-b-2 px-3.5 py-2 text-[13px] font-medium transition-colors", active ? "border-brand-900 text-brand-900" : "border-transparent text-slate-500 hover:text-brand-900")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

/** Campo de busca que esconde, na própria lista, os itens que não combinam com o texto. */
export function ListFilter({ placeholder, children }: { placeholder: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onInput = (q: string) => {
    const t = q.trim().toLowerCase();
    ref.current?.querySelectorAll<HTMLElement>("[data-item]").forEach((el) => {
      el.hidden = !!t && !(el.textContent ?? "").toLowerCase().includes(t);
    });
  };
  return (
    <>
      <label className="relative block min-w-0 flex-1">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" placeholder={placeholder} aria-label={placeholder} className="input pl-9" onChange={(e) => onInput(e.target.value)} />
      </label>
      <div ref={ref} className="basis-full">
        {children}
      </div>
    </>
  );
}

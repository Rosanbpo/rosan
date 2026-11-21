"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Janela (pop-up) sobre a página atual; fechar volta para onde a pessoa estava. */
export function ModalShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && router.back()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-4 flex items-center justify-between bg-white px-6 py-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <button type="button" onClick={() => router.back()} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

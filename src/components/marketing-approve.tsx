"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { approveAllAction, importCalendarAction, setApprovedAction } from "@/app/actions/marketing";

export function ApproveToggle({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={approved}
      className={approved ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" : "inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-700"}
      onClick={() =>
        start(async () => {
          await setApprovedAction(id, !approved);
          router.refresh();
        })
      }
    >
      {approved && <Check aria-hidden className="h-3.5 w-3.5" />} {approved ? "Aprovado" : "Aprovar"}
    </button>
  );
}

export function CalendarButtons({ empty }: { empty: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={empty ? "btn-primary" : "btn-secondary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await importCalendarAction();
            router.refresh();
          })
        }
      >
        {empty ? "Carregar calendário de 24/11 a 24/12" : "Atualizar calendário"}
      </button>
      {!empty && (
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await approveAllAction();
              router.refresh();
            })
          }
        >
          Aprovar tudo
        </button>
      )}
    </div>
  );
}

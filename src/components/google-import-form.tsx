"use client";

import { useActionState } from "react";
import { saveImportAction } from "@/app/actions/agenda";

export function GoogleImportForm() {
  const [state, action, pending] = useActionState(saveImportAction, undefined);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-start gap-2">
      <input name="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" className="input min-w-0 flex-1 text-xs" aria-label="Endereço secreto no formato iCal" />
      <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Conectando…" : "Conectar"}</button>
      {state?.error && <p role="alert" className="w-full text-xs text-red-700">{state.error}</p>}
    </form>
  );
}

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div role="status" className="flex items-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}

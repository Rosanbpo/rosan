"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, RefreshCw, Send } from "lucide-react";
import { cancelSwapAction, requestSwapAction, setApprovedAction, setScheduleAction } from "@/app/actions/marketing";
import { CopyCaption, DownloadAll } from "@/components/marketing-tools";

interface Props {
  id: string;
  format: string;
  approved: boolean;
  swapRequested: boolean;
  swapReason: string;
  publishTime: string;
  scheduled: boolean;
  published: boolean;
  slideCount: number;
  copy: string;
  dateLabel: string;
}

export function ItemActions(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<null | "swap" | "schedule">(null);
  const [reason, setReason] = useState("");
  const [time, setTime] = useState(p.publishTime);
  const [error, setError] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string } | null | undefined>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r && !r.ok) setError(r.error ?? "Não foi possível concluir.");
      else {
        setError("");
        after?.();
      }
      router.refresh();
    });
  const canSchedule = p.approved && (p.format === "REEL" || p.slideCount > 0);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          aria-pressed={p.approved}
          className={p.approved ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" : "inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-700"}
          onClick={() => run(() => setApprovedAction(p.id, !p.approved))}
        >
          {p.approved && <Check aria-hidden className="h-3.5 w-3.5" />} {p.approved ? "Aprovado" : "Aprovar"}
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-700" onClick={() => setPanel(panel === "swap" ? null : "swap")}>
          <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Trocar tema
        </button>
        <button
          type="button"
          disabled={!canSchedule}
          title={canSchedule ? undefined : "Aprove o conteúdo e deixe a arte pronta para programar."}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 enabled:hover:border-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setPanel(panel === "schedule" ? null : "schedule")}
        >
          <Send aria-hidden className="h-3.5 w-3.5" /> {p.published ? "Publicado" : p.scheduled ? `Programado ${p.publishTime}` : "Programar"}
        </button>
      </div>

      {p.swapRequested && panel !== "swap" && (
        <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>
            <strong>Troca pedida:</strong> {p.swapReason}. Aguardando novas sugestões.
          </span>
          <button type="button" className="font-semibold underline" onClick={() => run(() => cancelSwapAction(p.id))}>
            Cancelar pedido
          </button>
        </p>
      )}

      {panel === "swap" && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
          <label className="block text-xs font-medium text-slate-800" htmlFor={`swap-${p.id}`}>
            Por que quer trocar? (ex.: já falei disso, não é a minha cara)
          </label>
          <textarea id={`swap-${p.id}`} className="input" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={pending}
              onClick={() =>
                run(() => requestSwapAction(p.id, reason), () => {
                  setPanel(null);
                  setReason("");
                })
              }
            >
              Pedir outro tema
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setPanel(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {panel === "schedule" && (
        <div className="mt-2 space-y-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
          <p>
            Programe para <strong>{p.dateLabel}</strong>. Seus seguidores ficam mais ativos entre 6h e 15h (picos às 6h e às 12h).
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block font-medium">Horário</span>
              <input type="time" className="input w-32" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            {p.format !== "REEL" && <DownloadAll id={p.id} count={p.slideCount} />}
            <CopyCaption text={p.copy} />
            <a className="btn-secondary btn-sm" href="https://business.facebook.com/latest/" target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden className="h-4 w-4" /> Abrir Meta Business Suite
            </a>
          </div>
          <ol className="list-decimal space-y-0.5 pl-5 text-slate-700">
            <li>{p.format === "REEL" ? "Grave e edite o reel no celular." : "Baixe os slides e copie a legenda."}</li>
            <li>No Meta Business Suite, crie a publicação, anexe o material, cole a legenda e escolha a data e o horário.</li>
            <li>Volte aqui e marque como programado.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" disabled={pending} onClick={() => run(() => setScheduleAction(p.id, time, "scheduled"), () => setPanel(null))}>
              Marcar como programado
            </button>
            <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => run(() => setScheduleAction(p.id, time, "published"), () => setPanel(null))}>
              Marcar como publicado
            </button>
            {p.scheduled && (
              <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => run(() => setScheduleAction(p.id, time, "none"), () => setPanel(null))}>
                Remover programação
              </button>
            )}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

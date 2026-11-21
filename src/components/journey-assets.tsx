import { ASSET_EMOJI, ASSET_LABEL, type AssetKind } from "@/domain/journey-assets";
import { fillMessage } from "@/domain/crm-messages";
import { parseScript, SCRIPT_TITLE } from "@/domain/diagnosis-script";
import Link from "next/link";
import { CopyButton } from "./copy-button";

export interface AssetLike { id: string; kind: string; title: string; subject: string | null; body: string | null; url: string | null }

/** Mensagem, e-mail e documento padrão de uma tarefa, prontos para copiar sem sair da tela. */
/** Roteiro da reunião de diagnóstico, lido por partes (as falas e perguntas na ordem). */
export function ScriptPreview({ body }: { body: string }) {
  const sc = parseScript(body);
  return (
    <div className="space-y-3">
      {sc.heading && <p className="text-xs text-slate-500">{sc.heading}</p>}
      {sc.sections.map((sec) => (
        <div key={sec.id}>
          <p className="text-sm font-semibold text-brand-900">{sec.title}{sec.minutes != null && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">⏱️ {sec.minutes} min</span>}</p>
          <ul className="mt-1 space-y-1">
            {sec.items.map((i) => <li key={i.id} className="text-sm text-slate-700"><b className="text-brand-800">{i.label}:</b> {i.text}</li>)}
          </ul>
        </div>
      ))}
      {sc.footer && <p className="rounded-lg bg-white p-2 text-xs text-slate-600">💡 {sc.footer}</p>}
    </div>
  );
}

export function JourneyAssets({ assets, vars, scriptHref }: { assets: AssetLike[]; vars: Record<string, string>; scriptHref?: string }) {
  if (assets.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {assets.map((a) => {
        const kind = a.kind as AssetKind;
        if (a.title === SCRIPT_TITLE && a.body) {
          return (
            <div key={a.id} className="rounded-lg border border-brand-200 bg-white p-2.5">
              <p className="text-sm font-semibold text-brand-900">🎙️ {a.title}</p>
              <p className="text-xs text-slate-500">Falas e perguntas (SPIN) em 7 partes, com no máximo 45 minutos.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {scriptHref && <Link href={scriptHref} className="btn-primary btn-sm">🎙️ Abrir roteiro com checklist e anotações</Link>}
              </div>
              <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-brand-700">Ler o roteiro aqui</summary><div className="mt-2"><ScriptPreview body={a.body} /></div></details>
            </div>
          );
        }
        const body = a.body ? fillMessage(a.body, vars) : "";
        const subject = a.subject ? fillMessage(a.subject, vars) : "";
        return (
          <details key={a.id} className="rounded-lg border border-hair bg-white">
            <summary className="cursor-pointer px-2.5 py-1 text-xs font-medium text-brand-800">
              {ASSET_EMOJI[kind]} {ASSET_LABEL[kind]}: {a.title}
            </summary>
            <div className="space-y-2 border-t border-hair p-2.5">
              {subject && <p className="text-xs text-slate-500">Assunto: <b className="text-slate-700">{subject}</b></p>}
              {body && <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-sans text-sm text-slate-700">{body}</pre>}
              <div className="flex flex-wrap gap-2">
                {body && <CopyButton text={body} label={kind === "EMAIL" ? "Copiar e-mail" : kind === "DOCUMENTO" ? "Copiar documento" : "Copiar mensagem"} />}
                {subject && <CopyButton text={subject} label="Copiar assunto" />}
                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">Abrir link ↗</a>}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

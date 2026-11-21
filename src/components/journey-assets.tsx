import { ASSET_EMOJI, ASSET_LABEL, type AssetKind } from "@/domain/journey-assets";
import { fillMessage } from "@/domain/crm-messages";
import { CopyButton } from "./copy-button";

export interface AssetLike { id: string; kind: string; title: string; subject: string | null; body: string | null; url: string | null }

/** Mensagem, e-mail e documento padrão de uma tarefa, prontos para copiar sem sair da tela. */
export function JourneyAssets({ assets, vars }: { assets: AssetLike[]; vars: Record<string, string> }) {
  if (assets.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {assets.map((a) => {
        const kind = a.kind as AssetKind;
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

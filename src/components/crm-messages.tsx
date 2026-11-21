"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { createMessageTemplateAction, deleteMessageTemplateAction } from "@/app/actions/crm";
import { LEAD_STAGES, LEAD_STAGE_LABEL, type LeadStage } from "@/domain/enums";
import { MESSAGE_VARS, SYSTEM_MESSAGES, fillMessage, type MessageTemplate } from "@/domain/crm-messages";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface MsgLead {
  id: string;
  stage: LeadStage;
  name: string;
  company: string;
  phone: string | null;
  value: string;
}
export interface Mine {
  id: string;
  title: string;
  stage: string | null;
  body: string;
}
interface Ctx {
  me: string;
  org: string;
  mine: Mine[];
}

const EVENT = "crm-message";
const wa = (phone: string | null, text: string) => {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}?text=${encodeURIComponent(text)}`;
};

/** Botão "💬 Mensagem" de cada lead: abre a janela de mensagens padrão. */
export function MessageButton({ lead, className }: { lead: MsgLead; className?: string }) {
  return (
    <button type="button" className={className ?? "btn-secondary btn-sm"} onClick={() => window.dispatchEvent(new CustomEvent(EVENT, { detail: lead }))}>
      <MessageCircle aria-hidden className="h-3.5 w-3.5" /> Mensagem
    </button>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Janela única da página: escolhe a mensagem, preenche as variáveis do lead, copia ou abre o WhatsApp. */
export function MessageDialog({ me, org, mine, system = SYSTEM_MESSAGES }: Ctx & { system?: MessageTemplate[] }) {
  const [lead, setLead] = useState<MsgLead | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      setLead((e as CustomEvent<MsgLead>).detail);
      setPicked(null);
      setText("");
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  if (!lead) return null;

  const vars = { nome: lead.name, empresa: lead.company, segmento: "seu segmento", valor: lead.value, minhaNome: me, minhaEmpresa: org };
  const all: Array<MessageTemplate | (Mine & { group: string; stages: LeadStage[] })> = [
    ...mine.map((m) => ({ ...m, group: "Meus templates", stages: m.stage ? [m.stage as LeadStage] : [] })),
    ...system,
  ];
  const mostRelevant = all.filter((m) => m.stages.length === 0 || m.stages.includes(lead.stage));
  const rest = all.filter((m) => !mostRelevant.includes(m));
  const choose = (m: { id: string; body: string }) => {
    setPicked(m.id);
    setText(fillMessage(m.body, vars));
    setCopied(false);
  };
  const link = wa(lead.phone, text);
  const list = (items: typeof all) => (
    <ul className="space-y-1.5">
      {items.map((m) => (
        <li key={m.id}>
          <button type="button" onClick={() => choose(m)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm hover:border-brand-500 ${picked === m.id ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
            <span className="font-medium text-slate-900">{m.title}</span> <span className="text-xs text-slate-500">· {m.group}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Overlay title={`💬 Mensagem para ${lead.company}`} onClose={() => setLead(null)}>
      {picked ? (
        <div className="space-y-3">
          <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setPicked(null)}>← Escolher outra mensagem</button>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="input" aria-label="Texto da mensagem" />
          {/\{\w+\}/.test(text) && <p className="text-xs text-amber-700">Ainda há variáveis sem preencher, como {text.match(/\{\w+\}/)![0]}. Ajuste antes de enviar.</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await navigator.clipboard.writeText(text).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />} {copied ? "Copiado" : "Copiar"}
            </button>
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn-secondary">💬 Abrir no WhatsApp</a>
            ) : (
              <span className="self-center text-xs text-slate-500">Cadastre o telefone do lead para abrir direto no WhatsApp.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Para esta etapa ({LEAD_STAGE_LABEL[lead.stage]})</p>
            {list(mostRelevant)}
          </div>
          {rest.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-brand-700">Todas as mensagens ({rest.length})</summary>
              <div className="mt-2">{list(rest)}</div>
            </details>
          )}
        </div>
      )}
    </Overlay>
  );
}

/** Botão "Meus templates": cria e remove mensagens próprias e mostra as prontas do sistema. */
export function TemplatesButton({ mine, system = SYSTEM_MESSAGES }: { mine: Mine[]; system?: MessageTemplate[] }) {
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(system.map((m) => m.group)));
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden className="h-4 w-4" /> Meus templates
      </button>
      {open && (
        <Overlay title="✏️ Meus templates de mensagem" onClose={() => setOpen(false)}>
          <ActionForm action={createMessageTemplateAction} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" resetOnSuccess>
            <p className="text-sm font-semibold">+ Novo template</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título" name="title" required>
                <input id="title" name="title" required className="input" placeholder="Ex.: Follow-up após reunião" />
              </Field>
              <Field label="Etapa (opcional)" name="stage">
                <select id="stage" name="stage" className="input" defaultValue="">
                  <option value="">Todas as etapas</option>
                  {LEAD_STAGES.map((s) => (
                    <option key={s} value={s}>{LEAD_STAGE_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Texto" name="body" required hint={`Variáveis: ${MESSAGE_VARS.join(" ")}`}>
              <textarea id="body" name="body" required rows={5} className="input" placeholder="Olá, {nome}! Tudo bem?…" />
            </Field>
            <SubmitButton>Criar template</SubmitButton>
          </ActionForm>
          <h3 className="mb-2 text-sm font-semibold">✏️ Meus templates ({mine.length})</h3>
          {mine.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Nenhum template personalizado ainda. Crie o primeiro acima!</p>
          ) : (
            <ul className="mb-6 space-y-2">
              {mine.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{m.title} {m.stage && <span className="text-xs font-normal text-slate-500">· {LEAD_STAGE_LABEL[m.stage as LeadStage]}</span>}</p>
                    <p className="line-clamp-2 whitespace-pre-line text-xs text-slate-500">{m.body}</p>
                  </div>
                  <form action={deleteMessageTemplateAction.bind(null, m.id)}>
                    <button type="submit" className="icon-btn text-red-600" aria-label={`Remover ${m.title}`}><Trash2 aria-hidden className="h-4 w-4" /></button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-semibold">📍 Modelos prontos do sistema — ver lista</summary>
            <p className="mt-2 text-xs text-slate-500">Já vêm prontos (a Rosan edita o texto na Biblioteca) e aparecem junto com os seus no botão “Mensagem” de cada lead.</p>
            {groups.map((g) => (
              <div key={g} className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {system.filter((m) => m.group === g).map((m) => (
                    <li key={m.id}>{m.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        </Overlay>
      )}
    </>
  );
}

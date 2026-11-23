"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { saveBrandAction } from "@/app/actions/marketing";
import { BRAND_STYLE_INFO, BRAND_STYLES, FONTS, FONT_KEYS, type BrandSettings } from "@/domain/marketing";

const COLORS = [
  { k: "navy", label: "Azul-marinho (fundo escuro)" },
  { k: "gold", label: "Dourado (destaques)" },
  { k: "brown", label: "Marrom (detalhes)" },
  { k: "slate", label: "Azul-acinzentado (texto de apoio)" },
  { k: "bronze", label: "Bronze (linhas)" },
  { k: "sand", label: "Areia (subtítulos sobre o escuro)" },
  { k: "cream", label: "Fundo claro" },
] as const;

export function BrandForm({ initial, photoId }: { initial: BrandSettings; photoId?: string }) {
  const [v, setV] = useState(initial);
  const set = (k: keyof BrandSettings, val: string) => setV((p) => ({ ...p, [k]: val }));
  const qs = (n: number) => {
    const p = new URLSearchParams({ n: String(n), navy: v.navy, gold: v.gold, cream: v.cream, brown: v.brown, slate: v.slate, bronze: v.bronze, sand: v.sand, titleFont: v.titleFont, bodyFont: v.bodyFont, style: v.style });
    if (photoId) p.set("foto", photoId);
    return `/marketing/identidade/previa?${p}`;
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ActionForm action={saveBrandAction} className="card space-y-5 p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-900">Cores</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLORS.map((c) => (
              <label key={c.k} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 text-sm">
                <input type="color" name={c.k} value={v[c.k]} onChange={(e) => set(c.k, e.target.value)} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0" />
                <span className="flex-1">
                  {c.label}
                  <span className="block font-mono text-xs text-slate-500">{v[c.k].toUpperCase()}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fonte dos títulos" name="titleFont">
            <select name="titleFont" className="input" value={v.titleFont} onChange={(e) => set("titleFont", e.target.value)}>
              {FONT_KEYS.map((f) => (
                <option key={f} value={f}>
                  {FONTS[f].label} · {FONTS[f].note}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fonte do texto" name="bodyFont">
            <select name="bodyFont" className="input" value={v.bodyFont} onChange={(e) => set("bodyFont", e.target.value)}>
              {FONT_KEYS.map((f) => (
                <option key={f} value={f}>
                  {FONTS[f].label} · {FONTS[f].note}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-900">Estilo</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BRAND_STYLES.map((s) => (
              <label key={s} className={`cursor-pointer rounded-lg border-2 p-3 text-sm ${v.style === s ? "border-brand-900 bg-slate-50" : "border-slate-200"}`}>
                <input type="radio" name="style" value={s} checked={v.style === s} onChange={() => set("style", s)} className="sr-only" />
                <span className="block font-semibold">{BRAND_STYLE_INFO[s].label}</span>
                <span className="mt-1 block text-xs text-slate-600">{BRAND_STYLE_INFO[s].note}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Regras da marca" name="guidelines" hint="Tom de voz, o que sempre fazer, o que evitar. Eu sigo isso ao escrever os conteúdos.">
          <textarea name="guidelines" className="input" rows={5} defaultValue={initial.guidelines} placeholder="Ex.: linguagem simples, sem termos técnicos; sempre terminar com uma chamada para salvar; nunca prometer resultado." />
        </Field>
        <SubmitButton pendingText="Salvando…">Salvar identidade</SubmitButton>
      </ActionForm>
      <section aria-label="Prévia da identidade">
        <h2 className="mb-2 text-sm font-semibold text-brand-900">Prévia (muda conforme você escolhe)</h2>
        <ul className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <li key={`${n}-${qs(n)}`} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qs(n)} alt={`Exemplo de slide ${n}`} className="aspect-[4/5] w-full object-cover" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

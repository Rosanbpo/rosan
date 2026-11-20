export const NOTE_TONES = ["ATENCAO", "COMBINADO", "PREFERENCIA", "PROIBIDO", "DICA", "INFO"] as const;
export type NoteTone = (typeof NOTE_TONES)[number];

export const NOTE_TONE: Record<NoteTone, { label: string; emoji: string; card: string; chip: string; bar: string }> = {
  ATENCAO: { label: "Atenção", emoji: "⚠️", card: "border-amber-200 bg-amber-50", chip: "bg-amber-100 text-amber-900", bar: "bg-amber-400" },
  COMBINADO: { label: "Combinado", emoji: "🤝", card: "border-sky-200 bg-sky-50", chip: "bg-sky-100 text-sky-900", bar: "bg-sky-500" },
  PREFERENCIA: { label: "Preferência", emoji: "💜", card: "border-violet-200 bg-violet-50", chip: "bg-violet-100 text-violet-900", bar: "bg-violet-500" },
  PROIBIDO: { label: "Nunca fazer", emoji: "🚫", card: "border-red-200 bg-red-50", chip: "bg-red-100 text-red-900", bar: "bg-red-500" },
  DICA: { label: "Dica", emoji: "💡", card: "border-emerald-200 bg-emerald-50", chip: "bg-emerald-100 text-emerald-900", bar: "bg-emerald-500" },
  INFO: { label: "Informação", emoji: "📝", card: "border-slate-200 bg-white", chip: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
};

export const toneOf = (t: string | null | undefined): NoteTone => ((NOTE_TONES as readonly string[]).includes(t ?? "") ? (t as NoteTone) : "INFO");

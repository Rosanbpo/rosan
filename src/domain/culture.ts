export interface CultureValue {
  emoji: string;
  title: string;
  text: string;
}

/** Texto: uma linha por valor no formato "😀 | Título | descrição". */
export function valuesToText(values: CultureValue[]): string {
  return values.map((v) => `${v.emoji} | ${v.title} | ${v.text}`).join("\n");
}

export function textToValues(text: string): CultureValue[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("|").map((p) => p.trim());
      if (parts.length >= 3) return { emoji: parts[0] || "💙", title: parts[1], text: parts.slice(2).join(" | ") };
      if (parts.length === 2) return { emoji: "💙", title: parts[0], text: parts[1] };
      return { emoji: "💙", title: parts[0], text: "" };
    })
    .filter((v) => v.title)
    .slice(0, 12);
}

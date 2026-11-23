/** Central de conteúdos do Instagram: tipos, textos e leitura dos slides. */

export const PILLARS = ["EDUCATIVO", "MITOS", "BASTIDORES", "AUTORIDADE"] as const;
export type Pillar = (typeof PILLARS)[number];
export const PILLAR_LABEL: Record<Pillar, string> = {
  EDUCATIVO: "Educativo",
  MITOS: "Mitos e erros",
  BASTIDORES: "Bastidores",
  AUTORIDADE: "Autoridade",
};

export const POST_STATUSES = ["IDEIA", "PRODUCAO", "PRONTO", "PUBLICADO"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  IDEIA: "Ideias",
  PRODUCAO: "Em produção",
  PRONTO: "Prontos",
  PUBLICADO: "Publicados",
};

/** Identidade visual dos posts (cores tiradas da logo da Rosan). */
export const BRAND = {
  navy: "#0C1633",
  navySoft: "#16244A",
  gold: "#F0D5AA",
  goldDeep: "#B8935A",
  brown: "#8E744F",
  white: "#FFFFFF",
  cream: "#FBF8F3",
  ink: "#0C1633",
  muted: "#4B5675",
} as const;

export interface Slide {
  kind: "capa" | "conteudo" | "final";
  title: string;
  body: string;
}

/**
 * Lê o texto dos slides: blocos separados por uma linha com "---".
 * Primeira linha do bloco = título; o resto = texto. O primeiro bloco é a capa e o último, o encerramento.
 */
export function parseSlides(text: string): Slide[] {
  const blocks = text
    .split(/^\s*---\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((b, i) => {
    const [title = "", ...rest] = b.split("\n");
    return {
      kind: i === 0 ? "capa" : i === blocks.length - 1 && blocks.length > 2 ? "final" : "conteudo",
      title: title.trim(),
      body: rest.join("\n").trim(),
    };
  });
}

export const SLIDE_SIZE = { width: 1080, height: 1350 } as const;

/** Fontes que a dona pode escolher (os arquivos ficam em src/assets/marketing/fonts). */
export const FONTS = {
  inter: { label: "Inter", note: "Moderna e neutra", weights: [400, 600, 800] },
  montserrat: { label: "Montserrat", note: "Geométrica, firme", weights: [400, 600, 800] },
  poppins: { label: "Poppins", note: "Redonda e amigável", weights: [400, 600, 800] },
  raleway: { label: "Raleway", note: "Elegante e leve", weights: [400, 600, 800] },
  "playfair-display": { label: "Playfair Display", note: "Serifada, sofisticada", weights: [400, 600, 800] },
  lora: { label: "Lora", note: "Serifada, calorosa", weights: [400, 600, 700] },
} as const;
export type FontKey = keyof typeof FONTS;
export const FONT_KEYS = Object.keys(FONTS) as FontKey[];

export const BRAND_STYLES = ["MINIMALISTA", "CLASSICO", "MODERNO"] as const;
export type BrandStyle = (typeof BRAND_STYLES)[number];
export const BRAND_STYLE_INFO: Record<BrandStyle, { label: string; note: string }> = {
  MINIMALISTA: { label: "Minimalista", note: "Fundo liso, muito espaço e uma linha de destaque." },
  CLASSICO: { label: "Clássico", note: "Moldura fina, texto centralizado, ar de escritório." },
  MODERNO: { label: "Moderno", note: "Barra lateral colorida e título grande à esquerda." },
};

export const DEFAULT_BRAND = {
  navy: "#0C1633",
  gold: "#F0D5AA",
  cream: "#FBF8F3",
  brown: "#8E744F",
  titleFont: "inter" as FontKey,
  bodyFont: "inter" as FontKey,
  style: "MINIMALISTA" as BrandStyle,
  guidelines: "",
};
export type BrandSettings = typeof DEFAULT_BRAND;

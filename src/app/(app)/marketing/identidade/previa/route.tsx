import { BRAND_STYLES, DEFAULT_BRAND, FONT_KEYS, parseSlides, type BrandSettings } from "@/domain/marketing";
import { requireActor } from "@/server/context";
import { renderSlide } from "@/server/marketing-render";
import { getBrand, getPhoto } from "@/server/services/marketing";

export const runtime = "nodejs";

const SAMPLE = parseSlides(
  "Faturamento não é lucro\nO que sobra no fim do mês?\n---\n1. Entra dinheiro\nO que você vende é só o começo da conta.\n---\nSalve este post\nE mande para quem precisa ouvir isso.",
);

/** Prévia da identidade com valores ainda não salvos (cores, fontes e estilo vêm na URL). */
export async function GET(req: Request) {
  const actor = await requireActor();
  const q = new URL(req.url).searchParams;
  const saved = await getBrand(actor);
  const color = (k: "navy" | "gold" | "cream" | "brown" | "slate" | "bronze" | "sand") => (/^#[0-9a-fA-F]{6}$/.test(q.get(k) ?? "") ? (q.get(k) as string) : saved[k]);
  const font = (k: "titleFont" | "bodyFont") => (FONT_KEYS.includes(q.get(k) as never) ? (q.get(k) as BrandSettings["titleFont"]) : saved[k]);
  const style = BRAND_STYLES.includes(q.get("style") as never) ? (q.get("style") as BrandSettings["style"]) : saved.style;
  const brand: BrandSettings = { ...DEFAULT_BRAND, ...saved, navy: color("navy"), gold: color("gold"), cream: color("cream"), brown: color("brown"), slate: color("slate"), bronze: color("bronze"), sand: color("sand"), titleFont: font("titleFont"), bodyFont: font("bodyFont"), style };
  const n = Math.min(Math.max(Number(q.get("n") ?? 1), 1), SAMPLE.length);
  const photoId = q.get("foto");
  const photo = photoId && n === 1 ? await getPhoto(actor, photoId).catch(() => null) : null;
  return renderSlide({ slide: SAMPLE[n - 1], index: n - 1, total: SAMPLE.length, brand, photo });
}

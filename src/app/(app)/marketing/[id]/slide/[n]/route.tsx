import { parseSlides } from "@/domain/marketing";
import { requireActor } from "@/server/context";
import { renderSlide } from "@/server/marketing-render";
import { getBrand, getIdea, getPhoto } from "@/server/services/marketing";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const actor = await requireActor();
  const { id, n } = await params;
  const idea = await getIdea(actor, id);
  const slides = parseSlides(idea.slidesText);
  const idx = Number(n) - 1;
  const slide = slides[idx];
  if (!slide) return new Response("Slide não encontrado", { status: 404 });
  const [brand, photo] = await Promise.all([getBrand(actor), idea.photoId ? getPhoto(actor, idea.photoId).catch(() => null) : null]);
  const img = await renderSlide({ slide, index: idx, total: slides.length, brand, photo });
  if (new URL(req.url).searchParams.get("baixar")) {
    const slug = idea.title.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 50) || "post";
    const headers = new Headers(img.headers);
    headers.set("Content-Disposition", `attachment; filename="${slug}-${String(idx + 1).padStart(2, "0")}.png"`);
    return new Response(img.body, { headers });
  }
  return img;
}

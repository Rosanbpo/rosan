import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, parseSlides, SLIDE_SIZE, type Slide } from "@/domain/marketing";
import { requireActor } from "@/server/context";
import { getIdea } from "@/server/services/marketing";

export const runtime = "nodejs";

const load = (file: string) => readFile(path.join(process.cwd(), "src/assets/marketing", file));

function titleSize(t: string, big: boolean) {
  const n = t.length;
  if (big) return n <= 28 ? 104 : n <= 52 ? 88 : n <= 80 ? 74 : 64;
  return n <= 28 ? 84 : n <= 50 ? 72 : 62;
}

function Wordmark({ color }: { color: string }) {
  return <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 7, color }}>ROSAN FINANÇAS</div>;
}

function SlideView({ s, i, total, logo }: { s: Slide; i: number; total: number; logo: string }) {
  const dark = s.kind !== "conteudo";
  const base = { display: "flex", flexDirection: "column" as const, width: "100%", height: "100%", padding: 96, fontFamily: "Inter" };
  if (s.kind === "capa") {
    return (
      <div style={{ ...base, background: BRAND.navy, justifyContent: "space-between" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={230} height={197} alt="" style={{ marginLeft: -24, marginTop: -30 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: titleSize(s.title, true), fontWeight: 800, color: BRAND.white, lineHeight: 1.06, letterSpacing: -2 }}>{s.title}</div>
          <div style={{ display: "flex", width: 120, height: 5, background: BRAND.gold, marginTop: 48, marginBottom: 40 }} />
          {s.body && <div style={{ display: "flex", fontSize: 40, fontWeight: 400, color: BRAND.gold, lineHeight: 1.35 }}>{s.body}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: BRAND.gold, fontSize: 28, fontWeight: 600 }}>
          <div style={{ display: "flex" }}>Arraste para o lado</div>
          <div style={{ display: "flex", fontSize: 52, color: BRAND.goldDeep }}>→</div>
        </div>
      </div>
    );
  }
  if (s.kind === "final") {
    return (
      <div style={{ ...base, background: BRAND.navy, justifyContent: "space-between" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={190} height={162} alt="" style={{ marginLeft: -20, marginTop: -24 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: titleSize(s.title, false) + 4, fontWeight: 800, color: BRAND.gold, lineHeight: 1.1, letterSpacing: -1.5 }}>{s.title}</div>
          <div style={{ display: "flex", width: 120, height: 5, background: BRAND.brown, marginTop: 44, marginBottom: 40 }} />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 400, color: BRAND.white, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{s.body}</div>
        </div>
        <div style={{ display: "flex", alignSelf: "flex-start", border: `3px solid ${BRAND.gold}`, borderRadius: 999, padding: "22px 44px", color: BRAND.gold, fontSize: 30, fontWeight: 600, letterSpacing: 1 }}>
          Salve · Compartilhe · Comente
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...base, background: BRAND.cream, justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark color={BRAND.brown} />
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: BRAND.brown }}>{`${i + 1}/${total}`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: 90, height: 6, background: BRAND.goldDeep, marginBottom: 48 }} />
        <div style={{ display: "flex", fontSize: titleSize(s.title, false), fontWeight: 800, color: BRAND.ink, lineHeight: 1.1, letterSpacing: -1.5 }}>{s.title}</div>
        <div style={{ display: "flex", fontSize: 42, fontWeight: 400, color: BRAND.muted, lineHeight: 1.45, marginTop: 44, whiteSpace: "pre-wrap" }}>{s.body}</div>
      </div>
      <div style={{ display: "flex", height: 2, background: BRAND.gold }} />
    </div>
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const actor = await requireActor();
  const { id, n } = await params;
  const idea = await getIdea(actor, id);
  const slides = parseSlides(idea.slidesText);
  const idx = Number(n) - 1;
  const slide = slides[idx];
  if (!slide) return new Response("Slide não encontrado", { status: 404 });
  const [f400, f600, f800, logoBuf] = await Promise.all([
    load("inter-400.woff"),
    load("inter-600.woff"),
    load("inter-800.woff"),
    load("logo.png"),
  ]);
  const logo = `data:image/png;base64,${Buffer.from(logoBuf).toString("base64")}`;
  const img = new ImageResponse(<SlideView s={slide} i={idx} total={slides.length} logo={logo} />, {
    ...SLIDE_SIZE,
    fonts: [
      { name: "Inter", data: new Uint8Array(f400).buffer, weight: 400, style: "normal" },
      { name: "Inter", data: new Uint8Array(f600).buffer, weight: 600, style: "normal" },
      { name: "Inter", data: new Uint8Array(f800).buffer, weight: 800, style: "normal" },
    ],
  });
  if (new URL(req.url).searchParams.get("baixar")) {
    const slug = idea.title.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 50) || "post";
    const headers = new Headers(img.headers);
    headers.set("Content-Disposition", `attachment; filename="${slug}-${String(idx + 1).padStart(2, "0")}.png"`);
    return new Response(img.body, { headers });
  }
  return img;
}

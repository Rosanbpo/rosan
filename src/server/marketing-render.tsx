import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { FONTS, SLIDE_SIZE, type BrandSettings, type FontKey, type Slide } from "@/domain/marketing";

const asset = (file: string) => readFile(path.join(process.cwd(), "src/assets/marketing", file));

function titleSize(t: string, big: boolean) {
  const n = t.length;
  if (big) return n <= 28 ? 104 : n <= 52 ? 88 : n <= 80 ? 74 : 64;
  return n <= 28 ? 84 : n <= 50 ? 72 : 62;
}

async function loadFonts(brand: BrandSettings) {
  const keys = [...new Set([brand.titleFont, brand.bodyFont])] as FontKey[];
  const out: { name: string; data: ArrayBuffer; weight: 400 | 600 | 800; style: "normal" }[] = [];
  const faces = [400, 600, 800] as const;
  for (const key of keys) {
    const real = FONTS[key].weights;
    for (let i = 0; i < 3; i++) {
      const buf = await asset(`fonts/${key}-${real[i]}.woff`);
      out.push({ name: key, data: new Uint8Array(buf).buffer, weight: faces[i], style: "normal" });
    }
  }
  return out;
}

interface Ctx {
  b: BrandSettings;
  logo: string;
  photo: string | null;
  i: number;
  total: number;
}

function Frame({ b, dark, children }: { b: BrandSettings; dark: boolean; children: React.ReactNode }) {
  const bg = dark ? b.navy : b.cream;
  const line = dark ? b.gold : b.brown;
  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: bg, fontFamily: b.bodyFont }}>
      {b.style === "CLASSICO" && <div style={{ display: "flex", position: "absolute", top: 36, left: 36, right: 36, bottom: 36, border: `2px solid ${line}`, opacity: 0.7 }} />}
      {b.style === "MODERNO" && <div style={{ display: "flex", position: "absolute", top: 0, left: 0, bottom: 0, width: 28, background: dark ? b.gold : b.brown }} />}
      {children}
    </div>
  );
}

function Body({ b, children, between = true }: { b: BrandSettings; children: React.ReactNode; between?: boolean }) {
  const pad = b.style === "MODERNO" ? "96px 96px 96px 130px" : b.style === "CLASSICO" ? 110 : 96;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: pad, justifyContent: between ? "space-between" : "center", alignItems: b.style === "CLASSICO" ? "center" : "stretch", textAlign: b.style === "CLASSICO" ? "center" : "left" }}>{children}</div>
  );
}

function Rule({ color, w = 120, h = 5, mt = 48, mb = 40, b }: { color: string; w?: number; h?: number; mt?: number; mb?: number; b: BrandSettings }) {
  return <div style={{ display: "flex", width: w, height: h, background: color, marginTop: mt, marginBottom: mb, alignSelf: b.style === "CLASSICO" ? "center" : "flex-start" }} />;
}

function SlideView({ s, c }: { s: Slide; c: Ctx }) {
  const { b, logo, photo, i, total } = c;
  const head = { fontFamily: b.titleFont, fontWeight: 800 as const, lineHeight: 1.08, letterSpacing: -1.5 };
  const center = b.style === "CLASSICO";
  const logoBox = (w: number, h: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} width={w} height={h} alt="" style={{ marginLeft: center ? 0 : -24, marginTop: -30 }} />
  );

  if (s.kind === "capa" || s.kind === "final") {
    const cover = s.kind === "capa";
    return (
      <Frame b={b} dark>
        {cover && photo && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" width={SLIDE_SIZE.width} height={SLIDE_SIZE.height} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: b.navy, opacity: 0.72 }} />
          </>
        )}
        <Body b={b}>
          {cover ? logoBox(230, 197) : logoBox(190, 162)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start" }}>
            <div style={{ display: "flex", ...head, fontSize: cover ? titleSize(s.title, true) : titleSize(s.title, false) + 4, color: cover ? "#FFFFFF" : b.gold }}>{s.title}</div>
            <Rule b={b} color={cover ? b.gold : b.brown} />
            {s.body && <div style={{ display: "flex", fontSize: 40, fontWeight: cover ? 400 : 400, color: cover ? b.gold : "#FFFFFF", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{s.body}</div>}
          </div>
          {cover ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: center ? "center" : "space-between", color: b.gold, fontSize: 28, fontWeight: 600, width: "100%" }}>
              <div style={{ display: "flex" }}>Arraste para o lado</div>
              <div style={{ display: "flex", fontSize: 52, marginLeft: center ? 20 : 0 }}>→</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignSelf: center ? "center" : "flex-start", border: `3px solid ${b.gold}`, borderRadius: 999, padding: "22px 44px", color: b.gold, fontSize: 30, fontWeight: 600, letterSpacing: 1 }}>Salve · Compartilhe · Comente</div>
          )}
        </Body>
      </Frame>
    );
  }
  return (
    <Frame b={b} dark={false}>
      <Body b={b}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 7, color: b.brown }}>ROSAN FINANÇAS</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: b.brown }}>{`${i + 1}/${total}`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start" }}>
          <Rule b={b} color={b.brown} w={90} h={6} mt={0} mb={48} />
          <div style={{ display: "flex", ...head, fontSize: titleSize(s.title, false), color: b.navy }}>{s.title}</div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 400, color: b.navy, opacity: 0.75, lineHeight: 1.45, marginTop: 44, whiteSpace: "pre-wrap" }}>{s.body}</div>
        </div>
        <div style={{ display: "flex", height: 2, width: "100%", background: b.gold }} />
      </Body>
    </Frame>
  );
}

export async function renderSlide(args: { slide: Slide; index: number; total: number; brand: BrandSettings; photo: { mime: string; data: Uint8Array } | null }) {
  const logoBuf = await asset("logo.png");
  const logo = `data:image/png;base64,${Buffer.from(logoBuf).toString("base64")}`;
  const photo = args.photo ? `data:${args.photo.mime};base64,${Buffer.from(args.photo.data).toString("base64")}` : null;
  return new ImageResponse(<SlideView s={args.slide} c={{ b: args.brand, logo, photo, i: args.index, total: args.total }} />, {
    ...SLIDE_SIZE,
    fonts: await loadFonts(args.brand),
  });
}

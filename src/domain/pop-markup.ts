/**
 * Formato de texto dos POPs (parecido com o Notion): títulos, avisos, passos, checklists,
 * tabelas e divisores, escritos em texto simples. Também gera o mapa mental a partir da estrutura.
 *
 *   ## Seção            ### Subseção
 *   > [aviso] Título: texto      (tipos: aviso, regra, dica, info, resultado)
 *   1. Passo             (linhas recuadas logo abaixo viram o detalhe do passo)
 *   - Tópico             - [ ] Item de checklist
 *   | Coluna A | Coluna B |      (primeira linha é o cabeçalho)
 *   ![legenda](img:ID)   (imagem enviada para o sistema)
 *   ---                  (divisor)
 *   Texto com **negrito**.
 */

export type CalloutTone = "aviso" | "regra" | "dica" | "info" | "resultado";
export const CALLOUT_TONES: CalloutTone[] = ["aviso", "regra", "dica", "info", "resultado"];

export interface PopItem {
  text: string;
  detail?: string;
}

export type PopBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "callout"; tone: CalloutTone; title?: string; text: string }
  | { type: "steps"; items: PopItem[] }
  | { type: "bullets"; items: PopItem[] }
  | { type: "checks"; items: PopItem[] }
  | { type: "table"; rows: string[][] }
  | { type: "paragraph"; text: string }
  | { type: "image"; id: string; caption: string }
  | { type: "divider" };

const CALLOUT_RE = /^>\s*(?:\[(aviso|regra|dica|info|resultado)\]\s*)?(.*)$/i;

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/** Indica se o texto usa o formato com marcações (senão é o formato antigo: um passo por linha). */
export function isStructured(content: string): boolean {
  return /^(#{1,3}\s|>\s?|-\s|\d+\.\s|\|.*\||---\s*$)/m.test(content);
}

/** Converte o formato antigo (um passo por linha) para passos numerados. */
export function normalizePop(content: string): string {
  if (isStructured(content)) return content;
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
}

export function parsePop(content: string): PopBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: PopBlock[] = [];
  let i = 0;
  const isBlank = (l: string) => l.trim() === "";
  const collectDetail = (): string | undefined => {
    const parts: string[] = [];
    while (i < lines.length && /^\s{2,}\S/.test(lines[i]!)) parts.push(lines[i++]!.trim());
    return parts.length ? parts.join(" ") : undefined;
  };
  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.trim();
    if (isBlank(line)) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      blocks.push({ type: "heading", level: h[1]!.length >= 3 ? 3 : 2, text: h[2]!.trim() });
      i++;
      continue;
    }
    const img = /^!\[([^\]]*)\]\(img:([A-Za-z0-9_-]+)\)$/.exec(t);
    if (img) {
      blocks.push({ type: "image", id: img[2]!, caption: img[1]!.trim() });
      i++;
      continue;
    }
    if (/^-{3,}$/.test(t)) {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }
    if (t.startsWith(">")) {
      const tone: CalloutTone[] = [];
      const texts: string[] = [];
      let title: string | undefined;
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        const m = CALLOUT_RE.exec(lines[i]!.trim())!;
        if (m[1] && !tone.length) tone.push(m[1].toLowerCase() as CalloutTone);
        texts.push(m[2]!.trim());
        i++;
      }
      let body = texts.join(" ").trim();
      const c = /^([^:*]{2,40}):\s+(.*)$/.exec(body);
      if (c) {
        title = c[1]!.trim();
        body = c[2]!.trim();
      }
      blocks.push({ type: "callout", tone: tone[0] ?? "info", title, text: body });
      continue;
    }
    if (t.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        const cells = splitRow(lines[i]!);
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }
    const num = /^\d+[.)]\s+(.*)$/.exec(t);
    if (num) {
      const items: PopItem[] = [];
      while (i < lines.length) {
        const m = /^\d+[.)]\s+(.*)$/.exec(lines[i]!.trim());
        if (!m || /^\s/.test(lines[i]!)) break;
        i++;
        items.push({ text: m[1]!.trim(), detail: collectDetail() });
        while (i < lines.length && isBlank(lines[i]!) && /^\d+[.)]\s/.test((lines[i + 1] ?? "").trim())) i++;
      }
      blocks.push({ type: "steps", items });
      continue;
    }
    if (/^[-•*]\s+\[[ xX]?\]\s+/.test(t)) {
      const items: PopItem[] = [];
      while (i < lines.length) {
        const m = /^[-•*]\s+\[[ xX]?\]\s+(.*)$/.exec(lines[i]!.trim());
        if (!m) break;
        i++;
        items.push({ text: m[1]!.trim(), detail: collectDetail() });
      }
      blocks.push({ type: "checks", items });
      continue;
    }
    if (/^[-•*]\s+/.test(t)) {
      const items: PopItem[] = [];
      while (i < lines.length) {
        const m = /^[-•*]\s+(?!\[[ xX]?\]\s)(.*)$/.exec(lines[i]!.trim());
        if (!m || /^---/.test(lines[i]!.trim())) break;
        i++;
        items.push({ text: m[1]!.trim(), detail: collectDetail() });
      }
      if (items.length) {
        blocks.push({ type: "bullets", items });
        continue;
      }
    }
    // parágrafo: junta linhas seguidas até uma linha em branco ou outro tipo de bloco
    const para: string[] = [];
    while (i < lines.length && !isBlank(lines[i]!) && !/^(#{1,3}\s|>|\||!\[|-{3,}$|[-•*]\s|\d+[.)]\s)/.test(lines[i]!.trim())) para.push(lines[i++]!.trim());
    if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
    else i++;
  }
  return blocks;
}

/** Trechos com **negrito** para renderização. */
export function inlineParts(text: string): Array<{ text: string; bold: boolean }> {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith("**") && p.endsWith("**") ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false }));
}

export function plain(text: string): string {
  return text.replace(/\*\*/g, "");
}

// ---------- Mapa mental ----------

export interface MindNode {
  label: string;
  children: MindNode[];
}

const clip = (s: string, n = 52) => (plain(s).length > n ? `${plain(s).slice(0, n - 1).trimEnd()}…` : plain(s));

/** Árvore do mapa: título → seções → subseções/itens. */
export function buildMindMap(title: string, blocks: PopBlock[]): MindNode {
  const root: MindNode = { label: clip(title, 60), children: [] };
  let section: MindNode | null = null;
  let sub: MindNode | null = null;
  const target = () => sub ?? section ?? (section = pushTo(root, "Visão geral"));
  const pushTo = (parent: MindNode, label: string) => {
    const n: MindNode = { label: clip(label), children: [] };
    parent.children.push(n);
    return n;
  };
  for (const b of blocks) {
    if (b.type === "heading") {
      if (b.level === 2) {
        section = pushTo(root, b.text);
        sub = null;
      } else {
        sub = pushTo(section ?? (section = pushTo(root, "Visão geral")), b.text);
      }
    } else if (b.type === "steps" || b.type === "bullets" || b.type === "checks") {
      for (const it of b.items) pushTo(target(), it.text);
    } else if (b.type === "callout") {
      pushTo(target(), b.title ?? b.text);
    } else if (b.type === "table") {
      for (const r of b.rows.slice(1)) if (r[0]) pushTo(target(), r[0]);
    }
  }
  return root;
}

export interface MindLayoutNode {
  id: number;
  label: string;
  depth: number;
  x: number;
  y: number;
}
export interface MindLayout {
  nodes: MindLayoutNode[];
  edges: Array<{ from: number; to: number }>;
  width: number;
  height: number;
}

export const MIND_COL = 290;
export const MIND_ROW = 34;
export const MIND_NODE_W = 260;

/** Posição de cada nó: colunas por nível, folhas empilhadas, pais centralizados nos filhos. */
export function layoutMindMap(root: MindNode): MindLayout {
  const nodes: MindLayoutNode[] = [];
  const edges: Array<{ from: number; to: number }> = [];
  let leaf = 0;
  let maxDepth = 0;
  const walk = (n: MindNode, depth: number): { id: number; y: number } => {
    maxDepth = Math.max(maxDepth, depth);
    const id = nodes.length;
    nodes.push({ id, label: n.label, depth, x: depth * MIND_COL, y: 0 });
    if (!n.children.length) {
      const y = leaf++ * MIND_ROW;
      nodes[id]!.y = y;
      return { id, y };
    }
    const kids = n.children.map((c) => walk(c, depth + 1));
    for (const k of kids) edges.push({ from: id, to: k.id });
    const y = (kids[0]!.y + kids[kids.length - 1]!.y) / 2;
    nodes[id]!.y = y;
    return { id, y };
  };
  walk(root, 0);
  return { nodes, edges, width: maxDepth * MIND_COL + MIND_NODE_W + 8, height: Math.max(leaf, 1) * MIND_ROW + 8 };
}

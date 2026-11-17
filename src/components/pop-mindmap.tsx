import { buildMindMap, layoutMindMap, MIND_NODE_W, parsePop } from "@/domain/pop-markup";

const FILL = ["#0c1633", "#1e3a8a", "#8a6a2f", "#64748b"];

/** Mapa mental do POP: título no centro-esquerda, seções e itens à direita. */
export function PopMindMap({ title, content }: { title: string; content: string }) {
  const tree = buildMindMap(title, parsePop(content));
  const { nodes, edges, width, height } = layoutMindMap(tree);
  const H = 26;
  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white p-3" role="img" aria-label={`Mapa mental: ${title}`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {edges.map((e) => {
          const a = nodes[e.from]!;
          const b = nodes[e.to]!;
          const x1 = a.x + MIND_NODE_W;
          const y1 = a.y + H / 2 + 2;
          const x2 = b.x;
          const y2 = b.y + H / 2 + 2;
          const mx = (x1 + x2) / 2;
          return <path key={`${e.from}-${e.to}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />;
        })}
        {nodes.map((n) => {
          const dark = n.depth <= 1;
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y + 2})`}>
              <title>{n.label}</title>
              <rect width={MIND_NODE_W} height={H} rx={13} fill={dark ? FILL[Math.min(n.depth, 3)] : "#f8fafc"} stroke={dark ? "none" : "#e2e8f0"} />
              <text x={12} y={17} fontSize={n.depth === 0 ? 13 : 12} fontWeight={dark ? 600 : 400} fill={dark ? "#fdf8ee" : "#334155"}>
                {n.label.length > 38 ? `${n.label.slice(0, 37)}…` : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

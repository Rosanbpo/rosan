import { AlertTriangle, CheckCircle2, Info, Lightbulb, ShieldAlert, Square } from "lucide-react";
import { inlineParts, parsePop, type CalloutTone, type PopBlock, type PopItem } from "@/domain/pop-markup";
import { cx } from "@/lib/ui";

const TONE: Record<CalloutTone, { box: string; icon: string; Icon: typeof Info }> = {
  aviso: { box: "border-amber-400 bg-amber-50 text-amber-950", icon: "text-amber-600", Icon: AlertTriangle },
  regra: { box: "border-brand-700 bg-brand-50 text-brand-900", icon: "text-brand-700", Icon: ShieldAlert },
  dica: { box: "border-emerald-500 bg-emerald-50 text-emerald-950", icon: "text-emerald-600", Icon: Lightbulb },
  info: { box: "border-sky-500 bg-sky-50 text-sky-950", icon: "text-sky-600", Icon: Info },
  resultado: { box: "border-emerald-600 bg-emerald-50 text-emerald-950", icon: "text-emerald-700", Icon: CheckCircle2 },
};

function Rich({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-semibold">
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function Detail({ item }: { item: PopItem }) {
  return (
    <>
      <span className="font-medium text-slate-900">
        <Rich text={item.text} />
      </span>
      {item.detail && (
        <span className="mt-0.5 block text-slate-600">
          <Rich text={item.detail} />
        </span>
      )}
    </>
  );
}

function Block({ b }: { b: PopBlock }) {
  switch (b.type) {
    case "heading":
      return b.level === 2 ? (
        <h2 className="mt-8 border-b border-slate-200 pb-1.5 text-xl font-semibold text-slate-900 first:mt-0">{b.text}</h2>
      ) : (
        <h3 className="mt-5 text-base font-semibold text-slate-800">{b.text}</h3>
      );
    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-slate-700">
          <Rich text={b.text} />
        </p>
      );
    case "divider":
      return <hr className="border-slate-200" />;
    case "callout": {
      const t = TONE[b.tone];
      return (
        <div className={cx("flex gap-3 rounded-lg border-l-4 p-4 text-sm", t.box)}>
          <t.Icon aria-hidden className={cx("mt-0.5 h-4 w-4 shrink-0", t.icon)} />
          <p className="leading-relaxed">
            {b.title && <strong className="font-semibold">{b.title}: </strong>}
            <Rich text={b.text} />
          </p>
        </div>
      );
    }
    case "steps":
      return (
        <ol className="space-y-3">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <Detail item={it} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "bullets":
      return (
        <ul className="space-y-1.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-700">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span className="min-w-0 flex-1">
                <Detail item={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "checks":
      return (
        <ul className="space-y-1.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-700">
              <Square aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <Detail item={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "table": {
      const [head, ...rows] = b.rows;
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {head!.map((c, i) => (
                  <th key={i} className="px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={cx("px-3 py-2 align-top text-slate-700", j === 0 && "font-medium text-slate-900")}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

/** Documento do POP no estilo Notion. */
export function PopDocument({ content }: { content: string }) {
  const blocks = parsePop(content);
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <Block key={i} b={b} />
      ))}
    </div>
  );
}

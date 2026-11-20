import { inlineParts, parsePop, type CalloutTone, type PopBlock, type PopItem } from "@/domain/pop-markup";
import { slugify } from "@/domain/pop-style";
import { cx } from "@/lib/ui";

const TONE: Record<CalloutTone, { box: string; emoji: string }> = {
  aviso: { box: "bg-amber-50 text-amber-950", emoji: "⚠️" },
  regra: { box: "bg-sky-50 text-sky-950", emoji: "📌" },
  dica: { box: "bg-emerald-50 text-emerald-950", emoji: "💡" },
  info: { box: "bg-slate-100 text-slate-900", emoji: "ℹ️" },
  resultado: { box: "bg-emerald-50 text-emerald-950", emoji: "✅" },
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
        <span className="block text-slate-500">
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
        <h2 id={slugify(b.text)} className="group mt-10 scroll-mt-20 text-2xl font-semibold tracking-tight text-slate-900 first:mt-0">
          {b.text}
          <a href={`#${slugify(b.text)}`} aria-label="Link para esta seção" className="ml-2 text-base font-normal text-slate-300 opacity-0 transition group-hover:opacity-100">#</a>
        </h2>
      ) : (
        <h3 id={slugify(b.text)} className="mt-6 scroll-mt-20 text-lg font-semibold text-slate-800">{b.text}</h3>
      );
    case "paragraph":
      return (
        <p className="text-[15px] leading-7 text-slate-700">
          <Rich text={b.text} />
        </p>
      );
    case "divider":
      return <hr className="my-2 border-slate-200" />;
    case "callout": {
      const t = TONE[b.tone];
      return (
        <div className={cx("flex gap-3 rounded-md px-4 py-3.5 text-[15px]", t.box)}>
          <span aria-hidden className="text-xl leading-7">{t.emoji}</span>
          <p className="leading-7">
            {b.title && <strong className="font-semibold">{b.title}: </strong>}
            <Rich text={b.text} />
          </p>
        </div>
      );
    }
    case "steps":
      return (
        <ol className="space-y-2.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-7">
              <span aria-hidden className="w-6 shrink-0 text-right font-semibold text-slate-400">{i + 1}.</span>
              <span className="min-w-0 flex-1">
                <Detail item={it} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "bullets":
      return (
        <ul className="space-y-1">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-700">
              <span aria-hidden className="w-6 shrink-0 text-center text-slate-400">•</span>
              <span className="min-w-0 flex-1">
                <Detail item={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "checks":
      return (
        <ul className="space-y-1">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-700">
              <span aria-hidden className="mx-1 mt-1.5 h-[18px] w-[18px] shrink-0 rounded-[4px] border-2 border-slate-400" />
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="text-xs font-medium text-slate-500">
              <tr>
                {head!.map((c, i) => (
                  <th key={i} className="border border-slate-200 bg-slate-50 px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={cx("border border-slate-200 px-3 py-2 align-top text-slate-700", j === 0 && "font-medium text-slate-900")}>
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
    <div className="space-y-3.5">
      {blocks.map((b, i) => (
        <Block key={i} b={b} />
      ))}
    </div>
  );
}

import Link from "next/link";

export function PricingTabs({ active }: { active: "consultiva" | "custos" }) {
  const tab = (key: string, href: string, label: string) => (
    <Link href={href} className={`border-b-2 px-3 py-2 text-sm font-medium ${active === key ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-brand-900"}`}>{label}</Link>
  );
  return <nav className="mb-5 flex gap-2 border-b border-hair">{tab("consultiva", "/precificacao", "🧭 Precificação consultiva")}{tab("custos", "/precificacao/custos", "🧮 Meu custo por hora e planos")}</nav>;
}

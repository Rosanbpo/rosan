import { redirect } from "next/navigation";
import { requirePermission } from "@/server/context";
import { importAmanda } from "@/server/services/import-amanda";

export const metadata = { title: "Importar Amanda Finanças" };

async function run() {
  "use server";
  const actor = await requirePermission("clients.manage");
  const report = await importAmanda(actor);
  redirect(`/importar-amanda?r=${encodeURIComponent(report.join(" | "))}`);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requirePermission("clients.manage");
  const { r } = await searchParams;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-brand-900">Importar Trello da Amanda Finanças</h1>
      <p className="text-sm text-slate-600">Cria os 5 clientes (R$ 240, vencimento dia 20), as rotinas com checklists e as tarefas de hoje. Pode clicar de novo sem duplicar.</p>
      <form action={run}>
        <button className="btn btn-primary" type="submit">Importar agora</button>
      </form>
      {r && <div className="card p-4 text-sm">{r.split(" | ").map((l) => <p key={l}>{l}</p>)}</div>}
    </div>
  );
}

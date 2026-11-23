import { redirect } from "next/navigation";
import { requirePermission } from "@/server/context";
import { desfazerAmanda } from "@/server/services/desfazer-amanda";

export const metadata = { title: "Desfazer importação" };

async function run() {
  "use server";
  const actor = await requirePermission("recurrences.manage");
  redirect(`/importar-amanda?r=${encodeURIComponent(await desfazerAmanda(actor))}`);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requirePermission("recurrences.manage");
  const { r } = await searchParams;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-brand-900">Desfazer importação do Trello</h1>
      <p className="text-sm text-slate-600">Apaga todas as tarefas, rotinas e modelos criados pela importação da Amanda Finanças. Os clientes não são apagados.</p>
      <form action={run}><button className="btn btn-primary" type="submit">Apagar o que foi importado</button></form>
      {r && <div className="card p-4 text-sm">{r}</div>}
    </div>
  );
}

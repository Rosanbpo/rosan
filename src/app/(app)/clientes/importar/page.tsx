import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { importClientsAction } from "@/app/actions/clients";
import { PageHeader } from "@/components/ui/layout";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { requirePermission } from "@/server/context";

export const metadata = { title: "Importar clientes" };

export default async function ImportClientsPage() {
  await requirePermission("clients.manage");
  return (
    <>
      <PageHeader title="Importar clientes" description="Cadastre vários clientes de uma vez a partir de uma planilha." />
      <div className="max-w-2xl space-y-5">
        <section className="card space-y-3 p-5 text-sm text-slate-700">
          <h2 className="text-sm font-semibold text-brand-900">Como fazer</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Baixe o modelo e preencha uma linha por cliente (Excel ou Google Planilhas).</li>
            <li>Salve como <strong>CSV</strong> (separado por vírgula ou ponto e vírgula).</li>
            <li>Envie o arquivo abaixo. Cada linha é validada; as que tiverem erro são listadas e as demais entram.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- download de arquivo */}
          <a href="/clientes/exportar?modelo=1" className="btn-secondary inline-flex w-fit items-center gap-2">
            <Download aria-hidden className="h-4 w-4" /> Baixar modelo
          </a>
        </section>
        <ActionForm action={importClientsAction} className="card space-y-4 p-5">
          <Field label="Planilha (.csv)" name="file" required>
            <input id="file" name="file" type="file" accept=".csv,text/csv" required className="input" />
          </Field>
          <SubmitButton>
            <Upload aria-hidden className="mr-1 inline h-4 w-4" /> Importar
          </SubmitButton>
        </ActionForm>
        <p className="text-sm">
          <Link href="/clientes" className="text-brand-700 hover:underline">
            ← Voltar aos clientes
          </Link>
        </p>
      </div>
    </>
  );
}

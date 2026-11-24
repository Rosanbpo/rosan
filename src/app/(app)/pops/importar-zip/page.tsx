import { PopZipImport } from "@/components/pop-zip-import";
import { requirePermission } from "@/server/context";

export const metadata = { title: "Importar POP com imagens" };

export default async function Page() {
  await requirePermission("procedures.manage");
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-brand-900">Importar POP com imagens (.zip)</h1>
      <p className="text-sm text-slate-600">Escolha o pacote .zip que o Claude preparou. As imagens vão para o sistema e o POP é criado como rascunho para você revisar.</p>
      <PopZipImport />
    </div>
  );
}

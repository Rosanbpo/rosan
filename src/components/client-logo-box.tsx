import { removeClientLogoAction, uploadClientLogoAction } from "@/app/actions/closings";

/** Logo do cliente no cabeçalho: mostra a imagem (ou as iniciais) e permite trocar/remover. */
export function ClientLogoBox({ clientId, name, hasLogo }: { clientId: string; name: string; hasLogo: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <details className="group relative shrink-0">
      <summary className="flex h-14 w-14 cursor-pointer list-none items-center justify-center overflow-hidden rounded-xl border border-hair bg-brand-50 text-lg font-semibold text-brand-700" title="Alterar logo">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/clientes/${clientId}/logo`} alt={`Logo de ${name}`} className="h-full w-full object-contain bg-white" />
        ) : (
          initials
        )}
      </summary>
      <div className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-hair bg-white p-3 shadow-lg">
        <form action={uploadClientLogoAction.bind(null, clientId)} className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">
            Logo do cliente (PNG, JPG ou WebP, até 400 KB)
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required className="mt-1 block w-full text-xs" />
          </label>
          <button type="submit" className="btn-primary btn-sm w-full">Salvar logo</button>
        </form>
        {hasLogo && (
          <form action={removeClientLogoAction.bind(null, clientId)} className="mt-2">
            <button type="submit" className="btn-secondary btn-sm w-full">Remover logo</button>
          </form>
        )}
      </div>
    </details>
  );
}

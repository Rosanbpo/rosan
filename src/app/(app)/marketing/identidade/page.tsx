import { BrandForm } from "@/components/marketing-brand-form";
import { DeletePhoto, PhotoUploader } from "@/components/marketing-identity";
import { MarketingHero } from "@/components/marketing-hero";
import { MarketingTabs } from "@/components/marketing-tabs";
import { requireActor } from "@/server/context";
import { getBrand, listPhotos } from "@/server/services/marketing";

export const metadata = { title: "Identidade visual · Marketing" };

export default async function IdentityPage() {
  const actor = await requireActor();
  const [brand, photos, refs] = await Promise.all([getBrand(actor), listPhotos(actor), listPhotos(actor, "REFERENCIA")]);
  return (
    <>
      <MarketingHero actor={actor} />
      <MarketingTabs active="identidade" />
      <BrandForm initial={brand} photoId={photos[0]?.id} />
      <section className="mt-6" aria-label="Posts de referência">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-brand-900">Posts de referência ({refs.length})</h2>
            <p className="text-xs text-slate-600">Envie posts que você acha bonitos (seus ou de outros perfis). Eu uso como guia de estilo para criar os seus no Canva.</p>
          </div>
          <PhotoUploader kind="REFERENCIA" />
        </div>
        {refs.length === 0 ? (
          <div className="card p-6 text-sm text-slate-600">Nenhum exemplo ainda. Prints de posts que você gosta já ajudam muito.</div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {refs.map((p) => (
              <li key={p.id} className="card relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/marketing/identidade/foto/${p.id}`} alt={p.name} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                <div className="absolute right-1.5 top-1.5">
                  <DeletePhoto id={p.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-label="Fotos">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-brand-900">Suas fotos para as capas ({photos.length})</h2>
          <PhotoUploader />
        </div>
        {photos.length === 0 ? (
          <div className="card p-6 text-sm text-slate-600">Envie fotos suas, do escritório ou do trabalho. Depois, em cada conteúdo, você escolhe qual vira o fundo da capa.</div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((p) => (
              <li key={p.id} className="card relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/marketing/identidade/foto/${p.id}`} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="absolute right-1.5 top-1.5">
                  <DeletePhoto id={p.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

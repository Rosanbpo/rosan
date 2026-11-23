import { BrandForm } from "@/components/marketing-brand-form";
import { DeletePhoto, PhotoUploader } from "@/components/marketing-identity";
import { MarketingTabs } from "@/components/marketing-tabs";
import { PageHeader } from "@/components/ui/layout";
import { requireActor } from "@/server/context";
import { getBrand, listPhotos } from "@/server/services/marketing";

export const metadata = { title: "Identidade visual · Marketing" };

export default async function IdentityPage() {
  const actor = await requireActor();
  const [brand, photos] = await Promise.all([getBrand(actor), listPhotos(actor)]);
  return (
    <>
      <PageHeader title="Marketing" description="Escolha cores, fontes e estilo, e guarde as fotos que podem entrar nos posts. Tudo que você salvar aqui vale para todos os slides." />
      <MarketingTabs active="identidade" />
      <BrandForm initial={brand} photoId={photos[0]?.id} />
      <section className="mt-6" aria-label="Fotos">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-brand-900">Suas fotos ({photos.length})</h2>
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

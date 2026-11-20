import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { VaultReveal } from "@/components/vault-reveal";
import { Select } from "@/components/filter-select";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { VAULT_CATEGORIES, VAULT_CATEGORY_LABEL, type VaultCategory } from "@/domain/enums";
import { requireActor } from "@/server/context";
import { str } from "@/server/page-utils";
import { listAllVault } from "@/server/services/vault";

export const metadata = { title: "Cofre" };

export default async function VaultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const q = str(sp, "q");
  const category = str(sp, "tipo");
  const items = await listAllVault(actor, { q: q || undefined, category: VAULT_CATEGORIES.includes(category as VaultCategory) ? category : undefined });
  const byClient = new Map<string, { id: string; name: string; rows: typeof items }>();
  for (const i of items) {
    const g = byClient.get(i.client.id) ?? { id: i.client.id, name: i.client.tradeName, rows: [] };
    g.rows.push(i);
    byClient.set(i.client.id, g);
  }
  return (
    <>
      <PageHeader title="Cofre" description="Acessos e senhas de todos os clientes. Senhas criptografadas; cada visualização fica registrada." />
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} className="input" placeholder="Cliente, sistema, usuário ou link" />
        </div>
        <Select name="tipo" label="Tipo" value={category} options={VAULT_CATEGORIES.map((c) => ({ value: c, label: VAULT_CATEGORY_LABEL[c] }))} />
        <button className="btn-primary" type="submit">
          Filtrar
        </button>
        <Link href="/cofre" className="btn-secondary">
          Limpar
        </Link>
      </form>
      {items.length === 0 ? (
        <EmptyState title="Nenhum acesso encontrado" description="Guarde os acessos na aba Cofre de cada cliente." />
      ) : (
        <div className="space-y-5">
          {[...byClient.values()].map((g) => (
            <section key={g.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <ShieldCheck aria-hidden className="h-4 w-4 text-emerald-600" /> {g.name}
                </h2>
                <Link href={`/clientes/${g.id}?aba=cofre`} className="text-xs font-medium text-brand-700 hover:underline">
                  Abrir cofre do cliente
                </Link>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {g.rows.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <KeyRound aria-hidden className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                      <p className="font-medium text-slate-900">
                        {i.label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">{VAULT_CATEGORY_LABEL[i.category as VaultCategory]}</span>
                      </p>
                      {i.url && <p className="truncate text-xs text-slate-500">{i.url}</p>}
                      {i.username && (
                        <p className="text-slate-600">
                          <span className="text-xs text-slate-400">Usuário: </span>
                          {i.username}
                        </p>
                      )}
                      {i.hasSecret && <VaultReveal clientId={g.id} itemId={i.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

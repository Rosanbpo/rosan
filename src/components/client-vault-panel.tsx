import { Building2, KeyRound, Link2, Plus, User } from "lucide-react";
import { ListFilter } from "./list-filter";
import { addVaultItemAction, deleteVaultItemAction } from "@/app/actions/vault";
import { VAULT_CATEGORIES, VAULT_CATEGORY_LABEL, type VaultCategory } from "@/domain/enums";
import { fmtDateTime } from "@/lib/format";
import { ConfirmAction } from "./confirm-action";
import { VaultReveal } from "./vault-reveal";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";
import { EmptyState } from "./ui/layout";

export interface VaultRow {
  id: string;
  category: string;
  label: string;
  url: string | null;
  username: string | null;
  notes: string | null;
  hasSecret: boolean;
}

/** Cofre do cliente: acessos e senhas criptografados; cada visualização fica registrada. */
export function ClientVaultPanel({
  clientId,
  items,
  log,
  canEdit,
  configured,
}: {
  clientId: string;
  items: VaultRow[];
  log: Array<{ id: string; summary: string; createdAt: Date; actor: { name: string } | null }>;
  canEdit: boolean;
  configured: boolean;
}) {
  return (
    <div className="space-y-6">
      {!configured && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Cofre ainda não ativado.</strong> Para guardar senhas é preciso definir a chave de criptografia (<code>VAULT_ENCRYPTION_KEY</code>) nas configurações do servidor. Enquanto isso você pode guardar apenas usuário, link e observações.
        </div>
      )}
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4">
        <p className="text-sm font-semibold text-violet-800">🔐 Cofre de senhas deste cliente</p>
        <p className="mt-0.5 text-sm text-violet-700">Logins e senhas ficam criptografados no servidor — nunca em texto puro no app. Cada visualização de senha é registrada.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ListFilter placeholder="Buscar sistema ou login…">
          {items.length === 0 ? (
            <EmptyState title="Cofre vazio" description="Guarde aqui os acessos usados na operação deste cliente." />
          ) : (
            <ul className="space-y-2.5">
              {items.map((i) => (
                <li key={i.id} data-item className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 [&[hidden]]:hidden">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                    {i.category === "BANCO" ? <Building2 aria-hidden className="h-5 w-5" /> : <KeyRound aria-hidden className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold uppercase tracking-wide text-slate-900">{i.label}</p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      {i.username && (
                        <span className="inline-flex items-center gap-1"><User aria-hidden className="h-3 w-3" /> {i.username}</span>
                      )}
                      {i.url && (
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-xs items-center gap-1 truncate hover:text-brand-700">
                          <Link2 aria-hidden className="h-3 w-3 shrink-0" /> <span className="truncate">{i.url}</span>
                        </a>
                      )}
                    </p>
                    {i.notes && <p className="mt-0.5 text-xs italic text-slate-500">{i.notes}</p>}
                  </div>
                  <div className="shrink-0">{i.hasSecret ? <VaultReveal clientId={clientId} itemId={i.id} /> : <span className="text-xs text-slate-400">sem senha</span>}</div>
                  {canEdit && <ConfirmAction action={deleteVaultItemAction.bind(null, clientId, i.id)} label="✕" className="btn-ghost btn-sm text-red-600" confirm="Remover este acesso do cofre?" />}
                </li>
              ))}
            </ul>
          )}
        </ListFilter>
        {canEdit && (
          <details className="group basis-full order-last">
            <summary className="btn-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden w-fit">
              <Plus aria-hidden className="h-4 w-4" /> Novo acesso
            </summary>
            <ActionForm action={addVaultItemAction.bind(null, clientId)} className="card mt-3 grid gap-3 p-4 md:grid-cols-2" resetOnSuccess>
              <Field label="Nome" name="label" required>
                <input id="label" name="label" required className="input" placeholder="Internet banking Itaú" />
              </Field>
              <Field label="Tipo" name="category">
                <select id="category" name="category" className="input" defaultValue="SISTEMA">
                  {VAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {VAULT_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Link" name="url">
                <input id="url" name="url" className="input" placeholder="https://…" />
              </Field>
              <Field label="Usuário / login" name="username">
                <input id="username" name="username" className="input" autoComplete="off" />
              </Field>
              <Field label="Senha" name="secret" hint={configured ? "Fica criptografada." : "Indisponível até ativar o cofre."}>
                <input id="secret" name="secret" type="password" className="input" autoComplete="new-password" disabled={!configured} />
              </Field>
              <Field label="Observações" name="notes">
                <input id="notes" name="notes" className="input" />
              </Field>
              <div className="md:col-span-2"><SubmitButton>Guardar acesso</SubmitButton></div>
            </ActionForm>
          </details>
        )}
      </div>
      {log.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Últimos registros do cofre</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2">
                <span className="text-slate-700">{l.actor?.name ? `${l.actor.name} — ` : ""}{l.summary}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

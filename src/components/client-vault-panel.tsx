import { KeyRound, ShieldCheck } from "lucide-react";
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
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-900">
            <ShieldCheck aria-hidden className="h-4 w-4 text-emerald-600" /> Cofre do cliente
          </h2>
          <p className="mb-4 text-xs text-slate-500">Senhas ficam criptografadas e só aparecem quando alguém clica em “Ver senha”. Cada visualização é registrada.</p>
          {items.length === 0 ? (
            <EmptyState title="Cofre vazio" description="Guarde aqui os acessos usados na operação deste cliente." />
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
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
                    {i.hasSecret && <VaultReveal clientId={clientId} itemId={i.id} />}
                    {i.notes && <p className="text-xs text-slate-500">{i.notes}</p>}
                  </div>
                  {canEdit && <ConfirmAction action={deleteVaultItemAction.bind(null, clientId, i.id)} label="Remover" className="btn-secondary btn-sm" confirm="Remover este acesso do cofre?" />}
                </li>
              ))}
            </ul>
          )}
        </section>
        {canEdit && (
          <ActionForm action={addVaultItemAction.bind(null, clientId)} className="card space-y-3 p-4" resetOnSuccess>
            <h2 className="text-sm font-semibold text-brand-900">Guardar acesso</h2>
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
              <textarea id="notes" name="notes" rows={2} className="input" />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
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

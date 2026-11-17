import { Landmark } from "lucide-react";
import { addBankAccountAction, removeBankAccountAction } from "@/app/actions/bank-accounts";
import { ConfirmAction } from "./confirm-action";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";
import { EmptyState } from "./ui/layout";

export interface BankAccountRow {
  id: string;
  bank: string;
  agency: string | null;
  account: string | null;
  kind: string | null;
  nickname: string | null;
  notes: string | null;
}

export function BankAccountsPanel({ clientId, accounts, canEdit }: { clientId: string; accounts: BankAccountRow[]; canEdit: boolean }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold text-brand-900">Contas bancárias</h2>
        <p className="mb-4 text-xs text-slate-500">Identificação das contas para a conciliação. Não guarde senhas ou tokens aqui.</p>
        {accounts.length === 0 ? (
          <EmptyState title="Nenhuma conta cadastrada" description="Cadastre as contas do cliente para organizar a conciliação." />
        ) : (
          <ul className="space-y-3">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <Landmark aria-hidden className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-slate-900">
                    {a.bank}
                    {a.nickname ? <span className="ml-2 font-normal text-slate-500">({a.nickname})</span> : null}
                  </p>
                  <p className="text-slate-600">
                    {[a.kind, a.agency ? `Ag. ${a.agency}` : null, a.account ? `Conta ${a.account}` : null].filter(Boolean).join(" · ") || "Sem dados de agência e conta"}
                  </p>
                  {a.notes && <p className="mt-1 text-xs text-slate-500">{a.notes}</p>}
                </div>
                {canEdit && (
                  <ConfirmAction action={removeBankAccountAction.bind(null, clientId, a.id)} label="Remover" className="btn-secondary btn-sm" confirm="Remover esta conta?" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {canEdit && (
        <ActionForm action={addBankAccountAction} className="card space-y-3 p-4" resetOnSuccess>
          <h2 className="text-sm font-semibold text-brand-900">Adicionar conta</h2>
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="Banco" name="bank" required>
            <input id="bank" name="bank" required className="input" placeholder="Itaú, Nubank, Sicredi…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agência" name="agency">
              <input id="agency" name="agency" className="input" />
            </Field>
            <Field label="Conta" name="account">
              <input id="account" name="account" className="input" />
            </Field>
          </div>
          <Field label="Tipo" name="kind">
            <select id="kind" name="kind" className="input" defaultValue="">
              <option value="">Não informado</option>
              <option>Conta corrente</option>
              <option>Conta poupança</option>
              <option>Conta de pagamento</option>
              <option>Cartão de crédito</option>
              <option>Aplicação</option>
            </select>
          </Field>
          <Field label="Apelido" name="nickname">
            <input id="nickname" name="nickname" className="input" placeholder="Conta principal" />
          </Field>
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

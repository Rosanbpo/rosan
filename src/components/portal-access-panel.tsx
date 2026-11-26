"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { invitePortalAction, reinvitePortalAction, revokePortalAction, suspendPortalAction } from "@/app/actions/portal-admin";

export interface PortalUserRow {
  id: string;
  name: string;
  email: string;
  status: "CONVIDADO" | "ATIVO" | "SUSPENSO";
  lastLoginAt: string | null;
  revoked: boolean;
}

const LABEL = { CONVIDADO: "Convite enviado", ATIVO: "Ativo", SUSPENSO: "Suspenso" } as const;

function Mini({ action, children, confirm }: { action: (s: null) => Promise<never> | Promise<unknown>; children: React.ReactNode; confirm?: string }) {
  return (
    <ActionForm action={action as never} confirm={confirm} className="inline" inlineFeedback>
      <SubmitButton className="btn-secondary btn-sm" pendingText="…">{children}</SubmitButton>
    </ActionForm>
  );
}

export function PortalAccessPanel({ clientId, users }: { clientId: string; users: PortalUserRow[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Quem pode entrar no Portal do Cliente desta empresa. O cliente só vê os dados desta empresa e não acessa a Central.</p>
      {users.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-hair">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-brand-900">{u.name}</p>
                <p className="truncate text-xs text-slate-500">{u.email} · {u.revoked ? "Acesso removido" : LABEL[u.status]}{u.lastLoginAt ? ` · último acesso ${new Date(u.lastLoginAt).toLocaleDateString("pt-BR")}` : ""}</p>
              </div>
              {!u.revoked && (
                <div className="flex flex-wrap gap-1.5">
                  {u.status === "CONVIDADO" && <Mini action={reinvitePortalAction.bind(null, u.id, clientId) as never}>Novo convite</Mini>}
                  {u.status === "SUSPENSO" ? <Mini action={suspendPortalAction.bind(null, u.id, false) as never}>Reativar</Mini> : <Mini action={suspendPortalAction.bind(null, u.id, true) as never} confirm="Suspender o acesso e encerrar as sessões abertas?">Suspender</Mini>}
                  <Mini action={revokePortalAction.bind(null, u.id, clientId) as never} confirm="Remover o acesso desta pessoa a esta empresa?">Remover</Mini>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={invitePortalAction.bind(null, clientId)} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Nome" name="name" required><input id="name" name="name" required className="input" autoComplete="off" /></Field>
        <Field label="E-mail" name="email" required><input id="email" name="email" type="email" required className="input" autoComplete="off" /></Field>
        <SubmitButton className="btn-primary" pendingText="Enviando…">Convidar</SubmitButton>
      </ActionForm>
    </div>
  );
}

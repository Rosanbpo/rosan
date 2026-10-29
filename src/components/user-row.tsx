"use client";

import { useState } from "react";
import { ROLES, ROLE_LABEL, type Role } from "@/domain/enums";
import { resetPasswordAction, updateUserAction } from "@/app/actions/settings";
import { ActionForm, SubmitButton } from "./ui/action-form";

export function UserRow({
  user,
  isSelf,
}: {
  user: { id: string; name: string; email: string; role: Role; active: boolean; clients: number };
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <tr className={user.active ? "" : "text-slate-400"}>
        <td>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </td>
        <td>{ROLE_LABEL[user.role]}</td>
        <td>{user.active ? "Ativo" : "Inativo"}</td>
        <td className="text-right tabular-nums">{user.role === "ADMIN" ? "todos" : user.clients}</td>
        <td className="text-right">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)} aria-label={`Editar ${user.name}`}>
            Editar
          </button>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={5} className="bg-slate-50">
        <div className="grid gap-4 md:grid-cols-2">
          <ActionForm action={updateUserAction.bind(null, user.id)} className="space-y-3" onSuccess={() => setEditing(false)}>
            <p className="text-sm font-semibold">{user.email}</p>
            <div>
              <label className="label" htmlFor={`n-${user.id}`}>
                Nome
              </label>
              <input id={`n-${user.id}`} name="name" defaultValue={user.name} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor={`r-${user.id}`}>
                Papel
              </label>
              <select id={`r-${user.id}`} name="role" defaultValue={user.role} className="input" disabled={isSelf}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              {isSelf && <input type="hidden" name="role" value={user.role} />}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={user.active} disabled={isSelf} />
              Acesso ativo
              {isSelf && <input type="hidden" name="active" value="on" />}
            </label>
            <div className="flex gap-2">
              <SubmitButton>Salvar</SubmitButton>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </ActionForm>
          <ActionForm action={resetPasswordAction.bind(null, user.id)} className="space-y-3" resetOnSuccess confirm={`Redefinir a senha de ${user.name}?`}>
            <p className="text-sm font-semibold">Redefinir senha</p>
            <div>
              <label className="label" htmlFor={`p-${user.id}`}>
                Nova senha (mín. 8 caracteres)
              </label>
              <input id={`p-${user.id}`} type="password" name="password" minLength={8} required className="input" autoComplete="new-password" />
            </div>
            <SubmitButton className="btn-secondary">Redefinir</SubmitButton>
          </ActionForm>
        </div>
      </td>
    </tr>
  );
}

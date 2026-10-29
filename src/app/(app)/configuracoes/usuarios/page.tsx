import { Card, PageHeader } from "@/components/ui/layout";
import { SettingsNav } from "@/components/settings-nav";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { UserRow } from "@/components/user-row";
import { createUserAction } from "@/app/actions/settings";
import { ROLES, ROLE_LABEL } from "@/domain/enums";
import { requirePermission } from "@/server/context";
import { listUsers } from "@/server/services/users";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const actor = await requirePermission("users.manage");
  const memberships = await listUsers(actor);
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsNav current="/configuracoes/usuarios" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Usuários da empresa" className="xl:col-span-2" bodyClassName="p-0" description="Vínculo com clientes é definido no cadastro de cada cliente. Usuários inativos perdem o acesso imediatamente; o histórico é preservado.">
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Usuários</caption>
              <thead>
                <tr>
                  <th scope="col">Usuário</th>
                  <th scope="col">Papel</th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="text-right">Clientes</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <UserRow
                    key={m.id}
                    isSelf={m.userId === actor.userId}
                    user={{
                      id: m.user.id,
                      name: m.user.name,
                      email: m.user.email,
                      role: m.role,
                      active: m.active && m.user.active,
                      clients: m.user._count.clientMemberships,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Novo usuário">
          <ActionForm action={createUserAction} className="space-y-3" resetOnSuccess>
            <Field label="Nome" name="name" required>
              <input id="name" name="name" required className="input" />
            </Field>
            <Field label="E-mail" name="email" required>
              <input id="email" type="email" name="email" required className="input" autoComplete="off" />
            </Field>
            <Field label="Papel" name="role" required>
              <select id="role" name="role" className="input" defaultValue="OPERADOR">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Senha inicial" name="password" required hint="Mínimo de 8 caracteres. Oriente a pessoa a trocá-la em “Minha conta”.">
              <input id="password" type="password" name="password" minLength={8} required className="input" autoComplete="new-password" />
            </Field>
            <SubmitButton>Criar usuário</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}

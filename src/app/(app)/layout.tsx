import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { ROLE_LABEL } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { APP_NAME } from "@/lib/app-config";
import { requireActor } from "@/server/context";
import { prisma } from "@/server/db";
import { buildTaskWhere } from "@/server/services/tasks";
import { getRunningTimer } from "@/server/services/timer";
import { RunningTimerPill } from "@/components/task-timer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const [org, myOverdue, running] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { name: true } }),
    prisma.task.count({ where: buildTaskWhere(actor, { assigneeId: actor.userId, overdue: true }) }),
    getRunningTimer(actor),
  ]);

  const items: NavItem[] = [
    ...(can(actor, "dashboard.view") ? [{ href: "/painel", label: "Painel do gestor", icon: "painel" as const }] : []),
    { href: "/minha-operacao", label: "Minha operação", icon: "operacao", badge: myOverdue },
    { href: "/tarefas", label: "Tarefas", icon: "tarefas" },
    { href: "/pendencias", label: "Pendências", icon: "pendencias" },
    { href: "/documentos", label: "Documentos dos clientes", icon: "documentos" },
    { href: "/clientes", label: "Clientes", icon: "clientes" },
    ...(can(actor, "finance.view") ? [{ href: "/carteira", label: "Carteira e rentabilidade", icon: "carteira" as const }] : []),
    ...(can(actor, "crm.manage") ? [{ href: "/crm", label: "CRM comercial", icon: "crm" as const }] : []),
    ...(can(actor, "crm.manage") ? [{ href: "/propostas", label: "Propostas", icon: "propostas" as const }] : []),
    ...(can(actor, "contracts.manage") ? [{ href: "/contratos", label: "Contratos", icon: "contratos" as const }] : []),
    ...(can(actor, "pricing.manage") ? [{ href: "/precificacao", label: "Precificação", icon: "precificacao" as const }] : []),
    { href: "/projetos", label: "Projetos", icon: "projetos" },
    { href: "/pops", label: "Processos e POPs", icon: "pops" },
    ...(can(actor, "recurrences.manage") ? [{ href: "/rotinas", label: "Modelos e recorrências", icon: "rotinas" as const }] : []),
    ...(can(actor, "org.settings") ? [{ href: "/configuracoes", label: "Configurações", icon: "config" as const }] : []),
    { href: "/conta", label: "Minha conta", icon: "conta" },
  ];

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2">
        Pular para o conteúdo
      </a>
      <Sidebar
        items={items}
        appName={APP_NAME}
        orgName={org.name}
        userName={actor.name}
        roleLabel={ROLE_LABEL[actor.role]}
        footer={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn btn-sm -ml-2 text-slate-300 hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden className="h-3.5 w-3.5" /> Sair
            </button>
          </form>
        }
      />
      <main id="conteudo" className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      {running && <RunningTimerPill taskId={running.taskId} taskTitle={running.taskTitle} clientName={running.clientName} startedAt={running.startedAt} />}
    </div>
  );
}

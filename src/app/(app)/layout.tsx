import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { SectionTabs, type SectionDef } from "@/components/section-tabs";
import { ROLE_LABEL } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { APP_NAME } from "@/lib/app-config";
import { requireActor } from "@/server/context";
import { allowedSections } from "@/server/services/library";
import { prisma } from "@/server/db";
import { buildTaskWhere } from "@/server/services/tasks";
import { getRunningTimer } from "@/server/services/timer";
import { RunningTimerPill } from "@/components/task-timer";

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const actor = await requireActor();
  const [org, myOverdue, running] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { name: true } }),
    prisma.task.count({ where: buildTaskWhere(actor, { assigneeId: actor.userId, overdue: true }) }),
    getRunningTimer(actor),
  ]);

  const lib = await allowedSections(actor);
  const dash = can(actor, "dashboard.view");
  const fin = can(actor, "finance.view");
  const crm = can(actor, "crm.manage");
  const items: NavItem[] = [
    ...(dash ? [{ group: "Operação", href: "/inicio", label: "Início", icon: "inicio" as const }] : []),
    { group: "Operação", href: "/tarefas", label: "Tarefas", icon: "tarefas", badge: myOverdue, match: ["/pendencias", "/avulsas", "/agenda", "/minha-operacao"] },
    ...(can(actor, "recurrences.manage") ? [{ group: "Operação", href: "/rotinas", label: "Rotinas", icon: "rotinas" as const }] : []),
    { group: "Operação", href: "/projetos", label: "Projetos", icon: "projetos" },
    { group: "Clientes", href: "/clientes", label: "Clientes", icon: "clientes", match: ["/central", "/cofre"] },
    ...(crm ? [{ group: "Comercial", href: "/crm", label: "Funil", icon: "crm" as const, match: ["/comercial"] }] : []),
    ...(crm || can(actor, "contracts.manage") ? [{ group: "Comercial", href: crm ? "/propostas" : "/contratos", label: "Propostas e contratos", icon: "propostas" as const, match: ["/propostas", "/contratos"] }] : []),
    ...(can(actor, "pricing.manage") ? [{ group: "Comercial", href: "/precificacao", label: "Precificação", icon: "precificacao" as const }] : []),
    ...(crm ? [{ group: "Comercial", href: "/marketing", label: "Marketing", icon: "marketing" as const }] : []),
    ...(dash ? [{ group: "Gestão", href: "/executivo", label: "Visão geral", icon: "executivo" as const, match: ["/metas", "/simulador", "/churn"] }] : []),
    ...(fin ? [{ group: "Gestão", href: "/carteira", label: "Rentabilidade", icon: "carteira" as const }] : []),
    ...(dash ? [{ group: "Gestão", href: "/equipe", label: "Equipe", icon: "equipe" as const }] : []),
    ...(dash ? [{ group: "Gestão", href: "/relatorios", label: "Relatórios", icon: "relatorios" as const }] : []),
    { group: "Conhecimento", href: "/biblioteca", label: "Conhecimento", icon: "biblioteca", match: ["/pops", "/cultura"] },
    ...(can(actor, "org.settings") ? [{ group: "Sistema", href: "/configuracoes", label: "Configuração", icon: "config" as const }] : []),
    { group: "Sistema", href: "/conta", label: "Minha conta", icon: "conta" },
  ];
  const sections: SectionDef[] = [
    { tabs: [{ href: "/tarefas", label: "Tarefas" }, { href: "/pendencias", label: "Pendências" }, { href: "/avulsas", label: "Avulsas" }, ...(dash ? [{ href: "/agenda", label: "Agenda" }] : []), { href: "/minha-operacao", label: "Meu painel" }] },
    { tabs: [{ href: "/clientes", label: "Clientes" }, ...(dash ? [{ href: "/central", label: "Central" }] : []), { href: "/cofre", label: "Cofre de acessos" }] },
    ...(crm ? [{ tabs: [{ href: "/crm", label: "Funil" }, { href: "/comercial", label: "Painel comercial" }] }] : []),
    ...(crm ? [{ tabs: [{ href: "/propostas", label: "Propostas" }, ...(can(actor, "contracts.manage") ? [{ href: "/contratos", label: "Contratos" }] : [])] }] : []),
    ...(dash ? [{ tabs: [{ href: "/executivo", label: "Executivo" }, { href: "/metas", label: "Metas" }, { href: "/simulador", label: "Simulador" }, { href: "/churn", label: "Saídas" }] }] : []),
    { tabs: [{ href: "/biblioteca", label: "Estrutura Rosan" }, ...(lib.includes("pops") ? [{ href: "/pops", label: "Processos e POPs" }] : []), ...(lib.includes("cultura") ? [{ href: "/cultura", label: "Missão e valores" }] : [])] },
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
      <main id="conteudo" className="px-4 py-6 sm:px-6 lg:ml-56 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTabs sections={sections} />
          {children}
        </div>
      </main>
      {modal}
      {running && <RunningTimerPill taskId={running.taskId} taskTitle={running.taskTitle} clientName={running.clientName} startedAt={running.startedAt} />}
    </div>
  );
}

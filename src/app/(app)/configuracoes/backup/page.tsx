import { Download } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/layout";
import { SettingsNav } from "@/components/settings-nav";
import { requirePermission } from "@/server/context";

export const metadata = { title: "Backup dos dados" };

export default async function BackupPage() {
  await requirePermission("org.settings");
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsNav current="/configuracoes/backup" />
      <Card title="Cópia dos dados" className="max-w-xl">
        <div className="space-y-3 text-sm text-slate-700">
          <p>Baixa um arquivo com clientes, tarefas, POPs, atas, leads, propostas, contratos, projetos, pendências e horas da sua empresa.</p>
          <p className="text-slate-500">Não inclui senhas de login, códigos de duas etapas nem as senhas do cofre. Guarde o arquivo em local seguro: ele contém dados dos seus clientes. Cada download fica registrado.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/configuracoes/backup/exportar" className="btn-primary" download>
            <Download aria-hidden className="h-4 w-4" /> Baixar cópia (JSON)
          </a>
        </div>
      </Card>
    </>
  );
}

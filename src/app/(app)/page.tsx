import { redirect } from "next/navigation";
import { can } from "@/domain/permissions";
import { requireActor } from "@/server/context";

export default async function Home() {
  const actor = await requireActor();
  redirect(can(actor, "dashboard.view") ? "/painel" : "/minha-operacao");
}

import { z } from "zod";
import { DEFAULT_CLOSING_ITEMS } from "@/domain/closing";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

export const ONBOARDING_DEFAULTS = [
  "Kick-off & Acessos | 3 | Reunião de kick-off, alinhamento de combinados e coleta de acessos (bancos, sistemas, e-mail).",
  "Mapeamento & Estruturação Interna | 10 | Mapear contas, categorias, rotinas e responsáveis; estruturar o plano de contas.",
  "Testes, Validações & Primeiros Relatórios | 20 | Validar lançamentos e conciliações e entregar os primeiros relatórios.",
  "Go-live Oficial | 27 | Iniciar a rotina oficial de operação do cliente.",
  "Acompanhamento & Feedback | 45 | Reunião de acompanhamento e coleta de feedback do cliente.",
];

export type ChecklistKind = "CLOSING" | "ONBOARDING";
const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

export async function getChecklistLines(organizationId: string, kind: ChecklistKind): Promise<string[]> {
  const row = await prisma.checklistTemplate.findUnique({ where: { organizationId_kind: { organizationId, kind } } });
  const saved = row ? lines(row.items) : [];
  if (saved.length) return saved;
  return kind === "CLOSING" ? [...DEFAULT_CLOSING_ITEMS] : ONBOARDING_DEFAULTS;
}

/** Etapas do onboarding: "Título | dias | descrição". */
export async function onboardingSteps(organizationId: string) {
  return (await getChecklistLines(organizationId, "ONBOARDING")).map((l) => {
    const [title, days, ...rest] = l.split("|").map((x) => x.trim());
    return { title: title!, days: Math.max(0, Math.min(365, Number(days) || 7)), description: rest.join(" | ") };
  });
}

export async function saveChecklist(actor: Actor, kind: ChecklistKind, text: string) {
  assertCan(actor, "org.settings");
  const items = z.string().max(6000).parse(text);
  const n = lines(items);
  if (n.length > 40) throw new ValidationError("Use no máximo 40 itens.");
  if (n.some((l) => l.length > 400)) throw new ValidationError("Item muito longo.");
  await prisma.checklistTemplate.upsert({ where: { organizationId_kind: { organizationId: actor.organizationId, kind } }, create: { organizationId: actor.organizationId, kind, items: n.join("\n") }, update: { items: n.join("\n") } });
}

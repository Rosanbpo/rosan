import { DEFAULT_SCRIPT_BODY, parseScript, SCRIPT_TITLE } from "@/domain/diagnosis-script";
import { assertCan, NotFoundError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { listAssets } from "./journey";

/** O roteiro é o documento padrão da jornada; aqui garantimos que ele exista no formato novo. */
async function scriptBody(actor: Actor) {
  const assets = await listAssets(actor);
  const found = assets.find((a) => a.title === SCRIPT_TITLE);
  if (found && (found.body ?? "").includes("\n## ")) return { id: found.id, body: found.body! };
  if (found) {
    // versão antiga (rascunho sem partes): troca pelo roteiro novo
    await prisma.journeyAsset.update({ where: { id: found.id }, data: { body: DEFAULT_SCRIPT_BODY } });
    return { id: found.id, body: DEFAULT_SCRIPT_BODY };
  }
  const created = await prisma.journeyAsset.create({
    data: {
      organizationId: actor.organizationId, kind: "DOCUMENTO", title: SCRIPT_TITLE, body: DEFAULT_SCRIPT_BODY, stage: "COMERCIAL",
      taskRefs: ["jornada-comercial|Reunião de diagnóstico financeiro", "jornada-comercial|Levantar informações para a proposta"], position: assets.length,
    },
  });
  return { id: created.id, body: DEFAULT_SCRIPT_BODY };
}

async function ownLead(actor: Actor, leadId: string) {
  assertCan(actor, "crm.manage");
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: actor.organizationId }, select: { id: true, companyName: true, contactName: true } });
  if (!lead) throw new NotFoundError("Lead não encontrado.");
  return lead;
}

export async function leadScript(actor: Actor, leadId: string) {
  const lead = await ownLead(actor, leadId);
  const { body } = await scriptBody(actor);
  const state = await prisma.leadScript.findUnique({ where: { leadId } });
  return {
    lead,
    script: parseScript(body),
    checked: state?.checked ?? [],
    notes: (state?.notes ?? {}) as Record<string, string>,
    finalNotes: state?.finalNotes ?? "",
  };
}

export async function saveLeadScript(actor: Actor, leadId: string, input: { checked: string[]; notes: Record<string, string>; finalNotes: string }) {
  await ownLead(actor, leadId);
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.notes ?? {})) if (/^s\d+$/.test(k)) notes[k] = String(v).slice(0, 5000);
  const data = {
    checked: (input.checked ?? []).filter((c) => /^s\d+\.\d+$/.test(c)).slice(0, 200),
    notes,
    finalNotes: String(input.finalNotes ?? "").slice(0, 10000),
  };
  await prisma.leadScript.upsert({ where: { leadId }, create: { organizationId: actor.organizationId, leadId, ...data }, update: data });
}

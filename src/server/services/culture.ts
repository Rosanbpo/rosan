import { textToValues, type CultureValue } from "@/domain/culture";
import { assertCan, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

export async function getCulture(actor: Actor) {
  const row = await prisma.companyCulture.findUnique({ where: { organizationId: actor.organizationId } });
  return { mission: row?.mission ?? "", vision: row?.vision ?? "", values: ((row?.values as unknown as CultureValue[]) ?? []).filter((v) => v?.title) };
}

export async function saveCulture(actor: Actor, raw: Record<string, unknown>) {
  assertCan(actor, "org.settings");
  const data = {
    mission: String(raw.mission ?? "").trim().slice(0, 1200) || null,
    vision: String(raw.vision ?? "").trim().slice(0, 1200) || null,
    values: textToValues(String(raw.values ?? "")) as unknown as object,
  };
  await prisma.companyCulture.upsert({ where: { organizationId: actor.organizationId }, create: { organizationId: actor.organizationId, ...data }, update: data });
}

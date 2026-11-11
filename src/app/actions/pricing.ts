"use server";

import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as pricing from "@/server/services/pricing";

export async function savePricingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(
    async (actor) => {
      const { payload } = formObject(fd, { json: ["payload"] });
      await pricing.savePricing(actor, payload);
      return "Precificação salva.";
    },
    { revalidate: ["/precificacao"] },
  );
}

export async function applyHourCostAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  return runAction(
    async (actor) => {
      await pricing.applyHourCost(actor);
      return "Custo da hora atualizado na rentabilidade.";
    },
    { revalidate: ["/precificacao", "/carteira"] },
  );
}

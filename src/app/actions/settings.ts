"use server";

import { revalidatePath } from "next/cache";
import { assertCan, ValidationError } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as holidays from "@/server/services/holidays";
import * as users from "@/server/services/users";
import * as twoFactor from "@/server/services/two-factor";
import { hourCostSchema, parseInput } from "@/server/validation";
import { setBusinessGoals } from "@/server/services/executive";
import { setHourCost } from "@/server/services/portfolio";
import { runScheduler } from "@/server/services/generator";

export async function createUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await users.createUser(actor, formObject(fd));
    return "Usuário criado. Informe a senha inicial à pessoa por um canal seguro.";
  });
}

export async function updateUserAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await users.updateUser(actor, userId, formObject(fd));
    return "Usuário atualizado.";
  });
}

export async function resetPasswordAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await users.resetPassword(actor, userId, String(fd.get("password") ?? ""));
    return "Senha redefinida.";
  });
}

export async function changeOwnPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    if (fd.get("next") !== fd.get("confirm")) {
      throw new ValidationError("A confirmação não confere com a nova senha.", { confirm: "As senhas não conferem." });
    }
    await users.changeOwnPassword(actor, String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
    return "Senha alterada.";
  });
}

export async function updateOrganizationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await users.updateOrganizationProfile(actor, formObject(fd));
    return "Dados da empresa atualizados.";
  });
}

export async function addHolidayAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await holidays.addHoliday(actor, formObject(fd));
    return "Feriado cadastrado.";
  });
}

export async function removeHolidayAction(id: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await holidays.removeHoliday(actor, id);
    return "Feriado removido.";
  });
}

export async function importHolidaysAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const count = await holidays.importNationalHolidays(
      actor,
      Number(fd.get("year")),
      fd.get("includeOptional") === "on",
    );
    return count ? `${count} feriado(s) incluído(s). Revise a lista.` : "Nenhum feriado novo: as datas já estavam cadastradas.";
  });
}

/** Executa a geração manualmente (apenas para a empresa do administrador). */
export async function runSchedulerNowAction(_: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    assertCan(actor, "org.settings");
    const res = await runScheduler({ trigger: `manual:${actor.userId}`, organizationId: actor.organizationId });
    if (res.locked) return "Outra execução está em andamento. Tente novamente em instantes.";
    return `Geração concluída: ${res.created} tarefa(s) criada(s), ${res.skipped} já existente(s)${
      res.errors.length ? `, ${res.errors.length} erro(s)` : ""
    }.`;
  });
}

export async function updateHourCostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const input = parseInput(hourCostSchema, formObject(fd));
    await setHourCost(actor, input.hourCost);
    return "Custo da hora atualizado.";
  });
}

export async function updateBusinessGoalsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await setBusinessGoals(actor, formObject(fd));
    revalidatePath("/executivo");
    return "Metas e capacidade atualizadas.";
  });
}

export async function resetTwoFactorAction(userId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await twoFactor.resetTwoFactor(actor, userId);
    return "Duas etapas redefinidas. A pessoa pode ativar de novo em Minha conta.";
  });
}

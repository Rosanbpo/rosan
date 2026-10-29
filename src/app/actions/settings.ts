"use server";

import { assertCan, ValidationError } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as holidays from "@/server/services/holidays";
import * as users from "@/server/services/users";
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
    await users.updateOrganization(actor, String(fd.get("name") ?? ""));
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

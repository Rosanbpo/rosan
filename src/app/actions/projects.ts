"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as projects from "@/server/services/projects";

export async function createProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await projects.createProject(actor, formObject(fd))).id;
  });
  if (res?.ok) redirect(`/projetos/${id}`);
  return res;
}

export async function updateProjectAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await projects.updateProject(actor, id, formObject(fd));
  });
  if (res?.ok) redirect(`/projetos/${id}`);
  return res;
}

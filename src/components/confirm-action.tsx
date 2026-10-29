"use client";

import type { ActionState } from "@/lib/action-state";
import { ActionForm, SubmitButton } from "./ui/action-form";

/** Botão de ação com confirmação (para ações destrutivas ou sensíveis). */
export function ConfirmAction({
  action,
  label,
  confirm,
  className = "btn-secondary",
  pendingText = "Processando…",
}: {
  action: (s: ActionState) => Promise<ActionState>;
  label: string;
  confirm: string;
  className?: string;
  pendingText?: string;
}) {
  return (
    <ActionForm action={action} confirm={confirm} inlineFeedback>
      <SubmitButton className={className} pendingText={pendingText}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

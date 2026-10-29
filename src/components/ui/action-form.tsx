"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { cx } from "@/lib/ui";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FieldErrorsContext = createContext<Record<string, string>>({});

/**
 * Formulário ligado a uma Server Action com feedback de carregamento,
 * sucesso e erro. Opcionalmente pede confirmação antes de enviar.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess = false,
  showSuccess = true,
  onSuccess,
  inlineFeedback = false,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
  showSuccess?: boolean;
  onSuccess?: () => void;
  inlineFeedback?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);

  return (
    <FieldErrorsContext.Provider value={state?.fieldErrors ?? {}}>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        noValidate={false}
        onSubmit={(e) => {
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
      >
        {children}
        {state && (state.error || (showSuccess && state.message)) && (
          <FormMessage state={state} inline={inlineFeedback} />
        )}
      </form>
    </FieldErrorsContext.Provider>
  );
}

function FormMessage({ state, inline }: { state: NonNullable<ActionState>; inline: boolean }) {
  const ok = state.ok;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={cx(
        "flex items-start gap-2 rounded-md text-sm",
        inline ? "mt-1" : "mt-3 px-3 py-2",
        ok ? "text-emerald-800" : "text-red-700",
        !inline && (ok ? "bg-emerald-50" : "bg-red-50"),
      )}
    >
      {ok ? <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{ok ? state.message : state.error}</span>
    </p>
  );
}

export function FieldError({ name }: { name: string }) {
  const errors = useContext(FieldErrorsContext);
  if (!errors[name]) return null;
  return (
    <p className="mt-1 text-xs text-red-700" role="alert">
      {errors[name]}
    </p>
  );
}

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "Salvando…",
  name,
  value,
  title,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} name={name} value={value} title={title}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Campo com rótulo, dica e mensagem de erro do servidor. */
export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
        {required && (
          <span className="text-red-600" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

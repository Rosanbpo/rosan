export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Muda a cada submissão, para os componentes reagirem mesmo com mensagens iguais. */
  at?: number;
} | null;

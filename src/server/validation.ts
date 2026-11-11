import { z } from "zod";
import { ValidationError } from "@/domain/permissions";
import { isValidLocalDate } from "@/domain/dates";
import {
  CLIENT_STATUSES,
  COMPETENCE_RULES,
  FREQUENCIES,
  LEAD_ACTIVITY_KINDS,
  LEAD_STAGES,
  NON_BUSINESS_RULES,
  PRIORITIES,
  PROCEDURE_STATUSES,
  PROJECT_STATUSES,
  ROLES,
  TASK_CATEGORIES,
} from "@/domain/enums";
import { validateRule } from "@/domain/recurrence";
import { splitLines } from "@/domain/proposal";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalText = (max = 2000) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional());
const requiredText = (label: string, max = 200) =>
  z.string({ required_error: `${label} é obrigatório.` }).trim().min(2, `${label} é obrigatório.`).max(max);
const optionalId = z.preprocess(emptyToUndefined, z.string().min(1).optional());
export const localDate = z.string().refine(isValidLocalDate, "Data inválida.");
const optionalLocalDate = z.preprocess(emptyToUndefined, localDate.optional());
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (use HH:mm).");
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: "Número inválido." }).int("Use um número inteiro.").min(min).max(max).optional(),
  );
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const intArray = z.array(z.coerce.number().int());

/** Valor em reais: aceita "1500", "1.500,00", "R$ 1.500,50". Vazio vira indefinido. */
export function parseMoney(v: unknown): unknown {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "number") return v;
  const text = String(v).trim();
  if (text === "") return undefined;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned) return NaN;
  let normalized: string;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  // "2.500" ou "1.250.000" sem vírgula: pontos são separadores de milhar.
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  else normalized = cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}
const optionalMoney = z.preprocess(
  parseMoney,
  z.number({ invalid_type_error: "Valor inválido." }).min(0, "O valor não pode ser negativo.").max(100_000_000).optional(),
);

/** Valida CNPJ (apenas dígitos verificadores; não consulta a Receita). */
export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

export const clientSchema = z.object({
  legalName: requiredText("Razão social"),
  tradeName: requiredText("Nome fantasia"),
  cnpj: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(isValidCnpj, "CNPJ inválido.")
      .transform((v) => v.replace(/\D/g, ""))
      .optional(),
  ),
  contactName: optionalText(200),
  contactEmail: z.preprocess(emptyToUndefined, z.string().trim().email("E-mail inválido.").optional()),
  contactPhone: optionalText(50),
  contactChannels: optionalText(500),
  status: z.enum(CLIENT_STATUSES),
  services: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  startDate: optionalLocalDate,
  notes: optionalText(5000),
  monthlyFee: optionalMoney,
  billingDay: optionalInt(1, 31),
  responsibleOperatorId: optionalId,
  managerId: optionalId,
  memberIds: z.array(z.string().min(1)).default([]),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const checklistDraftSchema = z.array(
  z.object({ label: z.string().trim().min(1).max(300), required: z.boolean().default(false) }),
);

export const taskCreateSchema = z.object({
  clientId: z.string({ required_error: "Selecione o cliente." }).min(1, "Selecione o cliente."),
  title: requiredText("Título"),
  description: optionalText(5000),
  category: z.enum(TASK_CATEGORIES),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  assigneeId: optionalId,
  reviewerId: optionalId,
  competence: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Competência inválida (AAAA-MM).").optional(),
  ),
  startDate: optionalLocalDate,
  startTime: z.preprocess(emptyToUndefined, timeOfDay.optional()),
  dueDate: localDate,
  dueTime: timeOfDay,
  estimatedMinutes: optionalInt(1, 100_000),
  requiresEvidence: checkbox,
  projectId: optionalId,
  checklist: checklistDraftSchema.default([]),
});
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

export const taskUpdateSchema = taskCreateSchema.omit({ clientId: true, checklist: true });
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

const ruleFields = {
  frequency: z.enum(FREQUENCIES),
  weekdays: intArray.default([]),
  monthDays: intArray.default([]),
  nthBusinessDay: optionalInt(1, 23),
  dueTime: timeOfDay,
  leadDays: z.coerce.number().int().min(0, "Mínimo 0.").max(60, "Máximo 60 dias."),
  startOffsetDays: z.coerce.number().int().min(0).max(60),
  nonBusinessDayRule: z.enum(NON_BUSINESS_RULES),
};

function ruleRefinement(
  data: { frequency: (typeof FREQUENCIES)[number]; weekdays: number[]; monthDays: number[]; nthBusinessDay?: number; startDate?: string; endDate?: string },
  ctx: z.RefinementCtx,
) {
  const error = validateRule({
    frequency: data.frequency,
    weekdays: data.weekdays,
    monthDays: data.monthDays,
    nthBusinessDay: data.nthBusinessDay ?? null,
    nonBusinessDayRule: "POSTPONE",
    startDate: data.startDate ?? "2000-01-01",
    endDate: data.endDate ?? null,
  });
  if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error, path: ["frequency"] });
}

export const templateSchema = z
  .object({
    name: requiredText("Nome do modelo"),
    title: requiredText("Título da tarefa"),
    description: optionalText(5000),
    category: z.enum(TASK_CATEGORIES),
    priority: z.enum(PRIORITIES),
    estimatedMinutes: optionalInt(1, 100_000),
    requiresEvidence: checkbox,
    competenceRule: z.enum(COMPETENCE_RULES),
    checklist: checklistDraftSchema.default([]),
    ...ruleFields,
  })
  .superRefine(ruleRefinement);
export type TemplateInput = z.infer<typeof templateSchema>;

export const recurrenceSchema = z
  .object({
    clientId: z.string().min(1, "Selecione o cliente."),
    templateId: z.string().min(1, "Selecione o modelo."),
    startDate: localDate,
    endDate: optionalLocalDate,
    assigneeId: optionalId,
    reviewerId: optionalId,
    ...ruleFields,
  })
  .superRefine(ruleRefinement);
export type RecurrenceInput = z.infer<typeof recurrenceSchema>;

export const userCreateSchema = z.object({
  name: requiredText("Nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  role: z.enum(ROLES),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(200),
});

export const userUpdateSchema = z.object({
  name: requiredText("Nome"),
  role: z.enum(ROLES),
  active: checkbox,
});

export const holidaySchema = z.object({ date: localDate, name: requiredText("Descrição", 120) });

export const urlSchema = z
  .string()
  .trim()
  .url("Informe um link válido (https://...).")
  .refine((v) => /^https?:\/\//i.test(v), "Apenas links http(s) são aceitos.");

/** Converte erros do Zod em mapa campo → mensagem. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseInput<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors = zodFieldErrors(result.error);
    throw new ValidationError(Object.values(fieldErrors)[0] ?? "Dados inválidos.", fieldErrors);
  }
  return result.data;
}


// ---------------------------------------------------------------------------
// Escritório virtual
// ---------------------------------------------------------------------------

/** Duração digitada como "90" (minutos), "1:30" ou "1,5" (horas) — sempre devolve minutos. */
export function parseDuration(v: unknown): unknown {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "number") return Math.round(v);
  const text = String(v).trim().toLowerCase();
  const hm = text.match(/^(\d{1,3}):([0-5]\d)$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  if (/^\d+$/.test(text)) return Number(text);
  const hours = Number(text.replace(",", "."));
  return Number.isFinite(hours) ? Math.round(hours * 60) : NaN;
}

export const timeEntrySchema = z.object({
  taskId: optionalId,
  clientId: optionalId,
  workedOn: localDate,
  minutes: z.preprocess(
    parseDuration,
    z
      .number({ required_error: "Informe o tempo.", invalid_type_error: "Tempo inválido. Use 1:30, 90 (min) ou 1,5 (horas)." })
      .int()
      .min(1, "Informe ao menos 1 minuto.")
      .max(24 * 60, "Máximo de 24 horas por lançamento."),
  ),
  note: optionalText(500),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export const leadSchema = z.object({
  companyName: requiredText("Empresa"),
  contactName: optionalText(200),
  contactEmail: z.preprocess(emptyToUndefined, z.string().trim().email("E-mail inválido.").optional()),
  contactPhone: optionalText(50),
  cnpj: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(isValidCnpj, "CNPJ inválido.")
      .transform((v) => v.replace(/\D/g, ""))
      .optional(),
  ),
  source: optionalText(100),
  expectedFee: optionalMoney,
  servicesInterest: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  ownerId: optionalId,
  nextActionAt: optionalLocalDate,
  nextAction: optionalText(300),
  notes: optionalText(5000),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const leadStageSchema = z.object({
  stage: z.enum(LEAD_STAGES),
  lostReason: optionalText(500),
});

export const leadActivitySchema = z.object({
  kind: z.enum(LEAD_ACTIVITY_KINDS),
  body: z.string({ required_error: "Escreva o registro." }).trim().min(2, "Escreva o registro.").max(3000),
});

export const procedureSchema = z.object({
  title: requiredText("Título", 200),
  category: z.enum(TASK_CATEGORIES),
  status: z.enum(PROCEDURE_STATUSES),
  objective: optionalText(1000),
  content: z.string({ required_error: "Descreva o passo a passo." }).trim().min(5, "Descreva o passo a passo.").max(30_000),
  tools: optionalText(500),
  responsible: optionalText(200),
  ownerId: optionalId,
  reviewedAt: optionalLocalDate,
});
export type ProcedureInput = z.infer<typeof procedureSchema>;

export const projectSchema = z
  .object({
    name: requiredText("Nome do projeto"),
    description: optionalText(5000),
    clientId: optionalId,
    status: z.enum(PROJECT_STATUSES),
    startDate: optionalLocalDate,
    dueDate: optionalLocalDate,
    ownerId: optionalId,
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    message: "O prazo não pode ser anterior ao início.",
    path: ["dueDate"],
  });
export type ProjectInput = z.infer<typeof projectSchema>;

export const hourCostSchema = z.object({ hourCost: optionalMoney });

const linesField = (label: string, min = 0) =>
  z.preprocess(
    (v) => (typeof v === "string" ? splitLines(v) : v ?? []),
    z.array(z.string().max(400, "Linha muito longa.")).max(40, `Máximo de 40 itens em ${label}.`).refine((a) => a.length >= min, `Informe ao menos ${min} item em ${label}.`),
  );

export const proposalSchema = z.object({
  leadId: optionalId,
  planName: requiredText("Plano", 100),
  companyName: requiredText("Empresa"),
  contactName: optionalText(200),
  contactEmail: z.preprocess(emptyToUndefined, z.string().trim().email("E-mail inválido.").optional()),
  intro: optionalText(2000),
  services: linesField("serviços", 1),
  volumes: linesField("limites"),
  exclusions: linesField("itens fora do escopo"),
  monthlyFee: z.preprocess(
    parseMoney,
    z.number({ required_error: "Informe a mensalidade.", invalid_type_error: "Valor inválido." }).min(1, "Informe a mensalidade."),
  ),
  billingDay: optionalInt(1, 31).transform((v) => v ?? 10),
  termMonths: optionalInt(1, 60).transform((v) => v ?? 12),
  validUntil: localDate,
  notes: optionalText(3000),
});
export type ProposalInput = z.infer<typeof proposalSchema>;

export const orgProfileSchema = z.object({
  name: requiredText("Nome da empresa"),
  legalName: optionalText(200),
  cnpj: z.preprocess(emptyToUndefined, z.string().refine(isValidCnpj, "CNPJ inválido.").transform((v) => v.replace(/\D/g, "")).optional()),
  email: z.preprocess(emptyToUndefined, z.string().trim().email("E-mail inválido.").optional()),
  phone: optionalText(50),
  website: optionalText(200),
  city: optionalText(100),
});

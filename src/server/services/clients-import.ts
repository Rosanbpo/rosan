import { toCsv, parseCsv } from "@/domain/csv";
import { CLIENT_STATUS_LABEL, JOURNEY_STAGES, STAGE_LABEL, type ClientStatus } from "@/domain/enums";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { can } from "@/domain/permissions";
import { prisma } from "../db";
import { clientScope } from "./access";
import { createClient } from "./clients";

export const CLIENT_CSV_HEADERS = ["Razão social", "Nome fantasia", "CNPJ", "Contato", "E-mail", "Telefone", "Status", "Etapa", "Sistema financeiro", "Mensalidade", "Dia de vencimento", "Início"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const STATUS_BY_LABEL = new Map<string, ClientStatus>([
  ...(Object.entries(CLIENT_STATUS_LABEL) as Array<[ClientStatus, string]>).map(([k, v]) => [norm(v), k] as [string, ClientStatus]),
  ["em implantacao", "IMPLANTACAO"],
]);
const STAGE_BY_LABEL = new Map(JOURNEY_STAGES.map((k) => [norm(STAGE_LABEL[k]), k]));

/** Planilha CSV (abre no Excel) com os clientes que o usuário enxerga. */
export async function exportClientsCsv(actor: Actor): Promise<string> {
  const clients = await prisma.client.findMany({
    where: { ...clientScope(actor), archivedAt: null },
    orderBy: { tradeName: "asc" },
  });
  const finance = can(actor, "finance.view");
  const rows: Array<Array<string | number | null>> = [CLIENT_CSV_HEADERS];
  for (const c of clients) {
    rows.push([
      c.legalName,
      c.tradeName,
      c.cnpj,
      c.contactName,
      c.contactEmail,
      c.contactPhone,
      CLIENT_STATUS_LABEL[c.status],
      c.journeyStage ? STAGE_LABEL[c.journeyStage] : null,
      c.software,
      finance && c.monthlyFee !== null ? Number(c.monthlyFee).toFixed(2).replace(".", ",") : null,
      c.billingDay,
      c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
    ]);
  }
  return toCsv(rows);
}

export function clientCsvTemplate(): string {
  return toCsv([CLIENT_CSV_HEADERS, ["Empresa Exemplo Ltda", "Exemplo", "", "Maria", "maria@exemplo.com", "(11) 99999-0000", "Implantação", "Onboarding", "Omie", "2500,00", 5, ""]]);
}

export interface ImportResult {
  created: number;
  errors: Array<{ line: number; message: string }>;
}

/** Importa clientes de uma planilha CSV. Cada linha é validada como no cadastro; erros não param as demais. */
export async function importClientsCsv(actor: Actor, text: string): Promise<ImportResult> {
  assertCan(actor, "clients.manage");
  const rows = parseCsv(text);
  if (rows.length < 2) throw new ValidationError("A planilha precisa ter o cabeçalho e ao menos um cliente.");
  if (rows.length > 501) throw new ValidationError("Importe no máximo 500 clientes por vez.");
  const header = rows[0]!.map(norm);
  const col = (...names: string[]) => header.findIndex((h) => names.map(norm).includes(h));
  const idx = {
    legalName: col("razao social"),
    tradeName: col("nome fantasia", "nome"),
    cnpj: col("cnpj"),
    contactName: col("contato"),
    contactEmail: col("e-mail", "email"),
    contactPhone: col("telefone"),
    status: col("status"),
    stage: col("etapa"),
    software: col("sistema financeiro", "sistema"),
    fee: col("mensalidade"),
    billingDay: col("dia de vencimento", "vencimento"),
    startDate: col("inicio"),
  };
  if (idx.tradeName < 0 && idx.legalName < 0) throw new ValidationError("Não encontrei a coluna \"Nome fantasia\" ou \"Razão social\".");
  const result: ImportResult = { created: 0, errors: [] };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const get = (k: number) => (k >= 0 ? (r[k] ?? "") : "");
    const trade = get(idx.tradeName) || get(idx.legalName);
    const status = get(idx.status) ? STATUS_BY_LABEL.get(norm(get(idx.status))) : "IMPLANTACAO";
    const stage = get(idx.stage) ? STAGE_BY_LABEL.get(norm(get(idx.stage))) : undefined;
    if (!status) {
      result.errors.push({ line: i + 1, message: `Status "${get(idx.status)}" não existe.` });
      continue;
    }
    if (get(idx.stage) && !stage) {
      result.errors.push({ line: i + 1, message: `Etapa "${get(idx.stage)}" não existe.` });
      continue;
    }
    try {
      await createClient(actor, {
        legalName: get(idx.legalName) || trade,
        tradeName: trade,
        cnpj: get(idx.cnpj),
        contactName: get(idx.contactName),
        contactEmail: get(idx.contactEmail),
        contactPhone: get(idx.contactPhone),
        status,
        journeyStage: stage ?? "",
        software: get(idx.software),
        monthlyFee: get(idx.fee),
        billingDay: get(idx.billingDay),
        startDate: get(idx.startDate),
        services: [],
        memberIds: [],
      });
      result.created++;
    } catch (e) {
      result.errors.push({ line: i + 1, message: e instanceof ValidationError ? e.message : "Não foi possível cadastrar esta linha." });
    }
  }
  return result;
}

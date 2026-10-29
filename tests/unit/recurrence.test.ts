import { describe, expect, it } from "vitest";
import { addDays, competenceOf, instantToLocalDate, localDateTimeToInstant, weekday } from "@/domain/dates";
import { brazilianNationalHolidays, easterSunday } from "@/domain/holidays";
import {
  adjustToBusinessDay,
  clampDayOfMonth,
  nextOccurrence,
  nthBusinessDayOfMonth,
  occurrencesBetween,
  occurrencesDue,
  taskTimingFor,
  validateRule,
  type RecurrenceRule,
} from "@/domain/recurrence";

const none = new Set<string>();
const rule = (r: Partial<RecurrenceRule>): RecurrenceRule => ({
  frequency: "MONTHLY_DAY",
  weekdays: [],
  monthDays: [],
  nthBusinessDay: null,
  nonBusinessDayRule: "POSTPONE",
  startDate: "2026-01-01",
  endDate: null,
  ...r,
});

describe("datas e fuso", () => {
  it("converte horário de São Paulo para UTC (UTC-3, sem horário de verão)", () => {
    const instant = localDateTimeToInstant("2026-03-10", "18:00", "America/Sao_Paulo");
    expect(instant.toISOString()).toBe("2026-03-10T21:00:00.000Z");
  });

  it("considera a data local de São Paulo, não a de UTC", () => {
    // 01:30 UTC de 11/03 ainda é 10/03 em São Paulo
    expect(instantToLocalDate(new Date("2026-03-11T01:30:00Z"), "America/Sao_Paulo")).toBe("2026-03-10");
  });

  it("calcula competência atual e anterior, inclusive na virada do ano", () => {
    expect(competenceOf("2026-01-05", "PREVIOUS_MONTH")).toBe("2025-12");
    expect(competenceOf("2026-01-05", "CURRENT_MONTH")).toBe("2026-01");
    expect(competenceOf("2026-01-05", "NONE")).toBeNull();
  });
});

describe("dias úteis", () => {
  it("posterga sábado para segunda e antecipa para sexta", () => {
    expect(weekday("2026-08-01")).toBe(6); // sábado
    expect(adjustToBusinessDay("2026-08-01", "POSTPONE", none)).toBe("2026-08-03");
    expect(adjustToBusinessDay("2026-08-01", "ANTICIPATE", none)).toBe("2026-07-31");
  });

  it("pula feriados cadastrados", () => {
    const holidays = new Set(["2026-09-07"]); // segunda-feira
    expect(adjustToBusinessDay("2026-09-05", "POSTPONE", holidays)).toBe("2026-09-08");
    expect(adjustToBusinessDay("2026-09-07", "ANTICIPATE", holidays)).toBe("2026-09-04");
  });

  it("usa o último dia do mês para datas inexistentes", () => {
    expect(clampDayOfMonth(2026, 2, 31)).toBe("2026-02-28");
    expect(clampDayOfMonth(2028, 2, 30)).toBe("2028-02-29");
    expect(clampDayOfMonth(2026, 4, 31)).toBe("2026-04-30");
  });

  it("aplica a regra de dia útil depois de ajustar a data inexistente", () => {
    // 31/01/2027 → fevereiro/2027: 28/02/2027 é domingo
    const r = rule({ monthDays: [31], nonBusinessDayRule: "ANTICIPATE", startDate: "2027-02-01" });
    expect(occurrencesBetween(r, "2027-02-01", "2027-02-28", none)).toEqual([
      { key: "2027-02-28", dueDate: "2027-02-26" },
    ]);
    const p = rule({ monthDays: [31], nonBusinessDayRule: "POSTPONE", startDate: "2027-02-01" });
    expect(occurrencesBetween(p, "2027-02-01", "2027-02-28", none)[0].dueDate).toBe("2027-03-01");
  });

  it("calcula o enésimo dia útil considerando feriados", () => {
    // Setembro/2026: 1 (ter), 2 (qua), 3 (qui), 4 (sex), 7 é feriado, 8 (ter)
    const holidays = new Set(["2026-09-07"]);
    expect(nthBusinessDayOfMonth(2026, 9, 5, holidays)).toBe("2026-09-08");
    expect(nthBusinessDayOfMonth(2026, 9, 5, none)).toBe("2026-09-07");
  });

  it("usa o último dia útil quando o mês não tem n dias úteis", () => {
    expect(nthBusinessDayOfMonth(2026, 2, 23, none)).toBe("2026-02-27");
  });
});

describe("frequências", () => {
  it("diária em dias úteis ignora fins de semana e feriados", () => {
    const r = rule({ frequency: "DAILY_BUSINESS" });
    const occ = occurrencesBetween(r, "2026-04-17", "2026-04-22", new Set(["2026-04-21"]));
    expect(occ.map((o) => o.dueDate)).toEqual(["2026-04-17", "2026-04-20", "2026-04-22"]);
  });

  it("semanal nos dias selecionados", () => {
    const r = rule({ frequency: "WEEKLY", weekdays: [1, 4] }); // seg e qui
    const occ = occurrencesBetween(r, "2026-06-01", "2026-06-14", none);
    expect(occ.map((o) => o.dueDate)).toEqual(["2026-06-01", "2026-06-04", "2026-06-08", "2026-06-11"]);
  });

  it("quinzenal em duas datas configuráveis", () => {
    const r = rule({ frequency: "BIWEEKLY", monthDays: [15, 30] });
    const occ = occurrencesBetween(r, "2026-02-01", "2026-03-31", none);
    // 15/02/2026 é domingo → 16; 30/02 inexistente → 28/02 (sábado) → 02/03
    // 15/03 é domingo → 16/03; 30/03 segunda
    expect(occ).toEqual([
      { key: "2026-02-15", dueDate: "2026-02-16" },
      { key: "2026-02-28", dueDate: "2026-03-02" },
      { key: "2026-03-15", dueDate: "2026-03-16" },
      { key: "2026-03-30", dueDate: "2026-03-30" },
    ]);
  });

  it("unifica ocorrências que caem no mesmo dia útil após o ajuste", () => {
    const r = rule({ frequency: "WEEKLY", weekdays: [6, 0], nonBusinessDayRule: "POSTPONE" }); // sáb e dom
    const occ = occurrencesBetween(r, "2026-06-06", "2026-06-07", none);
    expect(occ).toEqual([{ key: "2026-06-06", dueDate: "2026-06-08" }]);
  });

  it("respeita início e término da recorrência", () => {
    const r = rule({ monthDays: [10], startDate: "2026-03-01", endDate: "2026-05-09" });
    const occ = occurrencesBetween(r, "2026-01-01", "2026-12-31", none);
    expect(occ.map((o) => o.key)).toEqual(["2026-03-10", "2026-04-10"]);
  });

  it("valida regras incompletas", () => {
    expect(validateRule(rule({ frequency: "WEEKLY", weekdays: [] }))).toMatch(/dia da semana/);
    expect(validateRule(rule({ frequency: "BIWEEKLY", monthDays: [10] }))).toMatch(/duas datas/);
    expect(validateRule(rule({ frequency: "MONTHLY_DAY", monthDays: [32] }))).toMatch(/inválido/);
    expect(validateRule(rule({ frequency: "MONTHLY_NTH_BUSINESS_DAY", nthBusinessDay: null }))).toMatch(/dia útil/);
    expect(validateRule(rule({ monthDays: [5], startDate: "2026-05-01", endDate: "2026-04-01" }))).toMatch(/término/);
    expect(validateRule(rule({ monthDays: [5] }))).toBeNull();
  });
});

describe("janela de geração", () => {
  const monthly = rule({ monthDays: [10], startDate: "2026-01-01" });

  it("gera apenas o que vence até hoje + antecedência", () => {
    const occ = occurrencesDue({ rule: monthly, leadDays: 5, generationFloor: "2026-03-01", today: "2026-03-04" }, none);
    expect(occ).toEqual([]);
    const occ2 = occurrencesDue({ rule: monthly, leadDays: 5, generationFloor: "2026-03-01", today: "2026-03-05" }, none);
    expect(occ2.map((o) => o.dueDate)).toEqual(["2026-03-10"]);
  });

  it("não gera retroativamente antes do piso (criação ou reativação)", () => {
    const occ = occurrencesDue({ rule: monthly, leadDays: 0, generationFloor: "2026-03-11", today: "2026-04-10" }, none);
    expect(occ.map((o) => o.key)).toEqual(["2026-04-10"]);
  });

  it("recupera ocorrências perdidas se o agendador ficou parado", () => {
    const daily = rule({ frequency: "DAILY_BUSINESS" });
    const occ = occurrencesDue({ rule: daily, leadDays: 0, generationFloor: "2026-03-02", today: "2026-03-06" }, none);
    expect(occ.map((o) => o.key)).toEqual(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"]);
  });

  it("antecipação: ocorrência nominal após o horizonte com vencimento antecipado entra na janela", () => {
    const r = rule({ monthDays: [1], nonBusinessDayRule: "ANTICIPATE" }); // 01/08/2026 é sábado → 31/07
    const occ = occurrencesDue({ rule: r, leadDays: 0, generationFloor: "2026-07-02", today: "2026-07-31" }, none);
    expect(occ).toEqual([{ key: "2026-08-01", dueDate: "2026-07-31" }]);
  });

  it("informa a próxima ocorrência não gerada e quando será gerada", () => {
    const next = nextOccurrence(
      { rule: monthly, leadDays: 3, generationFloor: "2026-01-01", today: "2026-03-01" },
      new Set(["2026-01-10", "2026-02-10"]),
      none,
    );
    expect(next).toEqual({ key: "2026-03-10", dueDate: "2026-03-10", generateOn: "2026-03-07" });
  });

  it("calcula prazo, início e competência da tarefa no fuso configurado", () => {
    const timing = taskTimingFor(
      { key: "2026-03-10", dueDate: "2026-03-10" },
      { dueTime: "17:30", startOffsetDays: 2, competenceRule: "PREVIOUS_MONTH", timezone: "America/Sao_Paulo" },
    );
    expect(timing.dueAt.toISOString()).toBe("2026-03-10T20:30:00.000Z");
    expect(timing.startAt.toISOString()).toBe("2026-03-08T11:00:00.000Z");
    expect(timing.competence).toBe("2026-02");
  });
});

describe("feriados nacionais", () => {
  it("calcula a Páscoa e a Sexta-feira Santa", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    const list = brazilianNationalHolidays(2026);
    expect(list.find((h) => h.name === "Sexta-feira Santa")?.date).toBe("2026-04-03");
    expect(list).toHaveLength(10);
    expect(brazilianNationalHolidays(2026, true).map((h) => h.date)).toContain(addDays("2026-04-05", 60));
  });
});

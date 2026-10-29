import { addDays, makeLocalDate, type LocalDate } from "./dates";

export interface HolidaySuggestion {
  date: LocalDate;
  name: string;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function easterSunday(year: number): LocalDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return makeLocalDate(year, month, day);
}

/**
 * Sugestão de feriados nacionais brasileiros para um ano: datas fixas da
 * legislação federal (Leis 662/1949, 6.802/1980 e 14.759/2023) e Sexta-feira
 * Santa (calculada a partir da Páscoa). Opcionalmente inclui pontos
 * facultativos usuais (Carnaval e Corpus Christi).
 *
 * NÃO cobre feriados estaduais ou municipais. A lista é apenas uma sugestão:
 * o administrador revisa e grava no calendário da empresa.
 */
export function brazilianNationalHolidays(year: number, includeOptional = false): HolidaySuggestion[] {
  const fixed: Array<[number, number, string]> = [
    [1, 1, "Confraternização Universal"],
    [4, 21, "Tiradentes"],
    [5, 1, "Dia do Trabalho"],
    [9, 7, "Independência do Brasil"],
    [10, 12, "Nossa Senhora Aparecida"],
    [11, 2, "Finados"],
    [11, 15, "Proclamação da República"],
    [11, 20, "Dia Nacional de Zumbi e da Consciência Negra"],
    [12, 25, "Natal"],
  ];
  const easter = easterSunday(year);
  const list: HolidaySuggestion[] = fixed.map(([m, d, name]) => ({ date: makeLocalDate(year, m, d), name }));
  list.push({ date: addDays(easter, -2), name: "Sexta-feira Santa" });
  if (includeOptional) {
    list.push({ date: addDays(easter, -48), name: "Carnaval (ponto facultativo)" });
    list.push({ date: addDays(easter, -47), name: "Carnaval (ponto facultativo)" });
    list.push({ date: addDays(easter, 60), name: "Corpus Christi (ponto facultativo)" });
  }
  return list.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Previsão de quando a meta de receita recorrente será atingida, a partir do ritmo de
 * crescimento (R$ de receita nova por mês, média dos últimos meses).
 */
export function goalForecast(input: { current: number; goal: number; growthPerMonth: number; today: string }) {
  const gap = input.goal - input.current;
  if (gap <= 0) return { reached: true as const, months: 0, date: input.today };
  if (input.growthPerMonth <= 0) return { reached: false as const, months: null, date: null };
  const months = Math.ceil(gap / input.growthPerMonth);
  const [y, m, d] = input.today.split("-").map(Number) as [number, number, number];
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const date = `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
  return { reached: false as const, months, date };
}

/** Ocupação (horas já usadas + horas previstas das tarefas abertas do mês) e folga da equipe. */
export function capacity(input: { capacityHours: number; usedMinutes: number; plannedMinutes: number; activeClients: number; target?: number }) {
  const target = input.target ?? 0.85;
  const used = input.usedMinutes / 60;
  const planned = input.plannedMinutes / 60;
  const occupancy = input.capacityHours > 0 ? (used + planned) / input.capacityHours : 0;
  const perClient = input.activeClients > 0 ? used / input.activeClients : 0;
  const free = Math.max(0, input.capacityHours * target - used - planned);
  const fit = perClient > 0 ? Math.floor(free / perClient) : null;
  return {
    usedHours: Math.round(used * 10) / 10,
    plannedHours: Math.round(planned * 10) / 10,
    occupancy: Math.round(occupancy * 100),
    hoursPerClient: Math.round(perClient * 10) / 10,
    freeHours: Math.round(free * 10) / 10,
    clientsThatFit: fit,
  };
}

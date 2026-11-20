export interface ScenarioBase {
  mrr: number;
  clients: number;
  hoursPerClient: number;
  capacityHours: number;
  hourCost: number;
  taxPct: number;
}
export interface ScenarioChange {
  newClients: number;
  newTicket: number;
  lostClients: number;
  raisePct: number;
  hoursChangePct: number;
}
export interface ScenarioResult {
  clients: number;
  mrr: number;
  hours: number;
  utilization: number | null;
  cost: number;
  tax: number;
  profit: number;
  margin: number;
  extraCapacityNeeded: number;
}

/** Projeta carteira, horas, custo e margem após novos clientes, perdas e reajuste. */
export function simulate(b: ScenarioBase, c: ScenarioChange): ScenarioResult {
  const avgTicket = b.clients > 0 ? b.mrr / b.clients : 0;
  const clients = Math.max(0, b.clients + c.newClients - c.lostClients);
  const mrr = Math.max(0, (b.mrr - Math.min(c.lostClients, b.clients) * avgTicket) * (1 + c.raisePct / 100) + c.newClients * c.newTicket);
  const hours = clients * b.hoursPerClient * (1 + c.hoursChangePct / 100);
  const cost = hours * b.hourCost;
  const tax = mrr * (b.taxPct / 100);
  const profit = mrr - cost - tax;
  return {
    clients,
    mrr: Math.round(mrr * 100) / 100,
    hours: Math.round(hours * 10) / 10,
    utilization: b.capacityHours > 0 ? hours / b.capacityHours : null,
    cost: Math.round(cost * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    margin: mrr > 0 ? profit / mrr : 0,
    extraCapacityNeeded: Math.max(0, Math.round((hours - b.capacityHours) * 10) / 10),
  };
}

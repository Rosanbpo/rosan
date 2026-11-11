/**
 * Lógica da planilha de precificação de BPO financeiro:
 *  custo/hora mínimo = custos do mês ÷ horas trabalhadas no mês
 *  custo/hora        = mínimo × margem de segurança (ex.: 1,10)
 *  custo do plano    = horas do plano × custo/hora
 *  preço sugerido    = custo do plano × margem de lucro (ex.: 1,60)
 *  imposto           = preço praticado × alíquota
 */

export interface CostItem {
  label: string;
  amount: number;
}
export interface PlanTask {
  name: string;
  minutes: number;
}
export interface PricingPlan {
  name: string;
  tasks: PlanTask[];
  /** Preço praticado; se ausente, usa o sugerido arredondado. */
  finalPrice: number | null;
}
export interface PricingInput {
  costs: CostItem[];
  hoursPerDay: number;
  daysPerMonth: number;
  safetyFactor: number;
  markup: number;
  taxRate: number;
  plans: PricingPlan[];
}

export interface PlanResult {
  name: string;
  minutes: number;
  hours: number;
  cost: number;
  suggestedPrice: number;
  price: number;
  tax: number;
  profit: number;
  /** Lucro líquido ÷ preço praticado. */
  profitMargin: number;
}
export interface PricingResult {
  totalCosts: number;
  hoursPerMonth: number;
  minHourCost: number;
  hourCost: number;
  plans: PlanResult[];
}

const money = (n: number) => Math.round(n * 100) / 100;

export function totalCosts(costs: CostItem[]) {
  return money(costs.reduce((a, c) => a + (Number.isFinite(c.amount) ? c.amount : 0), 0));
}

export function calculatePricing(input: PricingInput): PricingResult {
  const total = totalCosts(input.costs);
  const hoursPerMonth = input.hoursPerDay * input.daysPerMonth;
  const minHourCost = hoursPerMonth > 0 ? total / hoursPerMonth : 0;
  const hourCost = minHourCost * input.safetyFactor;
  const plans = input.plans.map((plan): PlanResult => {
    const minutes = plan.tasks.reduce((a, t) => a + (Number.isFinite(t.minutes) ? t.minutes : 0), 0);
    const hours = minutes / 60;
    const cost = hours * hourCost;
    const suggestedPrice = cost * input.markup;
    const price = plan.finalPrice ?? Math.ceil(suggestedPrice / 10) * 10;
    const tax = price * input.taxRate;
    const profit = price - cost - tax;
    return {
      name: plan.name,
      minutes,
      hours,
      cost: money(cost),
      suggestedPrice: money(suggestedPrice),
      price: money(price),
      tax: money(tax),
      profit: money(profit),
      profitMargin: price > 0 ? profit / price : 0,
    };
  });
  return { totalCosts: total, hoursPerMonth, minHourCost: money(minHourCost), hourCost: money(hourCost), plans };
}

/** Valores iniciais, extraídos da planilha de precificação da Rosan. */
export const DEFAULT_PRICING: PricingInput = {
  costs: [
    { label: "Água", amount: 150 },
    { label: "Luz", amount: 200 },
    { label: "Aluguel/Condomínio", amount: 0 },
    { label: "Internet", amount: 150 },
    { label: "Telefone", amount: 50 },
    { label: "Transporte/Deslocamentos", amount: 100 },
    { label: "Alimentação/Lanches", amount: 50 },
    { label: "Google Workspace/OneDrive (armazenamento)", amount: 89 },
    { label: "Equipamentos de informática (aquisição ou depreciação)", amount: 500 },
    { label: "Sistema de gestão financeira", amount: 500 },
    { label: "Ferramentas administrativas", amount: 100 },
    { label: "Marketing/anúncios/divulgação", amount: 500 },
    { label: "Funcionários/Prestadores", amount: 1000 },
    { label: "Encargos (INSS, FGTS...)", amount: 152 },
    { label: "Pró-labore", amount: 5000 },
  ],
  hoursPerDay: 6,
  daysPerMonth: 21,
  safetyFactor: 1.1,
  markup: 1.6,
  taxRate: 0.06,
  plans: [
    {
      name: "Plano Básico",
      finalPrice: 500,
      tasks: [
        { name: "Emissão de notas fiscais", minutes: 30 },
        { name: "Emissão de boletos", minutes: 30 },
        { name: "Importação de extratos/conciliação bancária", minutes: 20 },
        { name: "Lançamentos de controle de cartão", minutes: 30 },
        { name: "Lançamento de contas a pagar", minutes: 60 },
        { name: "Controle e lançamento de contas a receber", minutes: 20 },
        { name: "Reunião de análise de resultados", minutes: 30 },
      ],
    },
    {
      name: "Plano Intermediário",
      finalPrice: 1000,
      tasks: [
        { name: "Emissão de notas fiscais", minutes: 40 },
        { name: "Emissão de boletos de cobrança", minutes: 40 },
        { name: "Importação de extratos/conciliação bancária", minutes: 60 },
        { name: "Lançamentos de cartão de crédito", minutes: 30 },
        { name: "Lançamento de contas a pagar", minutes: 60 },
        { name: "Agendamento bancário", minutes: 30 },
        { name: "Reunião de análise de resultados", minutes: 60 },
        { name: "Controle de aplicações (ganho/perda)", minutes: 60 },
      ],
    },
    {
      name: "Plano Avançado",
      finalPrice: 1500,
      tasks: [
        { name: "Emissão de notas fiscais", minutes: 100 },
        { name: "Emissão de boletos de cobrança", minutes: 168 },
        { name: "Importação de extratos/conciliação bancária", minutes: 78 },
        { name: "Lançamentos de cartão de crédito", minutes: 90 },
        { name: "Lançamento de contas a pagar", minutes: 60 },
        { name: "Agendamento bancário", minutes: 150 },
        { name: "Reunião de análise de resultados", minutes: 60 },
        { name: "Vídeo mensal de resultados", minutes: 30 },
        { name: "Indicadores de performance", minutes: 90 },
        { name: "Planejamento estratégico", minutes: 300 },
      ],
    },
  ],
};

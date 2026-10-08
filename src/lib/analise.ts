import type { DadosEmpresa, Lancamento } from '../data/tipos';
import { addDias, hojeISO, mesDe } from './datas';

export interface PontoFluxo {
  mes: string;
  entradas: number;
  saidas: number;
  resultado: number;
}

/** Fluxo realizado mês a mês, pelo mês do pagamento/recebimento. */
export function fluxoMensal(lancamentos: Lancamento[], meses: string[]): PontoFluxo[] {
  const mapa = new Map(meses.map((m) => [m, { mes: m, entradas: 0, saidas: 0, resultado: 0 }]));
  for (const l of lancamentos) {
    if (!l.pagamento) continue;
    const ponto = mapa.get(mesDe(l.pagamento));
    if (!ponto) continue;
    if (l.tipo === 'receber') ponto.entradas += l.valor;
    else ponto.saidas += l.valor;
  }
  for (const p of mapa.values()) p.resultado = p.entradas - p.saidas;
  return [...mapa.values()];
}

export interface Totais {
  entradas: number;
  saidas: number;
  resultado: number;
  margem: number;
}

export function totais(fluxo: PontoFluxo[]): Totais {
  const entradas = fluxo.reduce((s, p) => s + p.entradas, 0);
  const saidas = fluxo.reduce((s, p) => s + p.saidas, 0);
  const resultado = entradas - saidas;
  return { entradas, saidas, resultado, margem: entradas ? resultado / entradas : 0 };
}

export interface FatiaCategoria {
  categoria: string;
  valor: number;
  participacao: number;
}

/** Despesas realizadas por categoria no período, top N + "Outras". */
export function despesasPorCategoria(lancamentos: Lancamento[], meses: string[], top = 6): FatiaCategoria[] {
  const noPeriodo = new Set(meses);
  const soma = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo !== 'pagar' || !l.pagamento || !noPeriodo.has(mesDe(l.pagamento))) continue;
    soma.set(l.categoria, (soma.get(l.categoria) ?? 0) + l.valor);
  }
  const total = [...soma.values()].reduce((a, b) => a + b, 0);
  const ordenado = [...soma.entries()].sort((a, b) => b[1] - a[1]);
  const principais = ordenado.slice(0, top);
  const resto = ordenado.slice(top).reduce((s, [, v]) => s + v, 0);
  if (resto > 0) principais.push(['Outras', resto]);
  return principais.map(([categoria, valor]) => ({ categoria, valor, participacao: total ? valor / total : 0 }));
}

export interface ResumoPendentes {
  total: number;
  quantidade: number;
  vencido: number;
  quantidadeVencida: number;
}

export function pendentes(lancamentos: Lancamento[], tipo: Lancamento['tipo']): ResumoPendentes {
  const hoje = hojeISO();
  const r = { total: 0, quantidade: 0, vencido: 0, quantidadeVencida: 0 };
  for (const l of lancamentos) {
    if (l.tipo !== tipo || l.status !== 'pendente') continue;
    r.total += l.valor;
    r.quantidade++;
    if (l.vencimento < hoje) {
      r.vencido += l.valor;
      r.quantidadeVencida++;
    }
  }
  return r;
}

/** Pendentes vencidos ou que vencem nos próximos `dias`, por vencimento. */
export function agenda(lancamentos: Lancamento[], dias: number): Lancamento[] {
  const limite = addDias(hojeISO(), dias);
  return lancamentos
    .filter((l) => l.status === 'pendente' && l.vencimento <= limite)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export const saldoTotal = (dados: DadosEmpresa) => dados.contas.reduce((s, c) => s + c.saldo, 0);

/** Saldo de hoje somado aos pendentes (vencidos inclusos) dos próximos `dias`. */
export function saldoProjetado(dados: DadosEmpresa, dias: number): number {
  return agenda(dados.lancamentos, dias).reduce(
    (s, l) => s + (l.tipo === 'receber' ? l.valor : -l.valor),
    saldoTotal(dados),
  );
}

/** Variação relativa entre atual e anterior; null quando não há base. */
export const delta = (atual: number, anterior: number) => (anterior ? (atual - anterior) / Math.abs(anterior) : null);

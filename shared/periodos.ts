/** Utilitários de meses (AAAA-MM) e resolução de períodos/comparações. */

export type TipoPeriodo = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'personalizado';
export type TipoComparacao = 'anterior' | 'ano_anterior' | 'acumulado';

export interface Intervalo {
  inicio: string;
  fim: string;
}

const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function ehMes(v: unknown): v is `${number}-${number}` {
  return typeof v === 'string' && MES_RE.test(v);
}

export function partes(mes: string): [number, number] {
  const [a, m] = mes.split('-').map(Number);
  return [a, m];
}

export function deslocarMes(mes: string, n: number): string {
  const [a, m] = partes(mes);
  const total = a * 12 + (m - 1) + n;
  const ano = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${ano}-${String(mm).padStart(2, '0')}`;
}

/** Quantidade de meses entre início e fim, inclusive. */
export function tamanho(i: Intervalo): number {
  const [a1, m1] = partes(i.inicio);
  const [a2, m2] = partes(i.fim);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
}

export function mesesDe(i: Intervalo): string[] {
  const n = tamanho(i);
  return Array.from({ length: Math.max(0, n) }, (_, k) => deslocarMes(i.inicio, k));
}

export const contem = (i: Intervalo, mes: string) => mes >= i.inicio && mes <= i.fim;

export function mesAtual(hoje = new Date()): string {
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-09" -> "setembro/2026" */
export function nomeMes(mes: string): string {
  const [a, m] = partes(mes);
  return `${NOMES[m - 1]}/${a}`;
}

/** "2026-09" -> "Setembro/2026" */
export function nomeMesTitulo(mes: string): string {
  const n = nomeMes(mes);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/** "2026-09" -> "set/26" */
export function mesCurto(mes: string): string {
  const [a, m] = partes(mes);
  return `${CURTOS[m - 1]}/${String(a).slice(2)}`;
}

export function rotuloIntervalo(i: Intervalo): string {
  if (i.inicio === i.fim) return nomeMesTitulo(i.inicio);
  const [a1, m1] = partes(i.inicio);
  const [a2, m2] = partes(i.fim);
  if (a1 === a2 && m1 === 1 && m2 === 12) return `Ano de ${a1}`;
  return `${mesCurto(i.inicio)} a ${mesCurto(i.fim)}`;
}

/**
 * Período selecionado a partir do tipo e do mês de referência.
 * O fim é limitado ao último mês com dados, para não comparar meses vazios.
 */
export function resolverPeriodo(
  tipo: TipoPeriodo,
  referencia: string,
  ultimoMesComDados: string | null,
  personalizado?: Intervalo,
): Intervalo {
  const [ano, mes] = partes(referencia);
  let i: Intervalo;
  switch (tipo) {
    case 'mes':
      i = { inicio: referencia, fim: referencia };
      break;
    case 'trimestre': {
      const q = Math.floor((mes - 1) / 3);
      i = { inicio: `${ano}-${String(q * 3 + 1).padStart(2, '0')}`, fim: `${ano}-${String(q * 3 + 3).padStart(2, '0')}` };
      break;
    }
    case 'semestre':
      i = mes <= 6 ? { inicio: `${ano}-01`, fim: `${ano}-06` } : { inicio: `${ano}-07`, fim: `${ano}-12` };
      break;
    case 'ano':
      i = { inicio: `${ano}-01`, fim: `${ano}-12` };
      break;
    case 'personalizado':
      i = personalizado && personalizado.inicio <= personalizado.fim ? { ...personalizado } : { inicio: referencia, fim: referencia };
      break;
  }
  if (ultimoMesComDados && i.fim > ultimoMesComDados && i.inicio <= ultimoMesComDados) {
    i = { ...i, fim: ultimoMesComDados };
  }
  return i;
}

export interface PeriodosComparados {
  atual: Intervalo;
  comparacao: Intervalo;
  rotuloComparacao: string;
}

export function resolverComparacao(atual: Intervalo, tipo: TipoComparacao): PeriodosComparados {
  const n = tamanho(atual);
  switch (tipo) {
    case 'anterior':
      return {
        atual,
        comparacao: { inicio: deslocarMes(atual.inicio, -n), fim: deslocarMes(atual.fim, -n) },
        rotuloComparacao: n === 1 ? 'mês anterior' : 'período anterior',
      };
    case 'ano_anterior':
      return {
        atual,
        comparacao: { inicio: deslocarMes(atual.inicio, -12), fim: deslocarMes(atual.fim, -12) },
        rotuloComparacao: n === 1 ? 'mesmo mês do ano anterior' : 'mesmo período do ano anterior',
      };
    case 'acumulado': {
      const [ano] = partes(atual.fim);
      const acumulado = { inicio: `${ano}-01`, fim: atual.fim };
      return {
        atual: acumulado,
        comparacao: { inicio: deslocarMes(acumulado.inicio, -12), fim: deslocarMes(acumulado.fim, -12) },
        rotuloComparacao: 'acumulado do ano anterior',
      };
    }
  }
}

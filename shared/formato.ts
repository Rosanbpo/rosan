const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlInteiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCompacto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const num1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** R$ 8.450,32 */
export const moeda = (v: number) => brl.format(v);
/** R$ 8.450 */
export const moedaInteira = (v: number) => brlInteiro.format(Math.round(v));
/** R$ 8,5 mil */
export const moedaCompacta = (v: number) => (Math.abs(v) < 10000 ? brlInteiro.format(Math.round(v)) : brlCompacto.format(v));
/** 0.184 -> "18,4%" */
export const pct = (v: number) => `${num1.format(v * 100)}%`;
/** 0.084 -> "+8,4%" */
export const pctSinal = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num1.format(Math.abs(v) * 100)}%`;
/** 0.024 (fração) -> "2,4 p.p." */
export const pp = (v: number) => `${num1.format(Math.abs(v) * 100)} p.p.`;
export const ppSinal = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${pp(v)}`;
export const inteiro = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

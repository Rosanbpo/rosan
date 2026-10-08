const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const pctSemSinal = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

const brlInteiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const moedaInteira = (v: number) => brlInteiro.format(v);
export const moeda = (v: number) => brl.format(v);
export const moedaCompacta = (v: number) => (Math.abs(v) < 10000 ? brl.format(Math.round(v)).replace(/,00$/, '') : brlCompacto.format(v));
export const variacao = (v: number) => pct.format(v);
export const percentual = (v: number) => pctSemSinal.format(v);

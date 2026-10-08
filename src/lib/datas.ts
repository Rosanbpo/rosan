const pad = (n: number) => String(n).padStart(2, '0');

/** Data local no formato AAAA-MM-DD. */
export const isoData = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const hojeISO = () => isoData(new Date());

export function addDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return isoData(new Date(a, m - 1, d + dias));
}

/** Mês de referência AAAA-MM de uma data ISO. */
export const mesDe = (iso: string) => iso.slice(0, 7);

/** Lista de `n` meses (AAAA-MM) terminando no mês atual deslocado por `fimDesloc`. */
export function ultimosMeses(n: number, fimDesloc = 0): string[] {
  const hoje = new Date();
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + fimDesloc - i, 1);
    meses.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return meses;
}

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-03" -> "mar/26" */
export function rotuloMes(mes: string): string {
  const [a, m] = mes.split('-');
  return `${NOMES_MES[Number(m) - 1]}/${a.slice(2)}`;
}

/** "2026-03-07" -> "07/03/2026" */
export function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

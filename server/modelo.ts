import ExcelJS from 'exceljs';
import { ABA_PRINCIPAL, COLUNAS, type Coluna, FORMAS_PAGAMENTO } from '../shared/planilha';
import { PLANO_PADRAO } from './db';

export type LinhaPlanilha = Partial<Record<Coluna, string | number | Date | null>>;

const AZUL = 'FF1D2B44';
const BEGE = 'FFEFE6D8';

const LARGURAS: Record<Coluna, number> = {
  Data_Competencia: 16,
  Data_Pagamento_Recebimento: 18,
  Mes_Referencia: 15,
  Tipo: 20,
  Categoria: 20,
  Subcategoria: 22,
  Natureza: 12,
  Centro_Custo: 18,
  Descricao: 34,
  Conta: 18,
  Forma_Pagamento: 16,
  Valor: 14,
  Observacao: 28,
};

const INSTRUCOES: [Coluna, string][] = [
  ['Data_Competencia', 'Data econômica do lançamento (dd/mm/aaaa), quando disponível.'],
  ['Data_Pagamento_Recebimento', 'Data em que o dinheiro efetivamente saiu ou entrou (dd/mm/aaaa).'],
  ['Mes_Referencia', 'Mês usado para agrupar o lançamento nos relatórios (mm/aaaa). Obrigatório.'],
  ['Tipo', 'Receita, Despesa ou Transferência Interna. Transferências entre contas da empresa não entram no resultado.'],
  ['Categoria', 'Categoria principal (ex.: Administrativo, Pessoal, Marketing). Obrigatória para receitas e despesas.'],
  ['Subcategoria', 'Detalhamento da categoria (ex.: Aluguel, Salários, Tráfego pago).'],
  ['Natureza', 'Fixa ou Variável. Necessária nas despesas para o cálculo do ponto de equilíbrio.'],
  ['Centro_Custo', 'Centro responsável pelo gasto. Deixe vazio se a empresa não utiliza centros de custo.'],
  ['Descricao', 'Descrição do lançamento.'],
  ['Conta', 'Conta bancária, caixa ou aplicação relacionada.'],
  ['Forma_Pagamento', `Uma de: ${FORMAS_PAGAMENTO.join(', ')}.`],
  ['Valor', 'Valor positivo do lançamento (o Tipo define se é receita ou despesa).'],
  ['Observacao', 'Campo livre.'],
];

/** Gera uma planilha no padrão Rosan; sem linhas = modelo em branco. */
export async function gerarPlanilha(linhas: LinhaPlanilha[] = []): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rosan';
  const base = wb.addWorksheet(ABA_PRINCIPAL, { views: [{ state: 'frozen', ySplit: 1 }] });
  base.columns = COLUNAS.map((c) => ({ header: c, key: c, width: LARGURAS[c] }));
  const cab = base.getRow(1);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  cab.height = 20;

  for (const l of linhas) base.addRow(l);
  base.getColumn('Data_Competencia').numFmt = 'dd/mm/yyyy';
  base.getColumn('Data_Pagamento_Recebimento').numFmt = 'dd/mm/yyyy';
  base.getColumn('Valor').numFmt = '#,##0.00';

  const listas = wb.addWorksheet('Listas');
  listas.columns = [
    { header: 'Tipo', key: 't', width: 22 },
    { header: 'Natureza', key: 'n', width: 12 },
    { header: 'Forma_Pagamento', key: 'f', width: 18 },
  ];
  const tipos = ['Receita', 'Despesa', 'Transferência Interna'];
  const naturezas = ['Fixa', 'Variável'];
  for (let i = 0; i < FORMAS_PAGAMENTO.length; i++) {
    listas.addRow({ t: tipos[i] ?? null, n: naturezas[i] ?? null, f: FORMAS_PAGAMENTO[i] });
  }
  listas.getRow(1).font = { bold: true };

  const ultima = Math.max(500, linhas.length + 200);
  const validar = (col: Coluna, ref: string) => {
    const letra = base.getColumn(col).letter;
    for (let r = 2; r <= ultima; r++) {
      base.getCell(`${letra}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ref] };
    }
  };
  if (linhas.length === 0) {
    validar('Tipo', 'Listas!$A$2:$A$4');
    validar('Natureza', 'Listas!$B$2:$B$3');
    validar('Forma_Pagamento', `Listas!$C$2:$C$${FORMAS_PAGAMENTO.length + 1}`);
  }

  const instr = wb.addWorksheet('Instrucoes');
  instr.columns = [
    { header: 'Coluna', key: 'c', width: 28 },
    { header: 'Como preencher', key: 'd', width: 100 },
  ];
  instr.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instr.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  for (const [c, d] of INSTRUCOES) instr.addRow({ c, d });
  instr.addRow({});
  instr.addRow({ c: 'Plano de contas padrão Rosan' }).font = { bold: true };
  for (const g of PLANO_PADRAO) {
    const r = instr.addRow({ c: `${g.tipo === 'receita' ? 'Receita' : 'Despesa'} · ${g.categoria}`, d: g.subcategorias.join(', ') });
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BEGE } };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

import { describe, expect, it } from 'vitest';
import { COLUNAS, lerData, lerMes, lerValor, validarPlanilha } from '../shared/planilha';

const cab = [...COLUNAS];
const linha = (p: Partial<Record<(typeof COLUNAS)[number], unknown>>) =>
  COLUNAS.map((c) => (c in p ? p[c] : ({
    Data_Competencia: '05/09/2026',
    Data_Pagamento_Recebimento: '06/09/2026',
    Mes_Referencia: '09/2026',
    Tipo: 'Despesa',
    Categoria: 'Administrativo',
    Subcategoria: 'Aluguel',
    Natureza: 'Fixa',
    Centro_Custo: '',
    Descricao: 'Aluguel',
    Conta: 'Banco',
    Forma_Pagamento: 'Pix',
    Valor: 100,
    Observacao: '',
  } as Record<string, unknown>)[c])) as never[];

describe('leitura de células', () => {
  it('datas em vários formatos', () => {
    expect(lerData('05/09/2026')).toBe('2026-09-05');
    expect(lerData('2026-09-05')).toBe('2026-09-05');
    expect(lerData(new Date(Date.UTC(2026, 8, 5)))).toBe('2026-09-05');
    expect(lerData(46270)).toBe('2026-09-05'); // serial do Excel
    expect(lerData('31/02/2026')).toBeNull();
    expect(lerData('amanhã')).toBeNull();
    expect(lerData('')).toBeUndefined();
  });

  it('mês de referência', () => {
    expect(lerMes('09/2026')).toBe('2026-09');
    expect(lerMes('2026-09')).toBe('2026-09');
    expect(lerMes('set/2026')).toBe('2026-09');
    expect(lerMes('Setembro/2026')).toBe('2026-09');
    expect(lerMes('março 26')).toBe('2026-03');
    expect(lerMes('13/2026')).toBeNull();
  });

  it('valores no padrão brasileiro e internacional', () => {
    expect(lerValor('R$ 1.234,56')).toBe(1234.56);
    expect(lerValor('1234,5')).toBe(1234.5);
    expect(lerValor('1,234.56')).toBe(1234.56);
    expect(lerValor('(100,00)')).toBe(-100);
    expect(lerValor(99.9)).toBe(99.9);
    expect(lerValor('12a')).toBeNull();
  });
});

describe('validação da Base_Financeira', () => {
  it('aceita planilha correta, incluindo transferência e centro de custo vazio', () => {
    const r = validarPlanilha([
      cab,
      linha({}),
      linha({ Tipo: 'Receita', Categoria: 'Receita de serviços', Natureza: '' }),
      linha({ Tipo: 'Transferência Interna', Categoria: '', Natureza: '', Valor: 500 }),
    ]);
    expect(r.erros).toEqual([]);
    expect(r.linhas).toHaveLength(3);
    expect(r.linhas[0].centroCusto).toBeNull();
    expect(r.linhas[2].tipo).toBe('transferencia');
    expect(r.linhas[1].natureza).toBeNull(); // natureza só vale para despesas
  });

  it('reporta coluna ausente', () => {
    const r = validarPlanilha([cab.filter((c) => c !== 'Valor'), ['x']]);
    expect(r.colunasFaltando).toEqual(['Valor']);
    expect(r.linhas).toHaveLength(0);
  });

  it('aponta linha e campo de cada erro', () => {
    const r = validarPlanilha([
      cab,
      linha({ Data_Pagamento_Recebimento: '40/01/2026' }),
      linha({ Valor: -50 }),
      linha({ Valor: '' }),
      linha({ Mes_Referencia: '', Data_Competencia: '', Data_Pagamento_Recebimento: '' }),
      linha({ Categoria: '' }),
    ]);
    expect(r.erros.map((e) => [e.linha, e.campo])).toEqual([
      [2, 'Data_Pagamento_Recebimento'],
      [3, 'Valor'],
      [4, 'Valor'],
      [5, 'Mes_Referencia'],
      [6, 'Categoria'],
    ]);
    expect(r.linhasComErro).toBe(5);
  });

  it('deduz o mês vazio a partir das datas, com aviso', () => {
    const r = validarPlanilha([cab, linha({ Mes_Referencia: '' })]);
    expect(r.linhas[0].mes).toBe('2026-09');
    expect(r.avisos.some((a) => a.campo === 'Mes_Referencia')).toBe(true);
  });

  it('avisa duplicidade dentro do arquivo', () => {
    const r = validarPlanilha([cab, linha({}), linha({})]);
    expect(r.avisos.some((a) => a.mensagem.includes('duplicidade') && a.linha === 3)).toBe(true);
  });

  it('ignora linhas vazias e avisa centros e categorias não cadastrados', () => {
    const vazia = COLUNAS.map(() => null) as never[];
    const r = validarPlanilha([cab, linha({ Centro_Custo: 'Loja 09', Categoria: 'Nova Cat' }), vazia], {
      centrosCadastrados: ['Loja 01'],
      categoriasCadastradas: ['Administrativo'],
    });
    expect(r.linhasVazias).toBe(1);
    expect(r.avisos.map((a) => a.mensagem).join(' ')).toMatch(/Loja 09.*Nova Cat|Nova Cat.*Loja 09/s);
  });

  it('despesa sem natureza gera aviso, natureza inválida gera erro', () => {
    const r = validarPlanilha([cab, linha({ Natureza: '' }), linha({ Natureza: 'Mista' })]);
    expect(r.avisos.some((a) => a.campo === 'Natureza')).toBe(true);
    expect(r.erros.map((e) => e.campo)).toEqual(['Natureza']);
  });

  it('cabeçalho sem diferenciar acentos e maiúsculas', () => {
    const r = validarPlanilha([cab.map((c) => c.toUpperCase().replace('DESCRICAO', 'Descrição')), linha({})]);
    expect(r.colunasFaltando).toEqual([]);
    expect(r.linhas).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';
import { analisar, type LancamentoAnalise, resumirCliente } from '../shared/analise';
import { resolverComparacao, resolverPeriodo } from '../shared/periodos';

const L = (p: Partial<LancamentoAnalise>): LancamentoAnalise => ({
  mes: '2026-09',
  tipo: 'despesa',
  categoria: 'Administrativo',
  subcategoria: 'Aluguel',
  natureza: 'fixa',
  centroCusto: null,
  descricao: '',
  valor: 0,
  ...p,
});
const receita = (mes: string, valor: number) => L({ mes, tipo: 'receita', categoria: 'Receita de serviços', subcategoria: null, natureza: null, valor });

/** Mês com receita, despesas fixas e variáveis. */
function mes(m: string, rec: number, fixas: number, variaveis: number, extra: Partial<LancamentoAnalise>[] = []) {
  return [
    receita(m, rec),
    L({ mes: m, valor: fixas }),
    L({ mes: m, categoria: 'Operacional', subcategoria: 'Materiais', natureza: 'variavel', valor: variaveis }),
    ...extra.map((e) => L({ mes: m, ...e })),
  ];
}

/** Intl usa espaço não separável depois de R$. */
const t = (s: string) => s.replace(/\u00a0/g, ' ');

const doMes = (lanc: LancamentoAnalise[], m: string, usaCentroCusto = false) => {
  const p = resolverComparacao(resolverPeriodo('mes', m, m), 'anterior');
  return analisar(lanc, { ...p, usaCentroCusto });
};

describe('indicadores', () => {
  it('receitas, despesas, resultado e margem; transferências ficam fora', () => {
    const a = doMes(
      [...mes('2026-09', 100000, 50000, 30000), L({ tipo: 'transferencia', categoria: 'Transferência interna', valor: 40000 })],
      '2026-09',
    );
    expect(a.kpis.faturamento.atual).toBe(100000);
    expect(a.kpis.despesas.atual).toBe(80000);
    expect(a.kpis.resultado.atual).toBe(20000);
    expect(a.kpis.margem.atual).toBeCloseTo(0.2);
    expect(t(a.explicacoes.margem)).toContain('R$ 20,00');
  });

  it('compara com o mês anterior em valor, % e p.p.', () => {
    const a = doMes([...mes('2026-08', 100000, 50000, 30000), ...mes('2026-09', 108400, 55000, 35000)], '2026-09');
    expect(a.periodo.temComparacao).toBe(true);
    expect(a.kpis.faturamento.percentual).toBeCloseTo(0.084);
    expect(a.kpis.despesas.diferenca).toBe(10000);
    expect(a.kpis.margem.diferenca).toBeCloseTo((108400 - 90000) / 108400 - 0.2);
  });

  it('compara com o mesmo mês do ano anterior e acumulado do ano', () => {
    const lanc = [...mes('2025-09', 80000, 40000, 20000), ...mes('2026-01', 90000, 40000, 20000), ...mes('2026-09', 100000, 40000, 20000)];
    const anoAnt = resolverComparacao(resolverPeriodo('mes', '2026-09', '2026-09'), 'ano_anterior');
    const a = analisar(lanc, { ...anoAnt, usaCentroCusto: false });
    expect(a.kpis.faturamento.anterior).toBe(80000);
    const acum = resolverComparacao(resolverPeriodo('mes', '2026-09', '2026-09'), 'acumulado');
    expect(acum.atual).toEqual({ inicio: '2026-01', fim: '2026-09' });
    const b = analisar(lanc, { ...acum, usaCentroCusto: false });
    expect(b.kpis.faturamento.atual).toBe(190000);
    expect(b.kpis.faturamento.anterior).toBe(80000);
  });

  it('resultado e margem negativos geram alerta e prioridade', () => {
    const a = doMes(mes('2026-09', 50000, 40000, 20000), '2026-09');
    expect(a.kpis.resultado.atual).toBe(-10000);
    expect(a.kpis.margem.atual).toBeCloseTo(-0.2);
    expect(a.alertas.map((x) => x.rotulo)).toContain('Margem negativa');
    expect(a.prioridades[0].titulo).toBe('Recompor o resultado');
    expect(a.explicacoes.margem).toContain('faltaram');
  });

  it('ausência de dados não inventa números', () => {
    const a = doMes([], '2026-09');
    expect(a.semDados).toBe(true);
    expect(a.notas[0]).toBe('Ainda não existem dados financeiros importados para este período.');
    expect(a.insights.positivos).toHaveLength(0);
    expect(a.prioridades).toHaveLength(0);
    expect(a.pontoEquilibrio.status).toBe('insuficiente');
  });

  it('sem histórico informa que não há comparação', () => {
    const a = doMes(mes('2026-09', 100000, 50000, 30000), '2026-09');
    expect(a.periodo.temComparacao).toBe(false);
    expect(a.kpis.faturamento.percentual).toBeNull();
    expect(a.notas.join(' ')).toContain('Não há histórico suficiente');
  });
});

describe('ponto de equilíbrio', () => {
  it('calcula MC, MC% e PE (acima)', () => {
    const a = doMes(mes('2026-09', 100000, 40000, 20000), '2026-09');
    const pe = a.pontoEquilibrio;
    expect(pe.status).toBe('calculado');
    if (pe.status !== 'calculado') return;
    expect(pe.margemContribuicao).toBe(80000);
    expect(pe.margemContribuicaoPct).toBeCloseTo(0.8);
    expect(pe.pontoEquilibrio).toBeCloseTo(50000);
    expect(pe.distancia).toBeCloseTo(50000);
    expect(pe.situacao).toBe('acima');
    expect(t(pe.texto)).toContain('acima do ponto de equilíbrio em R$ 50.000');
  });

  it('abaixo do ponto de equilíbrio', () => {
    const a = doMes(mes('2026-09', 50000, 40000, 20000), '2026-09');
    const pe = a.pontoEquilibrio;
    if (pe.status !== 'calculado') throw new Error('deveria calcular');
    expect(pe.pontoEquilibrio).toBeCloseTo(66666.67, 1);
    expect(pe.situacao).toBe('abaixo');
    expect(pe.texto).toContain('ainda não cobre');
    expect(a.alertas.map((x) => x.rotulo)).toContain('Abaixo do ponto de equilíbrio');
  });

  it('sem despesas variáveis: não calcula', () => {
    const a = doMes([receita('2026-09', 100000), L({ valor: 30000 })], '2026-09');
    expect(a.pontoEquilibrio.status).toBe('insuficiente');
    if (a.pontoEquilibrio.status === 'insuficiente') expect(a.pontoEquilibrio.motivo).toContain('variáveis');
    expect(a.kpis.pontoEquilibrio.atual).toBeNull();
  });

  it('despesas sem natureza acima de 10%: não estima', () => {
    const a = doMes(mes('2026-09', 100000, 30000, 10000, [{ natureza: null, valor: 20000 }]), '2026-09');
    expect(a.pontoEquilibrio.status).toBe('insuficiente');
    if (a.pontoEquilibrio.status === 'insuficiente') expect(a.pontoEquilibrio.motivo).toContain('Classifique');
  });

  it('variáveis acima da receita: PE inexistente, sem número inventado', () => {
    const a = doMes(mes('2026-09', 10000, 5000, 12000), '2026-09');
    const pe = a.pontoEquilibrio;
    if (pe.status !== 'calculado') throw new Error('deveria calcular');
    expect(pe.pontoEquilibrio).toBeNull();
    expect(pe.situacao).toBe('abaixo');
  });
});

describe('categorias, despesas e centros de custo', () => {
  const lanc = [
    ...mes('2026-08', 100000, 30000, 10000, [{ categoria: 'Marketing', subcategoria: 'Tráfego pago', natureza: 'variavel', valor: 5000 }]),
    ...mes('2026-09', 102000, 30000, 10000, [{ categoria: 'Marketing', subcategoria: 'Tráfego pago', natureza: 'variavel', valor: 12000 }]),
  ];

  it('agrupa por categoria e subcategoria e calcula participação', () => {
    const a = doMes(lanc, '2026-09');
    const mkt = a.categorias.find((c) => c.categoria === 'Marketing')!;
    expect(mkt.valor).toBe(12000);
    expect(mkt.participacao).toBeCloseTo(12000 / 52000);
    expect(mkt.variacao).toBeCloseTo(1.4);
    expect(mkt.subcategorias[0]).toMatchObject({ nome: 'Tráfego pago', valor: 12000 });
    expect(a.topDespesas.itens[0].nome).toBe('Aluguel');
  });

  it('detecta aumento expressivo de categoria e despesas acima do faturamento', () => {
    const a = doMes(lanc, '2026-09');
    const ids = a.insights.atencao.map((x) => x.id);
    expect(ids).toContain('categoria_alta_Marketing');
    expect(ids).toContain('despesas_acima_faturamento');
    const d = a.insights.atencao.find((x) => x.id === 'despesas_acima_faturamento')!;
    expect(d.insight).toMatch(/faturamento cresceu 2,0%.*despesas cresceram 15,6%/);
    expect(a.prioridades.length).toBeLessThanOrEqual(3);
  });

  it('sem centro de custo: não inventa, mostra mensagem', () => {
    const a = doMes(lanc, '2026-09', false);
    expect(a.centros.disponivel).toBe(false);
    if (!a.centros.disponivel) expect(a.centros.mensagem).toContain('estará disponível quando');
  });

  it('com centro de custo: totais, percentual, maior centro e despesas sem centro', () => {
    const cc = [
      receita('2026-09', 100000),
      L({ valor: 30000, centroCusto: 'Operacional' }),
      L({ valor: 18000, centroCusto: 'Administrativo', subcategoria: 'Energia' }),
      L({ valor: 12000, centroCusto: 'Comercial', categoria: 'Comercial', subcategoria: 'Comissões', natureza: 'variavel' }),
      L({ valor: 8450, centroCusto: null, subcategoria: 'Internet' }),
    ];
    const a = doMes(cc, '2026-09', true);
    if (!a.centros.disponivel) throw new Error('deveria ter centros');
    expect(a.centros.centros.map((c) => c.nome)).toEqual(['Operacional', 'Administrativo', 'Comercial']);
    expect(a.centros.centros[0].participacao).toBeCloseTo(30000 / 68450);
    expect(a.centros.semCentro.valor).toBe(8450);
    expect(t(a.centros.leituras.join(' '))).toContain('R$ 8.450 em despesas não possuem centro de custo informado');
    expect(a.insights.oportunidades.some((o) => o.id === 'sem_centro')).toBe(true);
  });
});

describe('evolução e resumo', () => {
  it('interpreta despesas crescendo acima do faturamento nos últimos 3 meses', () => {
    const lanc = [
      ...mes('2026-04', 100000, 40000, 30000),
      ...mes('2026-05', 100000, 40000, 30000),
      ...mes('2026-06', 100000, 40000, 30000),
      ...mes('2026-07', 104000, 46000, 34000),
      ...mes('2026-08', 104000, 46000, 34000),
      ...mes('2026-09', 104000, 46000, 34000),
    ];
    const a = doMes(lanc, '2026-09');
    expect(a.evolucao.meses).toHaveLength(6);
    expect(a.evolucao.narrativa[0]).toContain('porém as despesas cresceram em ritmo superior');
    expect(a.evolucao.sinais.find((s) => s.indicador === 'margem')?.direcao).toBe('queda');
  });

  it('resumo do cliente usa o último mês com dados', () => {
    const r = resumirCliente([...mes('2026-08', 100000, 40000, 20000), ...mes('2026-09', 50000, 40000, 20000)], false);
    expect(r.ultimoPeriodo).toBe('2026-09');
    expect(r.margem).toBeCloseTo(-0.2);
    expect(r.abaixoPE).toBe(true);
    expect(r.atencao).toBe(true);
  });
});

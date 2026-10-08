/**
 * Motor de análise financeira Rosan.
 *
 * DADO → INDICADOR → COMPARAÇÃO → IMPACTO → INSIGHT → RECOMENDAÇÃO
 *
 * Função pura: recebe os lançamentos de UM cliente e devolve indicadores,
 * comparações, ponto de equilíbrio, diagnóstico, insights e prioridades.
 * Nenhum número é estimado: quando falta dado, a seção informa o motivo.
 */
import { moeda, moedaInteira, pct, pctSinal, pp } from './formato';
import type { Natureza, TipoLancamento } from './planilha';
import { contem, deslocarMes, type Intervalo, mesesDe, nomeMes, rotuloIntervalo, tamanho } from './periodos';

export interface LancamentoAnalise {
  mes: string;
  tipo: TipoLancamento;
  categoria: string;
  subcategoria: string | null;
  natureza: Natureza | null;
  centroCusto: string | null;
  descricao: string;
  valor: number;
}

export interface Premissas {
  /** variação considerada relevante em receitas/despesas (fração) */
  variacaoRelevante: number;
  /** queda de margem relevante (fração, 0.02 = 2 p.p.) */
  quedaMargemRelevante: number;
  /** participação dos 5 maiores grupos que caracteriza concentração */
  concentracaoTop5: number;
  /** folga mínima confortável sobre o ponto de equilíbrio */
  folgaMinimaPE: number;
  /** crescimento de categoria considerado expressivo */
  crescimentoCategoriaRelevante: number;
  /** peso mínimo da categoria nas despesas para gerar alerta */
  pesoMinimoCategoria: number;
  /** margem de referência definida pela Rosan para o cliente */
  margemReferencia: number;
}

export const PREMISSAS_PADRAO: Premissas = {
  variacaoRelevante: 0.05,
  quedaMargemRelevante: 0.02,
  concentracaoTop5: 0.7,
  folgaMinimaPE: 0.1,
  crescimentoCategoriaRelevante: 0.2,
  pesoMinimoCategoria: 0.05,
  margemReferencia: 0.1,
};

export const DESCRICAO_PREMISSAS: Record<keyof Premissas, { rotulo: string; ajuda: string }> = {
  variacaoRelevante: { rotulo: 'Variação relevante', ajuda: 'A partir de quanto uma alta ou queda de receitas e despesas é destacada.' },
  quedaMargemRelevante: { rotulo: 'Queda relevante de margem', ajuda: 'Queda, em pontos percentuais, que gera alerta de margem.' },
  concentracaoTop5: { rotulo: 'Concentração de despesas', ajuda: 'Participação dos 5 maiores grupos que caracteriza concentração.' },
  folgaMinimaPE: { rotulo: 'Folga mínima sobre o ponto de equilíbrio', ajuda: 'Abaixo desta folga, a empresa é considerada próxima do ponto de equilíbrio.' },
  crescimentoCategoriaRelevante: { rotulo: 'Crescimento expressivo de categoria', ajuda: 'Aumento de uma categoria de despesa que merece destaque.' },
  pesoMinimoCategoria: { rotulo: 'Peso mínimo da categoria', ajuda: 'Participação mínima nas despesas para uma categoria gerar alerta.' },
  margemReferencia: { rotulo: 'Margem de referência', ajuda: 'Margem de lucro considerada saudável para este cliente.' },
};

export interface OpcoesAnalise {
  atual: Intervalo;
  comparacao: Intervalo | null;
  rotuloComparacao: string;
  /** o cliente classifica despesas por centro de custo (em qualquer período) */
  usaCentroCusto: boolean;
  premissas?: Partial<Premissas>;
}

export type TipoAchado = 'positivo' | 'atencao' | 'oportunidade';

export interface Achado {
  id: string;
  tipo: TipoAchado;
  /** 3 = crítico, 2 = importante, 1 = acompanhamento */
  severidade: 1 | 2 | 3;
  titulo: string;
  /** o que aconteceu (com números) */
  dado: string;
  /** contra o quê foi comparado */
  comparacao?: string;
  /** por que isso importa */
  impacto?: string;
  /** leitura da Rosan */
  insight: string;
  recomendacao?: string;
  /** rótulo curto quando merece indicador de atenção */
  alerta?: string;
  prioridade?: { titulo: string; texto: string; peso: number };
}

export interface Prioridade {
  ordem: number;
  titulo: string;
  texto: string;
}

export interface Variacao {
  atual: number;
  anterior: number | null;
  /** diferença absoluta */
  diferenca: number | null;
  /** variação relativa; null sem base de comparação */
  percentual: number | null;
}

export interface LinhaMes {
  mes: string;
  faturamento: number;
  despesas: number;
  resultado: number;
  margem: number | null;
  temDados: boolean;
}

export interface SinalTendencia {
  indicador: 'faturamento' | 'despesas' | 'resultado' | 'margem';
  direcao: 'alta' | 'queda' | 'estavel';
  /** fração (margem: diferença em p.p. como fração) */
  variacao: number;
  favoravel: boolean | null;
  texto: string;
}

export interface ItemDespesa {
  nome: string;
  categoria: string;
  valor: number;
  participacao: number;
  anterior: number | null;
  variacao: number | null;
}

export interface CategoriaAnalise {
  categoria: string;
  valor: number;
  participacao: number;
  anterior: number | null;
  variacao: number | null;
  subcategorias: { nome: string; valor: number; participacao: number }[];
}

export interface CentroAnalise {
  nome: string;
  valor: number;
  participacao: number;
  /** quanto do faturamento o centro consome */
  sobreFaturamento: number | null;
  anterior: number | null;
  variacao: number | null;
  maioresDespesas: { nome: string; categoria: string; valor: number }[];
  evolucao: { mes: string; valor: number }[];
}

export type AnaliseCentros =
  | { disponivel: false; mensagem: string }
  | {
      disponivel: true;
      centros: CentroAnalise[];
      semCentro: { valor: number; quantidade: number; participacao: number };
      maisRepresenta: string | null;
      maisCresceu: { nome: string; variacao: number } | null;
      leituras: string[];
    };

export type PontoEquilibrio =
  | {
      status: 'insuficiente';
      motivo: string;
      despesasFixas: number;
      despesasVariaveis: number;
      despesasSemNatureza: number;
      faturamento: number;
    }
  | {
      status: 'calculado';
      despesasFixas: number;
      despesasVariaveis: number;
      despesasSemNatureza: number;
      faturamento: number;
      margemContribuicao: number;
      margemContribuicaoPct: number;
      /** null quando a margem de contribuição é zero ou negativa */
      pontoEquilibrio: number | null;
      distancia: number | null;
      /** folga (ou falta) relativa ao ponto de equilíbrio */
      distanciaPct: number | null;
      situacao: 'acima' | 'abaixo';
      texto: string;
      notas: string[];
    };

export interface AnaliseFinanceira {
  periodo: {
    atual: Intervalo;
    rotuloAtual: string;
    comparacao: Intervalo | null;
    rotuloComparacao: string;
    temComparacao: boolean;
    comparacaoParcial: boolean;
  };
  semDados: boolean;
  quantidadeLancamentos: number;
  kpis: {
    faturamento: Variacao;
    despesas: Variacao;
    resultado: Variacao;
    /** margem como fração; diferenca em p.p. (fração) */
    margem: { atual: number | null; anterior: number | null; diferenca: number | null };
    pontoEquilibrio: { atual: number | null; anterior: number | null };
  };
  explicacoes: Record<'faturamento' | 'despesas' | 'resultado' | 'margem' | 'pontoEquilibrio', string>;
  evolucao: { meses: LinhaMes[]; sinais: SinalTendencia[]; narrativa: string[] };
  topDespesas: { itens: ItemDespesa[]; leituras: string[] };
  categorias: CategoriaAnalise[];
  centros: AnaliseCentros;
  pontoEquilibrio: PontoEquilibrio;
  diagnostico: Achado[];
  insights: { positivos: Achado[]; atencao: Achado[]; oportunidades: Achado[] };
  prioridades: Prioridade[];
  alertas: { id: string; rotulo: string; severidade: 1 | 2 | 3 }[];
  notas: string[];
}

/* ------------------------------------------------------------------ */
/* Agregação                                                           */
/* ------------------------------------------------------------------ */

interface Agregado {
  receita: number;
  despesa: number;
  fixas: number;
  variaveis: number;
  semNatureza: number;
  categorias: Map<string, { valor: number; subs: Map<string, number> }>;
  itens: Map<string, { nome: string; categoria: string; valor: number }>;
  centros: Map<string, { valor: number; itens: Map<string, { nome: string; categoria: string; valor: number }> }>;
  semCentro: { valor: number; quantidade: number };
  meses: Set<string>;
  quantidade: number;
}

const nomeItem = (l: LancamentoAnalise) => l.subcategoria || l.descricao || l.categoria;

function agregar(lancamentos: LancamentoAnalise[], i: Intervalo | null): Agregado {
  const a: Agregado = {
    receita: 0,
    despesa: 0,
    fixas: 0,
    variaveis: 0,
    semNatureza: 0,
    categorias: new Map(),
    itens: new Map(),
    centros: new Map(),
    semCentro: { valor: 0, quantidade: 0 },
    meses: new Set(),
    quantidade: 0,
  };
  if (!i) return a;
  for (const l of lancamentos) {
    if (l.tipo === 'transferencia' || !contem(i, l.mes)) continue;
    a.meses.add(l.mes);
    a.quantidade++;
    if (l.tipo === 'receita') {
      a.receita += l.valor;
      continue;
    }
    a.despesa += l.valor;
    if (l.natureza === 'fixa') a.fixas += l.valor;
    else if (l.natureza === 'variavel') a.variaveis += l.valor;
    else a.semNatureza += l.valor;

    const cat = a.categorias.get(l.categoria) ?? { valor: 0, subs: new Map<string, number>() };
    cat.valor += l.valor;
    const sub = l.subcategoria || 'Sem subcategoria';
    cat.subs.set(sub, (cat.subs.get(sub) ?? 0) + l.valor);
    a.categorias.set(l.categoria, cat);

    const nome = nomeItem(l);
    const chave = `${l.categoria}|${nome}`;
    const item = a.itens.get(chave) ?? { nome, categoria: l.categoria, valor: 0 };
    item.valor += l.valor;
    a.itens.set(chave, item);

    if (l.centroCusto) {
      const c = a.centros.get(l.centroCusto) ?? { valor: 0, itens: new Map() };
      c.valor += l.valor;
      const ci = c.itens.get(chave) ?? { nome, categoria: l.categoria, valor: 0 };
      ci.valor += l.valor;
      c.itens.set(chave, ci);
      a.centros.set(l.centroCusto, c);
    } else {
      a.semCentro.valor += l.valor;
      a.semCentro.quantidade++;
    }
  }
  return a;
}

const resultadoDe = (a: Agregado) => a.receita - a.despesa;
const margemDe = (a: Agregado) => (a.receita > 0 ? resultadoDe(a) / a.receita : null);

function variacao(atual: number, anterior: number | null): Variacao {
  if (anterior === null) return { atual, anterior: null, diferenca: null, percentual: null };
  return {
    atual,
    anterior,
    diferenca: atual - anterior,
    percentual: anterior !== 0 ? (atual - anterior) / Math.abs(anterior) : null,
  };
}

const rel = (atual: number, anterior: number | null | undefined) =>
  anterior === null || anterior === undefined || anterior === 0 ? null : (atual - anterior) / Math.abs(anterior);

/* ------------------------------------------------------------------ */
/* Textos                                                              */
/* ------------------------------------------------------------------ */

function verbo(v: number, alta = 'cresceu', queda = 'caiu', limiar = 0.005): string {
  if (v > limiar) return `${alta} ${pct(v)}`;
  if (v < -limiar) return `${queda} ${pct(-v)}`;
  return 'ficou estável';
}

const lista = (itens: string[]) =>
  itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;

/* ------------------------------------------------------------------ */
/* Ponto de equilíbrio                                                 */
/* ------------------------------------------------------------------ */

function calcularPE(a: Agregado): PontoEquilibrio {
  const base = {
    despesasFixas: a.fixas,
    despesasVariaveis: a.variaveis,
    despesasSemNatureza: a.semNatureza,
    faturamento: a.receita,
  };
  const insuf = (motivo: string): PontoEquilibrio => ({ status: 'insuficiente', motivo, ...base });

  if (a.receita <= 0 && a.despesa <= 0) return insuf('Ainda não existem dados financeiros importados para este período.');
  if (a.receita <= 0) return insuf('Não há faturamento registrado no período para calcular o ponto de equilíbrio.');
  if (a.despesa > 0 && a.semNatureza / a.despesa > 0.1) {
    return insuf(
      `Não há informações suficientes para calcular o ponto de equilíbrio com segurança: ${pct(a.semNatureza / a.despesa)} das despesas (${moedaInteira(a.semNatureza)}) não estão classificadas como fixas ou variáveis. Classifique as despesas como fixas ou variáveis para habilitar este indicador.`,
    );
  }
  if (a.variaveis <= 0) {
    return insuf(
      'Não existem despesas classificadas como variáveis suficientes para calcular o ponto de equilíbrio. Classifique as despesas como fixas ou variáveis para habilitar este indicador.',
    );
  }
  if (a.fixas <= 0) {
    return insuf('Não existem despesas classificadas como fixas no período; o ponto de equilíbrio depende delas para ser calculado.');
  }

  const mc = a.receita - a.variaveis;
  const mcPct = mc / a.receita;
  const notas: string[] = [];
  if (a.semNatureza > 0) {
    notas.push(`${moedaInteira(a.semNatureza)} em despesas sem classificação fixa/variável não foram consideradas no cálculo.`);
  }
  if (mcPct <= 0) {
    return {
      status: 'calculado',
      ...base,
      margemContribuicao: mc,
      margemContribuicaoPct: mcPct,
      pontoEquilibrio: null,
      distancia: null,
      distanciaPct: null,
      situacao: 'abaixo',
      texto:
        'As despesas variáveis consomem todo o faturamento do período. Nessas condições, nenhum nível de faturamento cobre as despesas fixas: é preciso rever preços ou custos variáveis.',
      notas,
    };
  }
  const pe = a.fixas / mcPct;
  const distancia = a.receita - pe;
  const situacao = distancia >= 0 ? 'acima' : 'abaixo';
  return {
    status: 'calculado',
    ...base,
    margemContribuicao: mc,
    margemContribuicaoPct: mcPct,
    pontoEquilibrio: pe,
    distancia,
    distanciaPct: distancia / pe,
    situacao,
    texto:
      situacao === 'acima'
        ? `Com o faturamento atual, a empresa está acima do ponto de equilíbrio em ${moedaInteira(distancia)} (${pct(distancia / pe)} de folga).`
        : `O faturamento atual ainda não cobre o nível de despesas utilizado no cálculo do ponto de equilíbrio. Faltam ${moedaInteira(-distancia)} (${pct(-distancia / pe)}) para atingi-lo.`,
    notas,
  };
}

/* ------------------------------------------------------------------ */
/* Evolução mensal                                                     */
/* ------------------------------------------------------------------ */

function linhaMes(lancamentos: LancamentoAnalise[], mes: string): LinhaMes {
  const a = agregar(lancamentos, { inicio: mes, fim: mes });
  return {
    mes,
    faturamento: a.receita,
    despesas: a.despesa,
    resultado: resultadoDe(a),
    margem: margemDe(a),
    temDados: a.quantidade > 0,
  };
}

function somaJanela(linhas: LinhaMes[]) {
  const f = linhas.reduce((s, l) => s + l.faturamento, 0);
  const d = linhas.reduce((s, l) => s + l.despesas, 0);
  return { faturamento: f, despesas: d, resultado: f - d, margem: f > 0 ? (f - d) / f : null };
}

function analisarEvolucao(lancamentos: LancamentoAnalise[], fim: string, premissas: Premissas) {
  const inicioJanela = deslocarMes(fim, -11);
  const todas = mesesDe({ inicio: inicioJanela, fim }).map((m) => linhaMes(lancamentos, m));
  const primeiro = todas.findIndex((l) => l.temDados);
  const meses = primeiro < 0 ? [] : todas.slice(primeiro);
  const comDados = meses.filter((l) => l.temDados);

  const sinais: SinalTendencia[] = [];
  const narrativa: string[] = [];
  if (comDados.length < 2) {
    narrativa.push('Não há histórico suficiente para identificar tendências: são necessários pelo menos dois meses com dados.');
    return { meses, sinais, narrativa };
  }

  const janela = comDados.length >= 6 ? 3 : 1;
  const recentes = somaJanela(meses.slice(-janela));
  const anteriores = somaJanela(meses.slice(-2 * janela, -janela));
  const descricaoJanela =
    janela === 3
      ? { agora: 'Nos últimos 3 meses', base: 'em relação aos 3 meses anteriores' }
      : { agora: `Em ${nomeMes(meses[meses.length - 1].mes)}`, base: 'em relação ao mês anterior' };

  const limiar = premissas.variacaoRelevante / 2;
  const sinal = (
    indicador: SinalTendencia['indicador'],
    v: number | null,
    altaBoa: boolean,
    rotulos: [string, string, string],
  ) => {
    if (v === null) return;
    const direcao = v > limiar ? 'alta' : v < -limiar ? 'queda' : 'estavel';
    sinais.push({
      indicador,
      direcao,
      variacao: v,
      favoravel: direcao === 'estavel' ? null : (direcao === 'alta') === altaBoa,
      texto: direcao === 'alta' ? rotulos[0] : direcao === 'queda' ? rotulos[1] : rotulos[2],
    });
  };

  const vf = rel(recentes.faturamento, anteriores.faturamento);
  const vd = rel(recentes.despesas, anteriores.despesas);
  const vr = rel(recentes.resultado, anteriores.resultado);
  sinal('faturamento', vf, true, ['Crescimento do faturamento', 'Queda do faturamento', 'Faturamento estável']);
  sinal('despesas', vd, false, ['Aumento das despesas', 'Redução das despesas', 'Despesas estáveis']);
  sinal('resultado', vr, true, ['Crescimento do lucro', 'Redução do lucro', 'Lucro estável']);
  const dm = recentes.margem !== null && anteriores.margem !== null ? recentes.margem - anteriores.margem : null;
  if (dm !== null) {
    const direcao = dm > premissas.quedaMargemRelevante / 2 ? 'alta' : dm < -premissas.quedaMargemRelevante / 2 ? 'queda' : 'estavel';
    sinais.push({
      indicador: 'margem',
      direcao,
      variacao: dm,
      favoravel: direcao === 'estavel' ? null : direcao === 'alta',
      texto: direcao === 'alta' ? 'Margem em evolução' : direcao === 'queda' ? 'Margem em queda' : 'Margem estável',
    });
  }

  // Frase principal: faturamento x despesas
  if (vf !== null && vd !== null) {
    let frase = `${descricaoJanela.agora}, o faturamento ${verbo(vf)} ${descricaoJanela.base}`;
    if (vf > limiar && vd > vf + limiar) {
      frase += `, porém as despesas cresceram em ritmo superior (${pctSinal(vd)}), reduzindo a margem de lucro.`;
    } else if (vf < -limiar && vd > limiar) {
      frase += `, enquanto as despesas aumentaram ${pct(vd)}, uma combinação que pressiona o resultado.`;
    } else if (vd < -limiar && vf >= -limiar) {
      frase += `, e as despesas recuaram ${pct(-vd)}, o que favorece o resultado.`;
    } else {
      frase += `, e as despesas ${verbo(vd, 'aumentaram', 'diminuíram')}.`;
    }
    narrativa.push(frase);
  } else if (anteriores.faturamento === 0 && recentes.faturamento > 0) {
    narrativa.push(`${descricaoJanela.agora}, houve faturamento de ${moedaInteira(recentes.faturamento)}, sem base de comparação no período anterior.`);
  }

  if (recentes.margem !== null && anteriores.margem !== null && dm !== null) {
    if (Math.abs(dm) >= premissas.quedaMargemRelevante / 2) {
      narrativa.push(
        `A margem de lucro ${dm > 0 ? 'subiu' : 'caiu'} de ${pct(anteriores.margem)} para ${pct(recentes.margem)} (${dm > 0 ? '+' : '−'}${pp(dm)}).`,
      );
    } else {
      narrativa.push(`A margem de lucro se manteve em torno de ${pct(recentes.margem)}.`);
    }
  }
  if (recentes.resultado < 0) {
    narrativa.push(`O resultado acumulado ${janela === 3 ? 'desses 3 meses' : 'do mês'} foi negativo em ${moedaInteira(-recentes.resultado)}.`);
  }

  // Tendência longa: meses consecutivos de alta/queda do faturamento
  let seq = 0;
  for (let k = comDados.length - 1; k > 0; k--) {
    const dir = Math.sign(comDados[k].faturamento - comDados[k - 1].faturamento);
    if (seq === 0) seq = dir;
    else if (Math.sign(seq) === dir && dir !== 0) seq += dir;
    else break;
  }
  if (Math.abs(seq) >= 3) {
    narrativa.push(`O faturamento acumula ${Math.abs(seq)} meses consecutivos de ${seq > 0 ? 'alta' : 'queda'}.`);
  }
  return { meses, sinais, narrativa };
}

/* ------------------------------------------------------------------ */
/* Análise principal                                                   */
/* ------------------------------------------------------------------ */

export function analisar(lancamentos: LancamentoAnalise[], opcoes: OpcoesAnalise): AnaliseFinanceira {
  const premissas: Premissas = { ...PREMISSAS_PADRAO, ...opcoes.premissas };
  const atual = agregar(lancamentos, opcoes.atual);
  const comp = agregar(lancamentos, opcoes.comparacao);
  const temComparacao = !!opcoes.comparacao && comp.quantidade > 0;
  const comparacaoParcial = temComparacao && comp.meses.size < tamanho(opcoes.comparacao!);
  const rotuloAtual = rotuloIntervalo(opcoes.atual);
  const rc = opcoes.rotuloComparacao;
  const semDados = atual.quantidade === 0;
  const notas: string[] = [];

  if (semDados) notas.push('Ainda não existem dados financeiros importados para este período.');
  else if (!temComparacao) notas.push(`Não há histórico suficiente para comparar este período com o ${rc}.`);
  else if (comparacaoParcial) notas.push(`O ${rc} possui dados de apenas ${comp.meses.size} de ${tamanho(opcoes.comparacao!)} meses; as comparações devem ser lidas com cautela.`);
  if (!semDados && atual.meses.size < tamanho(opcoes.atual)) {
    notas.push(`O período selecionado possui dados em ${atual.meses.size} de ${tamanho(opcoes.atual)} meses.`);
  }

  const pe = calcularPE(atual);
  const peComp = temComparacao ? calcularPE(comp) : null;
  const ant = <T,>(v: T) => (temComparacao ? v : null);

  const faturamento = variacao(atual.receita, ant(comp.receita));
  const despesas = variacao(atual.despesa, ant(comp.despesa));
  const resultado = variacao(resultadoDe(atual), ant(resultadoDe(comp)));
  const margemAtual = margemDe(atual);
  const margemAnterior = temComparacao ? margemDe(comp) : null;
  const difMargem = margemAtual !== null && margemAnterior !== null ? margemAtual - margemAnterior : null;

  /* ---------- explicações dos KPIs ---------- */
  const compTxt = (v: Variacao, nomeBase: string) =>
    v.percentual === null
      ? ''
      : ` ${v.percentual >= 0 ? 'Alta' : 'Queda'} de ${pct(Math.abs(v.percentual))} em relação ao ${rc} (${moedaInteira(v.anterior!)} ${nomeBase}).`;

  const explicacoes = {
    faturamento: semDados
      ? 'Ainda não existem dados financeiros importados para este período.'
      : `Total de receitas reconhecidas em ${rotuloAtual.toLowerCase()}.${compTxt(faturamento, 'no período de comparação')}`,
    despesas: semDados
      ? 'Ainda não existem dados financeiros importados para este período.'
      : atual.receita > 0
        ? `Para cada R$ 100 faturados, R$ ${(Math.round((atual.despesa / atual.receita) * 10000) / 100).toFixed(2).replace('.', ',')} foram consumidos por despesas.${compTxt(despesas, 'no período de comparação')}`
        : `Total de despesas do período.${compTxt(despesas, 'no período de comparação')}`,
    resultado: semDados
      ? 'Ainda não existem dados financeiros importados para este período.'
      : resultado.atual >= 0
        ? `É o que sobrou depois de pagar as despesas: ${moedaInteira(resultado.atual)} no período.`
        : `As despesas superaram o faturamento em ${moedaInteira(-resultado.atual)} no período.`,
    margem:
      margemAtual === null
        ? 'A margem depende de faturamento registrado no período.'
        : margemAtual >= 0
          ? `De cada R$ 100 faturados, aproximadamente ${moeda(margemAtual * 100)} permanecem como resultado após as despesas consideradas.`
          : `De cada R$ 100 faturados, faltaram aproximadamente ${moeda(-margemAtual * 100)} para cobrir as despesas.`,
    pontoEquilibrio:
      pe.status === 'insuficiente'
        ? pe.motivo
        : pe.pontoEquilibrio === null
          ? pe.texto
          : `Faturamento mínimo para cobrir as despesas fixas e variáveis do período. ${pe.texto}`,
  };

  /* ---------- evolução ---------- */
  const evolucao = analisarEvolucao(lancamentos, opcoes.atual.fim, premissas);

  /* ---------- top despesas ---------- */
  const itensAnt = new Map([...comp.itens.entries()].map(([k, v]) => [k, v.valor]));
  const topItens: ItemDespesa[] = [...atual.itens.entries()]
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 5)
    .map(([k, v]) => {
      const anterior = temComparacao ? itensAnt.get(k) ?? 0 : null;
      return {
        nome: v.nome,
        categoria: v.categoria,
        valor: v.valor,
        participacao: atual.despesa ? v.valor / atual.despesa : 0,
        anterior,
        variacao: rel(v.valor, anterior),
      };
    });
  const leiturasTop: string[] = [];
  if (topItens.length) {
    const t = topItens[0];
    let frase = `${t.nome} (${t.categoria}) é a maior despesa do período e representa ${pct(t.participacao)} das despesas totais.`;
    if (t.variacao !== null && t.variacao > premissas.variacaoRelevante) {
      frase += ` Ela aumentou ${pct(t.variacao)} em relação ao ${rc}`;
      if (faturamento.percentual !== null && faturamento.percentual < t.variacao) {
        frase += `, acima da variação do faturamento (${pctSinal(faturamento.percentual)}). O aumento merece acompanhamento para verificar se está sendo acompanhado por crescimento proporcional do faturamento.`;
      } else {
        frase += '.';
      }
    } else if (t.variacao !== null && t.variacao < -premissas.variacaoRelevante) {
      frase += ` Ela recuou ${pct(-t.variacao)} em relação ao ${rc}.`;
    }
    leiturasTop.push(frase);
    const somaTop = topItens.reduce((s, i) => s + i.participacao, 0);
    if (topItens.length >= 3) {
      leiturasTop.push(`Juntas, as ${topItens.length} maiores despesas somam ${pct(somaTop)} do total gasto no período.`);
    }
  }

  /* ---------- categorias ---------- */
  const categorias: CategoriaAnalise[] = [...atual.categorias.entries()]
    .map(([categoria, v]) => {
      const anterior = temComparacao ? comp.categorias.get(categoria)?.valor ?? 0 : null;
      return {
        categoria,
        valor: v.valor,
        participacao: atual.despesa ? v.valor / atual.despesa : 0,
        anterior,
        variacao: rel(v.valor, anterior),
        subcategorias: [...v.subs.entries()]
          .map(([nome, valor]) => ({ nome, valor, participacao: v.valor ? valor / v.valor : 0 }))
          .sort((a, b) => b.valor - a.valor),
      };
    })
    .sort((a, b) => b.valor - a.valor);

  /* ---------- centros de custo ---------- */
  let centros: AnaliseCentros;
  if (!opcoes.usaCentroCusto) {
    centros = {
      disponivel: false,
      mensagem: 'A análise por centro de custo estará disponível quando os lançamentos forem classificados por centro de custo.',
    };
  } else if (atual.centros.size === 0) {
    centros = { disponivel: false, mensagem: 'Não existem centros de custo informados nos lançamentos deste período.' };
  } else {
    const mesesAtual = mesesDe(opcoes.atual);
    const lista_ = [...atual.centros.entries()]
      .map(([nome, v]): CentroAnalise => {
        const anterior = temComparacao ? comp.centros.get(nome)?.valor ?? 0 : null;
        return {
          nome,
          valor: v.valor,
          participacao: atual.despesa ? v.valor / atual.despesa : 0,
          sobreFaturamento: atual.receita > 0 ? v.valor / atual.receita : null,
          anterior,
          variacao: rel(v.valor, anterior),
          maioresDespesas: [...v.itens.values()].sort((a, b) => b.valor - a.valor).slice(0, 3),
          evolucao: mesesAtual.map((mes) => ({
            mes,
            valor: lancamentos
              .filter((l) => l.tipo === 'despesa' && l.mes === mes && l.centroCusto === nome)
              .reduce((s, l) => s + l.valor, 0),
          })),
        };
      })
      .sort((a, b) => b.valor - a.valor);
    const maior = lista_[0];
    const cresceu = lista_
      .filter((c) => c.variacao !== null && c.variacao > premissas.variacaoRelevante && c.anterior! > 0)
      .sort((a, b) => b.valor - b.anterior! - (a.valor - a.anterior!))[0];
    const leituras: string[] = [];
    leituras.push(
      `O centro de custo ${maior.nome} concentra ${pct(maior.participacao)} das despesas da empresa${maior.participacao >= 0.4 ? ' e representa o principal ponto de atenção financeira no período' : ''}.`,
    );
    if (maior.sobreFaturamento !== null) {
      leituras.push(`${maior.nome} consome o equivalente a ${pct(maior.sobreFaturamento)} do faturamento do período.`);
    }
    if (cresceu) {
      leituras.push(
        `${cresceu.nome} foi o centro que mais cresceu: ${pctSinal(cresceu.variacao!)} em relação ao ${rc} (de ${moedaInteira(cresceu.anterior!)} para ${moedaInteira(cresceu.valor)}).`,
      );
    }
    if (atual.semCentro.valor > 0) {
      leituras.push(`${moedaInteira(atual.semCentro.valor)} em despesas não possuem centro de custo informado.`);
    }
    centros = {
      disponivel: true,
      centros: lista_,
      semCentro: { ...atual.semCentro, participacao: atual.despesa ? atual.semCentro.valor / atual.despesa : 0 },
      maisRepresenta: maior.nome,
      maisCresceu: cresceu ? { nome: cresceu.nome, variacao: cresceu.variacao! } : null,
      leituras,
    };
  }

  /* ---------- achados (diagnóstico + insights) ---------- */
  const achados: Achado[] = semDados ? [] : gerarAchados();

  function gerarAchados(): Achado[] {
    const r: Achado[] = [];
    const res = resultadoDe(atual);
    const vf = faturamento.percentual;
    const vd = despesas.percentual;
    const relv = premissas.variacaoRelevante;

    // 1. Resultado negativo
    if (res < 0) {
      r.push({
        id: 'resultado_negativo',
        tipo: 'atencao',
        severidade: 3,
        titulo: 'Resultado negativo',
        dado: `O período fechou com resultado de −${moedaInteira(-res)}.`,
        impacto:
          atual.receita > 0
            ? `As despesas superaram o faturamento em ${pct(-res / atual.receita)}, o que consome caixa da empresa.`
            : 'Não houve faturamento para cobrir as despesas, o que consome caixa da empresa.',
        insight: 'A empresa operou com prejuízo no período.',
        recomendacao: 'Atuar nas maiores despesas e em ações de receita para recompor o resultado.',
        alerta: atual.receita > 0 ? 'Margem negativa' : 'Resultado negativo',
        prioridade: {
          titulo: 'Recompor o resultado',
          texto: `As despesas superaram o faturamento em ${moedaInteira(-res)} no período. A primeira frente é revisar as maiores despesas${topItens[0] ? `, começando por ${topItens[0].nome} (${pct(topItens[0].participacao)} do total)` : ''}.`,
          peso: 100,
        },
      });
    }

    // 2. Faturamento
    if (vf !== null && vf >= relv) {
      r.push({
        id: 'faturamento_alta',
        tipo: 'positivo',
        severidade: 1,
        titulo: 'Crescimento do faturamento',
        dado: `O faturamento cresceu ${pct(vf)}, de ${moedaInteira(comp.receita)} para ${moedaInteira(atual.receita)}.`,
        comparacao: `Comparado ao ${rc}.`,
        insight: `O faturamento cresceu ${pct(vf)} em relação ao ${rc}.`,
      });
    } else if (vf !== null && vf <= -relv) {
      r.push({
        id: 'faturamento_queda',
        tipo: 'atencao',
        severidade: 2,
        titulo: 'Queda do faturamento',
        dado: `O faturamento caiu ${pct(-vf)}, de ${moedaInteira(comp.receita)} para ${moedaInteira(atual.receita)}.`,
        comparacao: `Comparado ao ${rc}.`,
        impacto: `São ${moedaInteira(comp.receita - atual.receita)} a menos para cobrir as despesas do período.`,
        insight: `O faturamento recuou ${pct(-vf)} em relação ao ${rc}.`,
        recomendacao: 'Entender a origem da queda (clientes, produtos ou sazonalidade) e reforçar as ações comerciais.',
        alerta: 'Queda do faturamento',
        prioridade: {
          titulo: 'Recuperar o faturamento',
          texto: `O faturamento caiu ${pct(-vf)} em relação ao ${rc}, ${moedaInteira(comp.receita - atual.receita)} a menos no período.`,
          peso: 70 + Math.min(20, -vf * 100),
        },
      });
    }

    // 3. Despesas crescendo acima do faturamento
    const despesasAcima = vf !== null && vd !== null && vd > 0 && vd - vf >= relv;
    if (despesasAcima) {
      const aumentos = categorias
        .filter((c) => c.anterior !== null && c.valor > c.anterior)
        .sort((a, b) => b.valor - b.anterior! - (a.valor - a.anterior!))
        .slice(0, 2);
      r.push({
        id: 'despesas_acima_faturamento',
        tipo: 'atencao',
        severidade: 2,
        titulo: 'Despesas crescendo acima do faturamento',
        dado: `As despesas cresceram ${pct(vd!)} (${moedaInteira(comp.despesa)} → ${moedaInteira(atual.despesa)}).`,
        comparacao: `No mesmo intervalo, o faturamento ${verbo(vf!)} em relação ao ${rc}.`,
        impacto:
          difMargem !== null
            ? `A margem passou de ${pct(margemAnterior!)} para ${pct(margemAtual!)}, pressionando o resultado.`
            : 'O descompasso pressiona o resultado.',
        insight: `O faturamento ${verbo(vf!)} no período, enquanto as despesas cresceram ${pct(vd!)}, pressionando o resultado.`,
        recomendacao: aumentos.length
          ? `Revisar os grupos que mais contribuíram para o aumento: ${lista(aumentos.map((c) => `${c.categoria} (+${moedaInteira(c.valor - c.anterior!)})`))}.`
          : 'Revisar os principais grupos de despesas que contribuíram para o aumento.',
        alerta: 'Despesas acima do faturamento',
        prioridade: {
          titulo: 'Conter o crescimento das despesas',
          texto: `As despesas cresceram ${pct(vd!)}, contra ${pctSinal(vf!)} do faturamento.${aumentos[0] ? ` O maior aumento veio de ${aumentos[0].categoria} (+${moedaInteira(aumentos[0].valor - aumentos[0].anterior!)}).` : ''}`,
          peso: 80,
        },
      });
    }

    // 4. Despesas (variação isolada)
    if (vd !== null && vd <= -relv) {
      r.push({
        id: 'despesas_reducao',
        tipo: 'positivo',
        severidade: 1,
        titulo: 'Redução das despesas',
        dado: `As despesas recuaram ${pct(-vd)}, uma economia de ${moedaInteira(comp.despesa - atual.despesa)}.`,
        comparacao: `Comparado ao ${rc}.`,
        insight: `As despesas foram reduzidas em ${pct(-vd)} (${moedaInteira(comp.despesa - atual.despesa)}) em relação ao ${rc}.`,
      });
    } else if (vd !== null && vd >= relv && !despesasAcima) {
      r.push({
        id: 'despesas_alta',
        tipo: 'atencao',
        severidade: 1,
        titulo: 'Aumento das despesas',
        dado: `As despesas aumentaram ${pct(vd)} (${moedaInteira(comp.despesa)} → ${moedaInteira(atual.despesa)}).`,
        comparacao: `O faturamento ${verbo(vf ?? 0)} no mesmo intervalo.`,
        insight: `As despesas cresceram ${pct(vd)} em relação ao ${rc}, em linha com o faturamento.`,
        recomendacao: 'Acompanhar se o aumento se mantém proporcional ao faturamento nos próximos meses.',
      });
    }

    // 5. Margem
    if (difMargem !== null) {
      if (difMargem <= -premissas.quedaMargemRelevante) {
        r.push({
          id: 'margem_queda',
          tipo: 'atencao',
          severidade: 2,
          titulo: 'Margem em queda',
          dado: `A margem caiu de ${pct(margemAnterior!)} para ${pct(margemAtual!)}.`,
          comparacao: `Queda de ${pp(difMargem)} em relação ao ${rc}.`,
          impacto: `Hoje sobram ${moeda(Math.max(0, margemAtual!) * 100)} de cada R$ 100 faturados, contra ${moeda(Math.max(0, margemAnterior!) * 100)} antes.`,
          insight: `A margem caiu de ${pct(margemAnterior!)} para ${pct(margemAtual!)} (−${pp(difMargem)}).`,
          recomendacao: 'Verificar preços praticados e as despesas que cresceram mais do que o faturamento.',
          alerta: 'Queda relevante da margem',
          prioridade: {
            titulo: 'Recuperar a margem',
            texto: `A margem apresentou queda de ${pp(difMargem)}, de ${pct(margemAnterior!)} para ${pct(margemAtual!)}.`,
            peso: 75,
          },
        });
      } else if (difMargem >= premissas.quedaMargemRelevante) {
        r.push({
          id: 'margem_alta',
          tipo: 'positivo',
          severidade: 1,
          titulo: margemAtual! >= 0 ? 'Aumento da margem' : 'Melhora da margem',
          dado: `A margem subiu de ${pct(margemAnterior!)} para ${pct(margemAtual!)}.`,
          comparacao: `Alta de ${pp(difMargem)} em relação ao ${rc}.`,
          insight:
            margemAtual! >= 0
              ? `A margem de lucro avançou ${pp(difMargem)}, de ${pct(margemAnterior!)} para ${pct(margemAtual!)}.`
              : `A margem melhorou ${pp(difMargem)} (de ${pct(margemAnterior!)} para ${pct(margemAtual!)}), mas continua negativa.`,
        });
      }
    }

    // 6. Resultado melhorou
    if (resultado.percentual !== null && res > 0 && resultado.diferenca! > 0 && resultado.percentual >= relv) {
      r.push({
        id: 'resultado_alta',
        tipo: 'positivo',
        severidade: 1,
        titulo: 'Melhora do resultado',
        dado: `O resultado passou de ${moedaInteira(resultado.anterior!)} para ${moedaInteira(res)}.`,
        insight: `O resultado melhorou ${moedaInteira(resultado.diferenca!)} em relação ao ${rc}.`,
      });
    } else if (resultado.anterior !== null && resultado.anterior < 0 && res >= 0) {
      r.push({
        id: 'resultado_virada',
        tipo: 'positivo',
        severidade: 1,
        titulo: 'Resultado voltou a ser positivo',
        dado: `O resultado passou de −${moedaInteira(-resultado.anterior)} para ${moedaInteira(res)}.`,
        insight: `A empresa saiu do prejuízo do ${rc} para um resultado positivo de ${moedaInteira(res)}.`,
      });
    }

    // 7. Margem saudável
    if (margemAtual !== null && margemAtual >= premissas.margemReferencia && (difMargem === null || difMargem > -premissas.quedaMargemRelevante)) {
      r.push({
        id: 'margem_saudavel',
        tipo: 'positivo',
        severidade: 1,
        titulo: 'Margem acima da referência',
        dado: `Margem de ${pct(margemAtual)} no período.`,
        insight: `A margem de ${pct(margemAtual)} está acima da referência de ${pct(premissas.margemReferencia)} definida para a empresa.`,
      });
    }

    // 8. Ponto de equilíbrio
    if (pe.status === 'calculado') {
      if (pe.situacao === 'abaixo') {
        r.push({
          id: 'abaixo_pe',
          tipo: 'atencao',
          severidade: 3,
          titulo: 'Faturamento abaixo do ponto de equilíbrio',
          dado:
            pe.pontoEquilibrio !== null
              ? `Faturamento de ${moedaInteira(pe.faturamento)} contra ponto de equilíbrio de ${moedaInteira(pe.pontoEquilibrio)}.`
              : `As despesas variáveis (${moedaInteira(pe.despesasVariaveis)}) superam o faturamento (${moedaInteira(pe.faturamento)}).`,
          impacto: 'O faturamento atual ainda não cobre o nível de despesas utilizado no cálculo do ponto de equilíbrio.',
          insight:
            pe.pontoEquilibrio !== null
              ? `Faltam ${moedaInteira(-pe.distancia!)} de faturamento (${pct(-pe.distanciaPct!)}) para atingir o ponto de equilíbrio.`
              : 'As despesas variáveis consomem todo o faturamento.',
          recomendacao: 'Combinar ações de aumento de receita com a revisão das despesas fixas de maior peso.',
          alerta: 'Abaixo do ponto de equilíbrio',
          prioridade: {
            titulo: 'Atingir o ponto de equilíbrio',
            texto:
              pe.pontoEquilibrio !== null
                ? `O faturamento precisa de mais ${moedaInteira(-pe.distancia!)} (${pct(-pe.distanciaPct!)}) para cobrir as despesas do período.`
                : `As despesas variáveis superam o faturamento: rever preços e custos variáveis é a primeira frente.`,
            peso: 95,
          },
        });
        if (pe.pontoEquilibrio !== null) {
          r.push({
            id: 'oportunidade_receita',
            tipo: 'oportunidade',
            severidade: 2,
            titulo: 'Buscar aumento de receita',
            dado: `O ponto de equilíbrio do período é ${moedaInteira(pe.pontoEquilibrio)}.`,
            insight: `Um aumento de ${moedaInteira(-pe.distancia!)} no faturamento, mantida a margem de contribuição de ${pct(pe.margemContribuicaoPct)}, levaria a empresa ao ponto de equilíbrio.`,
            recomendacao: 'Avaliar reajuste de preços, ampliação da carteira e produtos ou serviços de maior margem.',
          });
        }
      } else if (pe.distanciaPct !== null && pe.distanciaPct < premissas.folgaMinimaPE) {
        r.push({
          id: 'proximo_pe',
          tipo: 'atencao',
          severidade: 2,
          titulo: 'Próximo do ponto de equilíbrio',
          dado: `O faturamento está apenas ${pct(pe.distanciaPct)} acima do ponto de equilíbrio (${moedaInteira(pe.distancia!)}).`,
          impacto: 'Uma pequena queda de receita ou aumento de despesas pode levar o resultado ao negativo.',
          insight: `A folga sobre o ponto de equilíbrio é de ${pct(pe.distanciaPct)}, abaixo da referência de ${pct(premissas.folgaMinimaPE)}.`,
          recomendacao: 'Acompanhar o ponto de equilíbrio mês a mês e evitar novas despesas fixas no curto prazo.',
          alerta: 'Próximo do ponto de equilíbrio',
          prioridade: {
            titulo: 'Acompanhar o ponto de equilíbrio',
            texto: `O faturamento está apenas ${pct(pe.distanciaPct)} acima do ponto de equilíbrio.`,
            peso: 65,
          },
        });
      } else if (pe.distanciaPct !== null && pe.distanciaPct >= 0.2) {
        r.push({
          id: 'folga_pe',
          tipo: 'positivo',
          severidade: 1,
          titulo: 'Folga sobre o ponto de equilíbrio',
          dado: `Faturamento ${pct(pe.distanciaPct)} acima do ponto de equilíbrio.`,
          insight: `O faturamento supera o ponto de equilíbrio em ${moedaInteira(pe.distancia!)} (${pct(pe.distanciaPct)} de folga).`,
        });
      }
      if (peComp && peComp.status === 'calculado' && peComp.pontoEquilibrio && pe.pontoEquilibrio) {
        const vpe = rel(pe.pontoEquilibrio, peComp.pontoEquilibrio)!;
        if (vpe >= relv && (vf === null || vpe > vf + relv / 2)) {
          r.push({
            id: 'pe_subiu',
            tipo: 'atencao',
            severidade: 1,
            titulo: 'Ponto de equilíbrio mais alto',
            dado: `O ponto de equilíbrio subiu ${pct(vpe)}, de ${moedaInteira(peComp.pontoEquilibrio)} para ${moedaInteira(pe.pontoEquilibrio)}.`,
            impacto: 'A empresa precisa faturar mais para cobrir a mesma operação.',
            insight: `O ponto de equilíbrio subiu ${pct(vpe)} em relação ao ${rc}, acima da variação do faturamento.`,
            recomendacao: 'Verificar quais despesas fixas aumentaram e se a margem de contribuição foi preservada.',
          });
        }
      }
    }

    // 9. Concentração de despesas (5 maiores despesas por subcategoria)
    const partTop5 = topItens.reduce((s, c) => s + c.participacao, 0);
    if (atual.itens.size > 8 && partTop5 >= premissas.concentracaoTop5) {
      r.push({
        id: 'concentracao',
        tipo: 'atencao',
        severidade: 1,
        titulo: 'Concentração de despesas',
        dado: `As 5 maiores despesas representam ${pct(partTop5)} das despesas totais, entre ${atual.itens.size} tipos de despesa.`,
        impacto: `Concentrar a gestão em ${lista(topItens.slice(0, 3).map((c) => c.nome))} tem o maior efeito sobre o resultado.`,
        insight: `As 5 maiores despesas (${lista(topItens.map((c) => c.nome))}) representam ${pct(partTop5)} das despesas totais.`,
        recomendacao: 'Priorizar a revisão desses grupos antes de despesas menores.',
      });
    }
    if (categorias[0] && categorias[0].participacao >= 0.25) {
      const c = categorias[0];
      r.push({
        id: 'renegociar_maior',
        tipo: 'oportunidade',
        severidade: 1,
        titulo: `Renegociar ${c.categoria}`,
        dado: `${c.categoria} soma ${moedaInteira(c.valor)} (${pct(c.participacao)} das despesas).`,
        insight: `${c.categoria} é o maior grupo de despesas, com ${pct(c.participacao)} do total; cada 5% de economia representa ${moedaInteira(c.valor * 0.05)} no período.`,
        recomendacao: c.subcategorias[0]
          ? `Começar pela maior subcategoria: ${c.subcategorias[0].nome} (${moedaInteira(c.subcategorias[0].valor)}).`
          : 'Revisar contratos e fornecedores desse grupo.',
      });
    }

    // 10. Categoria com aumento expressivo
    const expressivas = categorias
      .filter(
        (c) =>
          c.anterior !== null &&
          c.anterior > 0 &&
          c.variacao! >= premissas.crescimentoCategoriaRelevante &&
          c.participacao >= premissas.pesoMinimoCategoria,
      )
      .sort((a, b) => b.valor - b.anterior! - (a.valor - a.anterior!));
    if (expressivas[0]) {
      const c = expressivas[0];
      const receitaAbaixo = vf !== null && vf < c.variacao!;
      r.push({
        id: `categoria_alta_${c.categoria}`,
        tipo: 'atencao',
        severidade: 2,
        titulo: `Aumento expressivo em ${c.categoria}`,
        dado: `${c.categoria} aumentou ${pct(c.variacao!)}, de ${moedaInteira(c.anterior!)} para ${moedaInteira(c.valor)}.`,
        comparacao: `Comparado ao ${rc}.`,
        impacto: `${c.categoria} passou a representar ${pct(c.participacao)} das despesas${receitaAbaixo ? `, enquanto o faturamento variou ${pctSinal(vf!)}` : ''}.`,
        insight: `${c.categoria} cresceu ${pct(c.variacao!)} e representa ${pct(c.participacao)} das despesas totais.`,
        recomendacao: receitaAbaixo
          ? `Verificar se o aumento de ${c.categoria} está sendo acompanhado por crescimento proporcional do faturamento.`
          : `Entender o que motivou o aumento de ${c.categoria} e se ele é pontual ou recorrente.`,
        alerta: `Aumento em ${c.categoria}`,
        prioridade: {
          titulo: `Revisar despesas de ${c.categoria}`,
          texto: `${c.categoria} cresceu ${pct(c.variacao!)} (+${moedaInteira(c.valor - c.anterior!)}) e representa ${pct(c.participacao)} das despesas totais.`,
          peso: 60 + Math.min(15, c.participacao * 50),
        },
      });
    }
    // categorias crescendo acima da média
    if (vd !== null) {
      const acimaMedia = categorias.filter(
        (c) =>
          c !== expressivas[0] &&
          c.anterior !== null &&
          c.anterior > 0 &&
          c.variacao! > vd + 0.1 &&
          c.participacao >= premissas.pesoMinimoCategoria / 2,
      );
      if (acimaMedia.length) {
        r.push({
          id: 'categorias_acima_media',
          tipo: 'oportunidade',
          severidade: 1,
          titulo: 'Revisar categorias com crescimento acima da média',
          dado: `${lista(acimaMedia.slice(0, 3).map((c) => `${c.categoria} (${pctSinal(c.variacao!)})`))} ${acimaMedia.length === 1 ? 'cresceu' : 'cresceram'} acima da média das despesas (${pctSinal(vd)}).`,
          insight: `${lista(acimaMedia.slice(0, 3).map((c) => `${c.categoria} (${pctSinal(c.variacao!)})`))} ${acimaMedia.length === 1 ? 'cresceu' : 'cresceram'} mais do que o conjunto das despesas (${pctSinal(vd)}).`,
          recomendacao: 'Verificar se esses aumentos são pontuais ou se indicam uma nova base de gastos.',
        });
      }
    }

    // 11. Despesas recorrentes (presentes nos últimos 3 meses com dados)
    const ultimos = evolucao.meses.filter((m) => m.temDados).slice(-3).map((m) => m.mes);
    if (ultimos.length === 3) {
      const porItem = new Map<string, { nome: string; meses: Set<string>; total: number }>();
      for (const l of lancamentos) {
        if (l.tipo !== 'despesa' || !ultimos.includes(l.mes) || l.natureza !== 'fixa') continue;
        const nome = nomeItem(l);
        const it = porItem.get(nome) ?? { nome, meses: new Set(), total: 0 };
        it.meses.add(l.mes);
        it.total += l.valor;
        porItem.set(nome, it);
      }
      const recorrentes = [...porItem.values()].filter((i) => i.meses.size === 3).sort((a, b) => b.total - a.total);
      if (recorrentes.length >= 2) {
        const top = recorrentes.slice(0, 3);
        const mensal = top.reduce((s, i) => s + i.total, 0) / 3;
        r.push({
          id: 'recorrentes',
          tipo: 'oportunidade',
          severidade: 1,
          titulo: 'Avaliar despesas recorrentes',
          dado: `${lista(top.map((i) => i.nome))} se repetem todos os meses e somam cerca de ${moedaInteira(mensal)} por mês.`,
          insight: `As principais despesas fixas recorrentes (${lista(top.map((i) => i.nome))}) somam cerca de ${moedaInteira(mensal)} por mês.`,
          recomendacao: 'Revisar contratos, planos e fornecedores dessas despesas; ganhos aqui se repetem todos os meses.',
        });
      }
    }

    // 12. Centros de custo
    if (centros.disponivel) {
      const maior = centros.centros[0];
      if (maior.participacao >= 0.4 && centros.centros.length > 1) {
        r.push({
          id: 'centro_concentrado',
          tipo: 'atencao',
          severidade: 1,
          titulo: `Centro de custo ${maior.nome} concentra as despesas`,
          dado: `${maior.nome} concentra ${pct(maior.participacao)} das despesas (${moedaInteira(maior.valor)}).`,
          impacto: maior.sobreFaturamento !== null ? `Equivale a ${pct(maior.sobreFaturamento)} do faturamento do período.` : undefined,
          insight: `O centro de custo ${maior.nome} concentra ${pct(maior.participacao)} das despesas da empresa e representa o principal ponto de atenção financeira no período.`,
          recomendacao: `Acompanhar mensalmente as maiores despesas de ${maior.nome}${maior.maioresDespesas[0] ? `, a começar por ${maior.maioresDespesas[0].nome}` : ''}.`,
        });
      }
      if (centros.maisCresceu && centros.maisCresceu.variacao >= premissas.crescimentoCategoriaRelevante) {
        const c = centros.centros.find((x) => x.nome === centros.maisCresceu!.nome)!;
        r.push({
          id: 'centro_cresceu',
          tipo: 'oportunidade',
          severidade: 1,
          titulo: `Acompanhar o centro ${c.nome}`,
          dado: `${c.nome} cresceu ${pct(c.variacao!)}, de ${moedaInteira(c.anterior!)} para ${moedaInteira(c.valor)}.`,
          insight: `${c.nome} foi o centro de custo que mais cresceu no período (${pctSinal(c.variacao!)}).`,
          recomendacao: `Verificar com o responsável por ${c.nome} o que motivou o aumento.`,
        });
      }
      if (centros.semCentro.valor > 0) {
        r.push({
          id: 'sem_centro',
          tipo: 'oportunidade',
          severidade: centros.semCentro.participacao > 0.1 ? 2 : 1,
          titulo: 'Classificar despesas sem centro de custo',
          dado: `${moedaInteira(centros.semCentro.valor)} em despesas não possuem centro de custo informado (${centros.semCentro.quantidade} lançamento(s)).`,
          insight: `${moedaInteira(centros.semCentro.valor)} em despesas (${pct(centros.semCentro.participacao)}) não possuem centro de custo informado.`,
          recomendacao: 'Classificar essas despesas permitirá uma visão mais precisa de onde os recursos da empresa estão sendo consumidos.',
          alerta: centros.semCentro.participacao > 0.1 ? 'Despesas sem centro de custo' : undefined,
        });
      }
    }

    // 13. Despesas sem natureza
    const partSemNatureza = atual.despesa ? atual.semNatureza / atual.despesa : 0;
    if (partSemNatureza >= 0.01) {
      const part = partSemNatureza;
      r.push({
        id: 'sem_natureza',
        tipo: 'oportunidade',
        severidade: part > 0.1 ? 2 : 1,
        titulo: 'Melhorar a classificação financeira',
        dado: `${moedaInteira(atual.semNatureza)} em despesas (${pct(part)}) não estão classificadas como fixas ou variáveis.`,
        insight: `${pct(part)} das despesas não têm natureza (fixa ou variável) informada.`,
        recomendacao:
          part > 0.1
            ? 'Classificar essas despesas habilita o cálculo do ponto de equilíbrio com segurança.'
            : 'Completar a classificação torna o ponto de equilíbrio mais preciso.',
        alerta: part > 0.1 ? 'Despesas sem classificação' : undefined,
      });
    }

    return r;
  }

  /* ---------- organização dos achados ---------- */
  const porSeveridade = (a: Achado, b: Achado) => b.severidade - a.severidade;
  const positivos = achados.filter((a) => a.tipo === 'positivo').sort(porSeveridade);
  const atencao = achados.filter((a) => a.tipo === 'atencao').sort(porSeveridade);
  const oportunidades = achados.filter((a) => a.tipo === 'oportunidade').sort(porSeveridade);

  const comPrioridade = achados
    .filter((a) => a.prioridade)
    .sort((a, b) => b.prioridade!.peso - a.prioridade!.peso);
  const prioridades: Prioridade[] = [];
  const usados = new Set<string>();
  for (const a of comPrioridade) {
    if (prioridades.length >= 3) break;
    // evita duas prioridades com a mesma mensagem central
    const grupo = a.id.startsWith('categoria_alta') ? 'categoria' : a.id;
    if (usados.has(grupo)) continue;
    if ((a.id === 'margem_queda' && usados.has('resultado_negativo')) || (a.id === 'resultado_negativo' && usados.has('margem_queda'))) continue;
    usados.add(grupo);
    prioridades.push({ ordem: prioridades.length + 1, titulo: a.prioridade!.titulo, texto: a.prioridade!.texto });
  }
  for (const o of oportunidades) {
    if (prioridades.length >= 3) break;
    if (o.severidade < 2 && prioridades.length >= 1) continue;
    prioridades.push({ ordem: prioridades.length + 1, titulo: o.titulo, texto: o.insight });
  }

  const alertas = achados
    .filter((a) => a.alerta && a.severidade >= 2)
    .sort(porSeveridade)
    .map((a) => ({ id: a.id, rotulo: a.alerta!, severidade: a.severidade }));
  if (!semDados && !temComparacao) alertas.push({ id: 'dados_insuficientes', rotulo: 'Sem histórico para comparação', severidade: 1 });

  return {
    periodo: {
      atual: opcoes.atual,
      rotuloAtual,
      comparacao: opcoes.comparacao,
      rotuloComparacao: rc,
      temComparacao,
      comparacaoParcial,
    },
    semDados,
    quantidadeLancamentos: atual.quantidade,
    kpis: {
      faturamento,
      despesas,
      resultado,
      margem: { atual: margemAtual, anterior: margemAnterior, diferenca: difMargem },
      pontoEquilibrio: {
        atual: pe.status === 'calculado' ? pe.pontoEquilibrio : null,
        anterior: peComp && peComp.status === 'calculado' ? peComp.pontoEquilibrio : null,
      },
    },
    explicacoes,
    evolucao,
    topDespesas: { itens: topItens, leituras: leiturasTop },
    categorias,
    centros,
    pontoEquilibrio: pe,
    diagnostico: [...atencao, ...achados.filter((a) => a.id === 'sem_natureza' || a.id === 'sem_centro')].sort(porSeveridade),
    insights: { positivos, atencao, oportunidades },
    prioridades,
    alertas,
    notas,
  };
}

/** Resumo enxuto usado no painel da Rosan (último mês com dados). */
export interface ResumoCliente {
  ultimoPeriodo: string | null;
  faturamento: number;
  despesas: number;
  resultado: number;
  margem: number | null;
  abaixoPE: boolean | null;
  atencao: boolean;
  alertas: string[];
}

export function resumirCliente(lancamentos: LancamentoAnalise[], usaCentroCusto: boolean, premissas?: Partial<Premissas>): ResumoCliente {
  const meses = lancamentos.filter((l) => l.tipo !== 'transferencia').map((l) => l.mes);
  if (!meses.length) {
    return { ultimoPeriodo: null, faturamento: 0, despesas: 0, resultado: 0, margem: null, abaixoPE: null, atencao: false, alertas: [] };
  }
  const ultimo = meses.reduce((a, b) => (a > b ? a : b));
  const anterior = deslocarMes(ultimo, -1);
  const a = analisar(lancamentos, {
    atual: { inicio: ultimo, fim: ultimo },
    comparacao: { inicio: anterior, fim: anterior },
    rotuloComparacao: 'mês anterior',
    usaCentroCusto,
    premissas,
  });
  return {
    ultimoPeriodo: ultimo,
    faturamento: a.kpis.faturamento.atual,
    despesas: a.kpis.despesas.atual,
    resultado: a.kpis.resultado.atual,
    margem: a.kpis.margem.atual,
    abaixoPE: a.pontoEquilibrio.status === 'calculado' ? a.pontoEquilibrio.situacao === 'abaixo' : null,
    atencao: a.alertas.some((x) => x.severidade >= 2),
    alertas: a.alertas.filter((x) => x.severidade >= 2).map((x) => x.rotulo),
  };
}


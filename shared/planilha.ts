/**
 * Planilha padrão Rosan (aba Base_Financeira): definição das colunas,
 * normalização dos valores e validação linha a linha.
 *
 * A validação é pura (não acessa banco nem arquivo) para poder ser testada
 * e reutilizada; o servidor lê o Excel e entrega as células para cá.
 */
import { ehMes } from './periodos';

export const ABA_PRINCIPAL = 'Base_Financeira';

export const COLUNAS = [
  'Data_Competencia',
  'Data_Pagamento_Recebimento',
  'Mes_Referencia',
  'Tipo',
  'Categoria',
  'Subcategoria',
  'Natureza',
  'Centro_Custo',
  'Descricao',
  'Conta',
  'Forma_Pagamento',
  'Valor',
  'Observacao',
] as const;

export type Coluna = (typeof COLUNAS)[number];

export type TipoLancamento = 'receita' | 'despesa' | 'transferencia';
export type Natureza = 'fixa' | 'variavel';

export const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Cartão', 'Transferência', 'Débito', 'Crédito', 'Dinheiro', 'Outros'] as const;

/** Lançamento já normalizado, pronto para gravar/analisar. */
export interface Transacao {
  dataCompetencia: string | null;
  dataPagamento: string | null;
  mes: string;
  tipo: TipoLancamento;
  categoria: string;
  subcategoria: string | null;
  natureza: Natureza | null;
  centroCusto: string | null;
  descricao: string;
  conta: string | null;
  formaPagamento: string | null;
  valor: number;
  observacao: string | null;
}

export interface LinhaValidada extends Transacao {
  linha: number;
  /** Impressão digital usada para detectar duplicidades. */
  chave: string;
}

export interface Problema {
  linha: number | null;
  campo: Coluna | null;
  mensagem: string;
}

export interface ResultadoValidacao {
  colunasFaltando: Coluna[];
  linhas: LinhaValidada[];
  erros: Problema[];
  avisos: Problema[];
  linhasComErro: number;
  linhasVazias: number;
  /** quantidade de lançamentos por mês de referência */
  meses: Record<string, number>;
}

export interface ContextoValidacao {
  /** Centros de custo cadastrados para o cliente (nomes). */
  centrosCadastrados?: string[];
  /** Categorias conhecidas no plano de contas do cliente. */
  categoriasCadastradas?: string[];
}

export type Celula = string | number | boolean | Date | null | undefined;

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const normalizarChave = (s: string) => semAcento(String(s)).trim().toLowerCase().replace(/[\s-]+/g, '_');

const texto = (v: Celula): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).replace(/\s+/g, ' ').trim();
};

const pad = (n: number) => String(n).padStart(2, '0');

function dataValida(a: number, m: number, d: number): string | null {
  if (a < 1990 || a > 2100 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${a}-${pad(m)}-${pad(d)}`;
}

/** Converte célula em data ISO (AAAA-MM-DD). undefined = vazio; null = inválida. */
export function lerData(v: Celula): string | null | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return dataValida(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  }
  if (typeof v === 'number') {
    // número serial do Excel (dias desde 1899-12-30)
    if (v < 20000 || v > 80000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return dataValida(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = texto(v);
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return dataValida(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) return dataValida(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

const MESES_NOME: Record<string, number> = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6,
  jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

/** Converte célula em mês AAAA-MM. undefined = vazio; null = inválido. */
export function lerMes(v: Celula): string | null | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date || typeof v === 'number') {
    const d = lerData(v);
    return d ? d.slice(0, 7) : d;
  }
  const s = semAcento(texto(v)).toLowerCase();
  if (ehMes(s)) return s;
  let m = s.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const mes = Number(m[1]);
    return mes >= 1 && mes <= 12 ? `${m[2]}-${pad(mes)}` : null;
  }
  m = s.match(/^([a-z]+)[/. -]+(\d{2}|\d{4})$/);
  if (m && MESES_NOME[m[1]]) {
    const ano = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    return `${ano}-${pad(MESES_NOME[m[1]])}`;
  }
  const d = lerData(v);
  return d ? d.slice(0, 7) : null;
}

/** Converte célula em número. Aceita "R$ 1.234,56", "1234.56", "(1.234,56)". */
export function lerValor(v: Celula): number | null | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.replace(/R\$|\s/g, '');
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negativo = !negativo;
    s = s.slice(1);
  }
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) || /^\d+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, '');
  } else if (!/^\d+(\.\d+)?$/.test(s)) {
    return null;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

export function lerTipo(v: Celula): TipoLancamento | null | undefined {
  const s = normalizarChave(texto(v));
  if (!s) return undefined;
  if (s === 'receita' || s === 'receitas') return 'receita';
  if (s === 'despesa' || s === 'despesas') return 'despesa';
  if (s === 'transferencia_interna' || s === 'transferencia') return 'transferencia';
  return null;
}

export function lerNatureza(v: Celula): Natureza | null | undefined {
  const s = normalizarChave(texto(v));
  if (!s) return undefined;
  if (s === 'fixa' || s === 'fixo') return 'fixa';
  if (s === 'variavel') return 'variavel';
  return null;
}

export function lerFormaPagamento(v: Celula): string | null | undefined {
  const s = normalizarChave(texto(v));
  if (!s) return undefined;
  const achada = FORMAS_PAGAMENTO.find((f) => normalizarChave(f) === s);
  if (achada) return achada;
  if (s === 'cartao_de_credito') return 'Crédito';
  if (s === 'cartao_de_debito') return 'Débito';
  if (s === 'ted' || s === 'doc') return 'Transferência';
  return null;
}

/** Localiza as colunas obrigatórias no cabeçalho (sem diferenciar acento/maiúscula). */
export function mapearCabecalho(cabecalho: Celula[]): { indices: Partial<Record<Coluna, number>>; faltando: Coluna[] } {
  const indices: Partial<Record<Coluna, number>> = {};
  const normalizados = cabecalho.map((c) => normalizarChave(texto(c)));
  for (const col of COLUNAS) {
    const i = normalizados.indexOf(normalizarChave(col));
    if (i >= 0) indices[col] = i;
  }
  return { indices, faltando: COLUNAS.filter((c) => indices[c] === undefined) };
}

export function chaveLancamento(t: Transacao): string {
  return [
    t.mes,
    t.tipo,
    t.dataCompetencia ?? '',
    t.dataPagamento ?? '',
    normalizarChave(t.categoria),
    normalizarChave(t.subcategoria ?? ''),
    normalizarChave(t.descricao),
    normalizarChave(t.centroCusto ?? ''),
    normalizarChave(t.conta ?? ''),
    t.valor.toFixed(2),
  ].join('|');
}

/**
 * Valida as linhas da aba Base_Financeira.
 * @param linhas primeira linha = cabeçalho; demais = dados (numeração Excel = índice + 1)
 */
export function validarPlanilha(linhas: Celula[][], ctx: ContextoValidacao = {}): ResultadoValidacao {
  const resultado: ResultadoValidacao = {
    colunasFaltando: [],
    linhas: [],
    erros: [],
    avisos: [],
    linhasComErro: 0,
    linhasVazias: 0,
    meses: {},
  };
  if (linhas.length === 0) {
    resultado.colunasFaltando = [...COLUNAS];
    resultado.erros.push({ linha: null, campo: null, mensagem: 'A aba Base_Financeira está vazia.' });
    return resultado;
  }

  const { indices, faltando } = mapearCabecalho(linhas[0]);
  if (faltando.length) {
    resultado.colunasFaltando = faltando;
    resultado.erros.push({
      linha: 1,
      campo: null,
      mensagem: `Coluna(s) obrigatória(s) ausente(s): ${faltando.join(', ')}.`,
    });
    return resultado;
  }

  const centros = new Set((ctx.centrosCadastrados ?? []).map(normalizarChave));
  const categorias = new Set((ctx.categoriasCadastradas ?? []).map(normalizarChave));
  const vistos = new Map<string, number>();
  const centrosNovos = new Map<string, number>();
  const categoriasNovas = new Map<string, number>();

  for (let r = 1; r < linhas.length; r++) {
    const linha = r + 1;
    const cel = (c: Coluna) => linhas[r][indices[c]!];
    if (COLUNAS.every((c) => texto(cel(c)) === '')) {
      resultado.linhasVazias++;
      continue;
    }

    const erros: Problema[] = [];
    const erro = (campo: Coluna, mensagem: string) => erros.push({ linha, campo, mensagem });
    const aviso = (campo: Coluna | null, mensagem: string) => resultado.avisos.push({ linha, campo, mensagem });

    const tipo = lerTipo(cel('Tipo'));
    if (tipo === undefined) erro('Tipo', 'Tipo não informado (use Receita, Despesa ou Transferência Interna).');
    else if (tipo === null) erro('Tipo', `Tipo "${texto(cel('Tipo'))}" inválido (use Receita, Despesa ou Transferência Interna).`);

    const dataCompetencia = lerData(cel('Data_Competencia'));
    if (dataCompetencia === null) erro('Data_Competencia', `Data "${texto(cel('Data_Competencia'))}" inválida (use dd/mm/aaaa).`);
    const dataPagamento = lerData(cel('Data_Pagamento_Recebimento'));
    if (dataPagamento === null) erro('Data_Pagamento_Recebimento', `Data "${texto(cel('Data_Pagamento_Recebimento'))}" inválida (use dd/mm/aaaa).`);

    let mes = lerMes(cel('Mes_Referencia'));
    if (mes === null) {
      erro('Mes_Referencia', `Mês de referência "${texto(cel('Mes_Referencia'))}" inválido (use mm/aaaa).`);
    } else if (mes === undefined) {
      const base = dataCompetencia || dataPagamento;
      if (base) {
        mes = base.slice(0, 7);
        aviso('Mes_Referencia', `Mês de referência vazio; usado ${mes.slice(5)}/${mes.slice(0, 4)} a partir das datas da linha.`);
      } else {
        erro('Mes_Referencia', 'Mês de referência não informado e não há data para deduzi-lo.');
      }
    }

    const valor = lerValor(cel('Valor'));
    if (valor === undefined) erro('Valor', 'Valor não informado.');
    else if (valor === null) erro('Valor', `Valor "${texto(cel('Valor'))}" não é um número válido.`);
    else if (valor <= 0) erro('Valor', 'Informe o valor positivo; a coluna Tipo define se é receita ou despesa.');

    const categoria = texto(cel('Categoria'));
    if (!categoria && tipo !== 'transferencia') erro('Categoria', 'Categoria não informada.');

    const naturezaBruta = cel('Natureza');
    const natureza = lerNatureza(naturezaBruta);
    if (tipo === 'despesa') {
      if (natureza === null) erro('Natureza', `Natureza "${texto(naturezaBruta)}" inválida (use Fixa ou Variável).`);
      else if (natureza === undefined) aviso('Natureza', 'Despesa sem natureza (Fixa/Variável): não entra no cálculo do ponto de equilíbrio.');
    }

    let formaPagamento = lerFormaPagamento(cel('Forma_Pagamento'));
    if (formaPagamento === null) {
      aviso('Forma_Pagamento', `Forma de pagamento "${texto(cel('Forma_Pagamento'))}" não reconhecida; será registrada como Outros.`);
      formaPagamento = 'Outros';
    }

    const descricao = texto(cel('Descricao'));
    if (!descricao) aviso('Descricao', 'Lançamento sem descrição.');

    const centroCusto = texto(cel('Centro_Custo')) || null;
    const conta = texto(cel('Conta')) || null;
    if (tipo === 'transferencia' && !conta) aviso('Conta', 'Transferência interna sem conta informada.');

    if (erros.length) {
      resultado.erros.push(...erros);
      resultado.linhasComErro++;
      continue;
    }

    const t: Transacao = {
      dataCompetencia: dataCompetencia ?? null,
      dataPagamento: dataPagamento ?? null,
      mes: mes!,
      tipo: tipo!,
      categoria: categoria || 'Transferência interna',
      subcategoria: texto(cel('Subcategoria')) || null,
      natureza: tipo === 'despesa' ? natureza ?? null : null,
      centroCusto: tipo === 'transferencia' ? null : centroCusto,
      descricao,
      conta,
      formaPagamento: formaPagamento ?? null,
      valor: Math.round(valor! * 100) / 100,
      observacao: texto(cel('Observacao')) || null,
    };
    const chave = chaveLancamento(t);
    const anterior = vistos.get(chave);
    if (anterior) {
      aviso(null, `Possível duplicidade: lançamento idêntico ao da linha ${anterior}.`);
    } else {
      vistos.set(chave, linha);
    }
    if (t.centroCusto && ctx.centrosCadastrados && !centros.has(normalizarChave(t.centroCusto))) {
      centrosNovos.set(t.centroCusto, (centrosNovos.get(t.centroCusto) ?? 0) + 1);
    }
    if (t.tipo !== 'transferencia' && ctx.categoriasCadastradas && !categorias.has(normalizarChave(t.categoria))) {
      categoriasNovas.set(t.categoria, (categoriasNovas.get(t.categoria) ?? 0) + 1);
    }
    resultado.linhas.push({ ...t, linha, chave });
    resultado.meses[t.mes] = (resultado.meses[t.mes] ?? 0) + 1;
  }

  for (const [nome, qtd] of centrosNovos) {
    resultado.avisos.push({ linha: null, campo: 'Centro_Custo', mensagem: `Centro de custo "${nome}" não está cadastrado (${qtd} lançamento(s)); será cadastrado na importação.` });
  }
  for (const [nome, qtd] of categoriasNovas) {
    resultado.avisos.push({ linha: null, campo: 'Categoria', mensagem: `Categoria "${nome}" não está no plano de contas (${qtd} lançamento(s)); será adicionada na importação.` });
  }
  if (resultado.linhasVazias) {
    resultado.avisos.push({ linha: null, campo: null, mensagem: `${resultado.linhasVazias} linha(s) vazia(s) ignorada(s).` });
  }
  if (!resultado.linhas.length && !resultado.erros.length) {
    resultado.erros.push({ linha: null, campo: null, mensagem: 'A planilha não possui lançamentos.' });
  }
  return resultado;
}

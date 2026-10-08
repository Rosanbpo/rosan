import { addDias, hojeISO, isoData } from '../lib/datas';
import type { ContaBancaria, DadosEmpresa, Empresa, FonteDados, Lancamento } from './tipos';

/**
 * Fonte de dados fictícia: gera 24 meses de lançamentos por empresa de forma
 * determinística (mesma empresa = mesmos números), para desenvolver o
 * dashboard sem depender de uma fonte real.
 */

interface PerfilEmpresa {
  empresa: Empresa;
  semente: number;
  /** multiplicador de porte */
  escala: number;
  /** crescimento mensal da receita, ex.: 0.01 = 1% ao mês */
  crescimento: number;
  contas: string[];
}

const PERFIS: PerfilEmpresa[] = [
  {
    empresa: { id: 'minha_empresa', nome: 'Minha empresa' },
    semente: 11,
    escala: 1,
    crescimento: 0.012,
    contas: ['Itaú', 'Nubank PJ'],
  },
  {
    empresa: { id: 'd5f58292-6227-4a86-8bcc-0dc79e0d2583', nome: 'Conexão' },
    semente: 23,
    escala: 2.4,
    crescimento: 0.006,
    contas: ['Bradesco', 'Inter', 'Caixa'],
  },
  {
    empresa: { id: 'b013b12a-eb52-41c0-a6a6-6f064f779261', nome: 'CONEXAO PARTNER COMERCIAL LTDA' },
    semente: 37,
    escala: 4.1,
    crescimento: -0.004,
    contas: ['Banco do Brasil', 'Santander', 'Sicoob'],
  },
];

interface ModeloLancamento {
  categoria: string;
  contatos: string[];
  /** valor médio mensal (antes da escala) */
  base: number;
  /** variação relativa, ex.: 0.2 = ±20% */
  variacao: number;
  /** quantos lançamentos o valor mensal se divide */
  partes: number;
  /** recebe o fator de crescimento */
  cresce?: boolean;
}

const RECEITAS: ModeloLancamento[] = [
  { categoria: 'Prestação de serviços', contatos: ['Cliente Alfa', 'Cliente Beta', 'Grupo Delta', 'Omega Ltda'], base: 38000, variacao: 0.18, partes: 4, cresce: true },
  { categoria: 'Venda de produtos', contatos: ['Varejo Sul', 'Distribuidora Norte', 'Loja Centro'], base: 21000, variacao: 0.3, partes: 3, cresce: true },
  { categoria: 'Mensalidades', contatos: ['Assinantes'], base: 9500, variacao: 0.05, partes: 1, cresce: true },
];

const DESPESAS: ModeloLancamento[] = [
  { categoria: 'Folha de pagamento', contatos: ['Folha'], base: 26000, variacao: 0.03, partes: 1 },
  { categoria: 'Impostos', contatos: ['Receita Federal', 'Prefeitura'], base: 8200, variacao: 0.2, partes: 2, cresce: true },
  { categoria: 'Fornecedores', contatos: ['Fornecedor A', 'Fornecedor B', 'Fornecedor C'], base: 12500, variacao: 0.35, partes: 3, cresce: true },
  { categoria: 'Aluguel', contatos: ['Imobiliária Central'], base: 6800, variacao: 0, partes: 1 },
  { categoria: 'Marketing', contatos: ['Agência Criativa', 'Google Ads'], base: 4200, variacao: 0.5, partes: 2 },
  { categoria: 'Software e TI', contatos: ['Microsoft', 'AWS', 'Omie'], base: 2600, variacao: 0.1, partes: 3 },
  { categoria: 'Serviços contábeis', contatos: ['Escritório Contábil'], base: 1900, variacao: 0, partes: 1 },
  { categoria: 'Energia e telefonia', contatos: ['Enel', 'Vivo'], base: 1400, variacao: 0.15, partes: 2 },
  { categoria: 'Tarifas bancárias', contatos: ['Bancos'], base: 380, variacao: 0.25, partes: 1 },
];

/** Gerador pseudoaleatório determinístico (mulberry32). */
function criarAleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const arredondar = (v: number) => Math.round(v * 100) / 100;

function gerar(perfil: PerfilEmpresa): DadosEmpresa {
  const rnd = criarAleatorio(perfil.semente);
  const hoje = hojeISO();
  const [anoHoje, mesHoje] = hoje.split('-').map(Number);
  const lancamentos: Lancamento[] = [];
  let seq = 0;

  // 23 meses para trás até 2 meses à frente
  for (let desloc = -23; desloc <= 2; desloc++) {
    const ref = new Date(anoHoje, mesHoje - 1 + desloc, 1);
    const indiceMes = desloc + 23;
    const sazonal = 1 + 0.08 * Math.sin(((ref.getMonth() + 1) / 12) * 2 * Math.PI);

    const emitir = (tipo: 'pagar' | 'receber', modelo: ModeloLancamento) => {
      const fatorCresc = modelo.cresce ? Math.pow(1 + perfil.crescimento, indiceMes) : 1;
      const totalMes = modelo.base * perfil.escala * fatorCresc * (tipo === 'receber' ? sazonal : 1);
      for (let p = 0; p < modelo.partes; p++) {
        const variacao = 1 + (rnd() * 2 - 1) * modelo.variacao;
        const valor = arredondar((totalMes / modelo.partes) * variacao);
        const dia = 1 + Math.floor(rnd() * 28);
        const vencimento = isoData(new Date(ref.getFullYear(), ref.getMonth(), dia));
        const contato = modelo.contatos[p % modelo.contatos.length];
        const lanc: Lancamento = {
          id: `${perfil.empresa.id}-${++seq}`,
          tipo,
          descricao: `${modelo.categoria} — ${contato}`,
          contato,
          categoria: modelo.categoria,
          valor,
          vencimento,
          status: 'pendente',
        };
        // Vencidos: a grande maioria foi quitada; alguns recentes ficam em atraso.
        const recente = vencimento >= addDias(hoje, -90);
        const quitado = vencimento < hoje && (!recente || rnd() > (tipo === 'receber' ? 0.12 : 0.06));
        if (quitado) {
          const atraso = Math.floor(rnd() * 6) - 1;
          let pagamento = addDias(vencimento, atraso);
          if (pagamento > hoje) pagamento = hoje;
          lanc.pagamento = pagamento;
          lanc.status = tipo === 'receber' ? 'recebido' : 'pago';
        }
        lancamentos.push(lanc);
      }
    };

    RECEITAS.forEach((m) => emitir('receber', m));
    DESPESAS.forEach((m) => emitir('pagar', m));
  }

  // Saldo atual coerente com o histórico: saldo inicial + realizado.
  const realizado = lancamentos.reduce(
    (s, l) => (l.pagamento ? s + (l.tipo === 'receber' ? l.valor : -l.valor) : s),
    0,
  );
  const saldoInicial = 45000 * perfil.escala;
  const saldoTotal = Math.max(saldoInicial + realizado, 8000 * perfil.escala);
  const pesos = perfil.contas.map((_, i) => 1 / (i + 1));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const contas: ContaBancaria[] = perfil.contas.map((nome, i) => ({
    nome,
    saldo: arredondar((saldoTotal * pesos[i]) / somaPesos),
  }));

  return { contas, lancamentos, exemplo: true };
}

const cache = new Map<string, DadosEmpresa>();

export const fonteExemplo: FonteDados = {
  async listarEmpresas() {
    return PERFIS.map((p) => p.empresa);
  },
  async carregar(empresaId) {
    const perfil = PERFIS.find((p) => p.empresa.id === empresaId);
    if (!perfil) throw new Error(`Empresa não encontrada: ${empresaId}`);
    if (!cache.has(empresaId)) cache.set(empresaId, gerar(perfil));
    return cache.get(empresaId)!;
  },
};

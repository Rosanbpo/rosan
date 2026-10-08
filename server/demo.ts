/**
 * Dados demonstrativos. Cria dois clientes marcados como "demonstrativo"
 * (nunca recebem importações reais) e importa planilhas fictícias pelo mesmo
 * fluxo de importação usado em produção.
 *
 * Uso: npm run demo
 */
import { resolve } from 'node:path';
import { deslocarMes, mesAtual } from '../shared/periodos';
import { hashSenha } from './auth';
import { abrirBanco, type Db, transacao } from './db';
import { confirmarImportacao, prepararImportacao } from './importacao';
import { garantirAdmin } from './inicial';
import { gerarPlanilha, type LinhaPlanilha } from './modelo';
import { copiarPlanoPadrao } from './repositorio';

function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Item {
  categoria: string;
  subcategoria: string;
  natureza?: 'Fixa' | 'Variável';
  centro?: string;
  descricao: string;
  /** valor base mensal */
  base: number;
  variacao?: number;
  forma?: string;
  /** multiplicador por índice de mês (0 = mais antigo) */
  tendencia?: (i: number, total: number) => number;
}

interface Perfil {
  semente: number;
  receitas: Item[];
  despesas: Item[];
}

const data = (mes: string, dia: number) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, Math.min(dia, 28)));
};

function gerarLinhas(p: Perfil, meses: string[]): LinhaPlanilha[] {
  const rnd = aleatorio(p.semente);
  const linhas: LinhaPlanilha[] = [];
  meses.forEach((mes, i) => {
    const sazonal = 1 + 0.06 * Math.sin(((Number(mes.slice(5)) + 1) / 12) * 2 * Math.PI);
    const emitir = (it: Item, tipo: 'Receita' | 'Despesa') => {
      const fator = (it.tendencia?.(i, meses.length) ?? 1) * (tipo === 'Receita' ? sazonal : 1);
      const valor = Math.round(it.base * fator * (1 + (rnd() * 2 - 1) * (it.variacao ?? 0.08)) * 100) / 100;
      if (valor <= 0) return;
      const dia = 2 + Math.floor(rnd() * 25);
      linhas.push({
        Data_Competencia: data(mes, dia),
        Data_Pagamento_Recebimento: data(mes, dia + Math.floor(rnd() * 3)),
        Mes_Referencia: `${mes.slice(5)}/${mes.slice(0, 4)}`,
        Tipo: tipo,
        Categoria: it.categoria,
        Subcategoria: it.subcategoria,
        Natureza: tipo === 'Despesa' ? it.natureza ?? null : null,
        Centro_Custo: it.centro ?? null,
        Descricao: it.descricao,
        Conta: rnd() > 0.3 ? 'Banco principal' : 'Banco secundário',
        Forma_Pagamento: it.forma ?? (tipo === 'Receita' ? 'Pix' : 'Boleto'),
        Valor: valor,
        Observacao: null,
      });
    };
    p.receitas.forEach((r) => emitir(r, 'Receita'));
    p.despesas.forEach((d) => emitir(d, 'Despesa'));
    // transferência interna: nunca entra no resultado
    linhas.push({
      Data_Pagamento_Recebimento: data(mes, 20),
      Mes_Referencia: `${mes.slice(5)}/${mes.slice(0, 4)}`,
      Tipo: 'Transferência Interna',
      Descricao: 'Aplicação automática',
      Conta: 'Banco principal',
      Forma_Pagamento: 'Transferência',
      Valor: 15000,
    });
  });
  return linhas;
}

/** Clínica com centros de custo, saudável, mas com marketing acelerando. */
const AURORA: Perfil = {
  semente: 7,
  receitas: [
    { categoria: 'Receita de serviços', subcategoria: 'Serviços prestados', descricao: 'Atendimentos particulares', base: 98000, tendencia: (i) => 1 + i * 0.012 },
    { categoria: 'Receita de serviços', subcategoria: 'Contratos recorrentes', descricao: 'Convênios empresariais', base: 41000, variacao: 0.04, tendencia: (i) => 1 + i * 0.006 },
  ],
  despesas: [
    { categoria: 'Pessoal', subcategoria: 'Salários', natureza: 'Fixa', centro: 'Unidade Recife', descricao: 'Folha Recife', base: 24000, variacao: 0.02 },
    { categoria: 'Pessoal', subcategoria: 'Salários', natureza: 'Fixa', centro: 'Unidade Olinda', descricao: 'Folha Olinda', base: 15000, variacao: 0.02 },
    { categoria: 'Pessoal', subcategoria: 'Encargos', natureza: 'Fixa', centro: 'Administrativo', descricao: 'Encargos sobre folha', base: 10500, variacao: 0.03 },
    { categoria: 'Pessoal', subcategoria: 'Pró-labore', natureza: 'Fixa', centro: 'Administrativo', descricao: 'Pró-labore sócios', base: 9000, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Aluguel', natureza: 'Fixa', centro: 'Unidade Recife', descricao: 'Aluguel Recife', base: 9800, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Aluguel', natureza: 'Fixa', centro: 'Unidade Olinda', descricao: 'Aluguel Olinda', base: 6200, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Energia', natureza: 'Fixa', centro: 'Unidade Recife', descricao: 'Neoenergia', base: 2400, variacao: 0.12 },
    { categoria: 'Administrativo', subcategoria: 'Sistemas', natureza: 'Fixa', centro: 'Administrativo', descricao: 'Software de gestão clínica', base: 1850, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Internet', natureza: 'Fixa', descricao: 'Link dedicado', base: 690, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Contabilidade', natureza: 'Fixa', centro: 'Administrativo', descricao: 'Honorários contábeis', base: 2200, variacao: 0 },
    { categoria: 'Operacional', subcategoria: 'Materiais', natureza: 'Variável', centro: 'Unidade Recife', descricao: 'Materiais clínicos', base: 9000, tendencia: (i) => 1 + i * 0.012 },
    { categoria: 'Operacional', subcategoria: 'Materiais', natureza: 'Variável', centro: 'Unidade Olinda', descricao: 'Materiais clínicos', base: 5000, tendencia: (i) => 1 + i * 0.01 },
    { categoria: 'Operacional', subcategoria: 'Serviços', natureza: 'Variável', descricao: 'Laboratório terceirizado', base: 5200 },
    {
      categoria: 'Marketing', subcategoria: 'Tráfego pago', natureza: 'Variável', centro: 'Administrativo', descricao: 'Campanhas online', base: 3800, variacao: 0.1,
      tendencia: (i, n) => (i >= n - 3 ? 2.2 + (i - (n - 3)) * 0.35 : 1),
    },
    { categoria: 'Marketing', subcategoria: 'Agência', natureza: 'Fixa', centro: 'Administrativo', descricao: 'Agência de comunicação', base: 3500, variacao: 0 },
    { categoria: 'Impostos', subcategoria: 'Simples Nacional', natureza: 'Variável', descricao: 'DAS', base: 9500, tendencia: (i) => 1 + i * 0.01 },
    { categoria: 'Financeiro', subcategoria: 'Taxas de cartão', natureza: 'Variável', descricao: 'Maquininha', base: 2300, forma: 'Débito' },
    { categoria: 'Financeiro', subcategoria: 'Tarifas bancárias', natureza: 'Fixa', descricao: 'Pacote de serviços', base: 320, forma: 'Débito' },
  ],
};

/** Comércio sem centro de custo, com faturamento caindo e despesas subindo. */
const HORIZONTE: Perfil = {
  semente: 19,
  receitas: [
    {
      categoria: 'Receita de vendas', subcategoria: 'Mercadorias', descricao: 'Vendas loja física', base: 94000,
      tendencia: (i, n) => (i >= n - 4 ? 1 - (i - (n - 5)) * 0.06 : 1 + i * 0.005),
    },
    { categoria: 'Receita de vendas', subcategoria: 'Produtos', descricao: 'Vendas e-commerce', base: 26000, tendencia: (i) => 1 + i * 0.01 },
  ],
  despesas: [
    { categoria: 'Operacional', subcategoria: 'Fornecedores', natureza: 'Variável', descricao: 'Compra de mercadorias', base: 44000, tendencia: (i) => 1 + i * 0.006 },
    { categoria: 'Operacional', subcategoria: 'Fretes', natureza: 'Variável', descricao: 'Transportadora', base: 4100 },
    { categoria: 'Pessoal', subcategoria: 'Salários', natureza: 'Fixa', descricao: 'Folha de pagamento', base: 18600, variacao: 0.02, tendencia: (i, n) => (i >= n - 4 ? 1.12 : 1) },
    { categoria: 'Pessoal', subcategoria: 'Encargos', natureza: 'Fixa', descricao: 'Encargos sobre folha', base: 6100, variacao: 0.02, tendencia: (i, n) => (i >= n - 4 ? 1.12 : 1) },
    { categoria: 'Pessoal', subcategoria: 'Pró-labore', natureza: 'Fixa', descricao: 'Pró-labore', base: 8000, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Aluguel', natureza: 'Fixa', descricao: 'Aluguel da loja', base: 7400, variacao: 0 },
    { categoria: 'Administrativo', subcategoria: 'Energia', natureza: 'Fixa', descricao: 'Celpe', base: 1900, variacao: 0.15 },
    { categoria: 'Administrativo', subcategoria: 'Sistemas', natureza: 'Fixa', descricao: 'ERP e PDV', base: 980, variacao: 0 },
    { categoria: 'Comercial', subcategoria: 'Comissões', natureza: 'Variável', descricao: 'Comissão vendedores', base: 3900 },
    { categoria: 'Marketing', subcategoria: 'Publicidade', natureza: 'Variável', descricao: 'Mídia local', base: 2100, variacao: 0.2 },
    { categoria: 'Impostos', subcategoria: 'Simples Nacional', natureza: 'Variável', descricao: 'DAS', base: 8800 },
    { categoria: 'Financeiro', subcategoria: 'Taxas de cartão', natureza: 'Variável', descricao: 'Adquirente', base: 2600, forma: 'Débito' },
    { categoria: 'Financeiro', subcategoria: 'Juros', natureza: 'Variável', descricao: 'Juros de capital de giro', base: 900, tendencia: (i, n) => (i >= n - 3 ? 2.4 : 1) },
    { categoria: 'Financeiro', subcategoria: 'Tarifas bancárias', descricao: 'Tarifas', base: 280 },
  ],
};

const CLIENTES_DEMO = [
  {
    slug: 'clinica-aurora-demonstrativo',
    nome: 'Clínica Aurora (demonstrativo)',
    email: 'cliente.aurora@demo.rosan.com.br',
    usuario: 'Responsável Aurora',
    perfil: AURORA,
  },
  {
    slug: 'comercio-horizonte-demonstrativo',
    nome: 'Comércio Horizonte (demonstrativo)',
    email: 'cliente.horizonte@demo.rosan.com.br',
    usuario: 'Responsável Horizonte',
    perfil: HORIZONTE,
  },
];

export const SENHA_DEMO = 'Demo2026rosan';

/** Recria os clientes demonstrativos (apaga apenas clientes marcados como demonstrativos). */
export async function semearDemonstracao(db: Db, mesFinal = deslocarMes(mesAtual(), -1)) {
  const meses = Array.from({ length: 15 }, (_, k) => deslocarMes(mesFinal, k - 14));
  transacao(db, () => {
    db.prepare(`DELETE FROM users WHERE id IN (SELECT cu.user_id FROM client_users cu JOIN clients c ON c.id = cu.client_id WHERE c.demonstrativo = 1)`).run();
    db.prepare('DELETE FROM clients WHERE demonstrativo = 1').run();
  });
  const criados: { slug: string; email: string }[] = [];
  for (const c of CLIENTES_DEMO) {
    const id = crypto.randomUUID();
    transacao(db, () => {
      db.prepare(
        `INSERT INTO clients (id, slug, nome_empresa, responsavel, email, status, demonstrativo, periodo_inicial)
         VALUES (?, ?, ?, ?, ?, 'ativo', 1, ?)`,
      ).run(id, c.slug, c.nome, c.usuario, c.email, meses[0]);
      copiarPlanoPadrao(db, id);
      const uid = crypto.randomUUID();
      db.prepare(`INSERT INTO users (id, nome, email, senha_hash, role) VALUES (?, ?, ?, ?, 'cliente')`).run(uid, c.usuario, c.email, hashSenha(SENHA_DEMO));
      db.prepare('INSERT INTO client_users (user_id, client_id) VALUES (?, ?)').run(uid, id);
    });
    const buffer = await gerarPlanilha(gerarLinhas(c.perfil, meses));
    const previa = await prepararImportacao(db, id, `${c.slug}.xlsx`, buffer, null);
    if (!previa.importId) throw new Error(`Planilha demonstrativa inválida: ${JSON.stringify(previa.erros.slice(0, 3))}`);
    confirmarImportacao(db, previa.importId, id, undefined);
    criados.push({ slug: c.slug, email: c.email });
  }
  return criados;
}

export async function planilhaDemonstrativa(qual: 'aurora' | 'horizonte', mesFinal = deslocarMes(mesAtual(), -1)) {
  const meses = Array.from({ length: 15 }, (_, k) => deslocarMes(mesFinal, k - 14));
  return gerarPlanilha(gerarLinhas(qual === 'aurora' ? AURORA : HORIZONTE, meses));
}

if (process.argv[1] && resolve(process.argv[1]).replace(/\.ts$/, '') === resolve(import.meta.dirname, 'demo')) {
  const db = abrirBanco(process.env.ROSAN_DB ?? resolve('dados/rosan.db'));
  garantirAdmin(db);
  const criados = await semearDemonstracao(db);
  console.log('Dados demonstrativos criados:');
  for (const c of criados) console.log(`  /cliente/${c.slug}  ·  ${c.email} / ${SENHA_DEMO}`);
}

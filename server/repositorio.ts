/**
 * Acesso a dados financeiros. TODA função recebe o clientId já autorizado
 * pelo middleware (nunca um valor vindo do corpo/parâmetros sem verificação)
 * e o usa como filtro obrigatório na consulta.
 */
import { DESCRICAO_PREMISSAS, type LancamentoAnalise, PREMISSAS_PADRAO, type Premissas } from '../shared/analise';
import type { Db } from './db';

export function lancamentosDoCliente(db: Db, clientId: string): LancamentoAnalise[] {
  return db
    .prepare(
      `SELECT mes_referencia AS mes, tipo, categoria, subcategoria, natureza, centro_custo AS centroCusto, descricao, valor
       FROM financial_transactions WHERE client_id = ?`,
    )
    .all(clientId) as unknown as LancamentoAnalise[];
}

export function mesesDoCliente(db: Db, clientId: string): string[] {
  return (
    db
      .prepare(
        `SELECT DISTINCT mes_referencia AS mes FROM financial_transactions
         WHERE client_id = ? AND tipo <> 'transferencia' ORDER BY mes`,
      )
      .all(clientId) as { mes: string }[]
  ).map((r) => r.mes);
}

export function clienteUsaCentroCusto(db: Db, clientId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM financial_transactions
       WHERE client_id = ? AND tipo = 'despesa' AND centro_custo IS NOT NULL AND centro_custo <> '' LIMIT 1`,
    )
    .get(clientId);
}

export function premissasDoCliente(db: Db, clientId: string): Premissas {
  const linhas = db.prepare('SELECT parametro, valor FROM assumptions WHERE client_id = ?').all(clientId) as {
    parametro: string;
    valor: number;
  }[];
  const p: Premissas = { ...PREMISSAS_PADRAO };
  for (const l of linhas) {
    if (l.parametro in DESCRICAO_PREMISSAS) p[l.parametro as keyof Premissas] = l.valor;
  }
  return p;
}

export function historicoDoCliente(db: Db, clientId: string) {
  return db
    .prepare(
      `SELECT ip.mes, ip.quantidade, ip.status, i.id AS importId, i.nome_arquivo AS arquivo, i.data_importacao AS dataImportacao, i.modo
       FROM import_periodos ip JOIN imports i ON i.id = ip.import_id AND i.client_id = ip.client_id
       WHERE ip.client_id = ?
       ORDER BY ip.mes DESC, i.data_importacao DESC`,
    )
    .all(clientId);
}

export function centrosDoCliente(db: Db, clientId: string) {
  return db
    .prepare('SELECT id, nome, status FROM cost_centers WHERE client_id = ? ORDER BY nome COLLATE NOCASE')
    .all(clientId) as { id: string; nome: string; status: string }[];
}

export function planoDoCliente(db: Db, clientId: string) {
  return db
    .prepare(
      `SELECT id, tipo, categoria, subcategoria FROM categories WHERE client_id = ?
       ORDER BY tipo DESC, categoria COLLATE NOCASE, subcategoria COLLATE NOCASE`,
    )
    .all(clientId) as { id: string; tipo: string; categoria: string; subcategoria: string }[];
}

/** Copia o plano de contas padrão Rosan para um novo cliente. */
export function copiarPlanoPadrao(db: Db, clientId: string) {
  db.prepare(
    `INSERT OR IGNORE INTO categories (id, client_id, tipo, categoria, subcategoria)
     SELECT lower(hex(randomblob(16))), ?, tipo, categoria, subcategoria FROM categories WHERE client_id IS NULL`,
  ).run(clientId);
}

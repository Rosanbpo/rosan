import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

const ESQUEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  responsavel TEXT,
  email TEXT,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  demonstrativo INTEGER NOT NULL DEFAULT 0,
  logo TEXT,
  periodo_inicial TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cliente')),
  ativo INTEGER NOT NULL DEFAULT 1,
  trocar_senha INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vínculo usuário → cliente. Um usuário cliente pertence a uma única empresa.
CREATE TABLE IF NOT EXISTS client_users (
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, client_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'concluida', 'substituida', 'cancelada')),
  modo TEXT CHECK (modo IN ('nova', 'substituir', 'adicionar')),
  periodos TEXT NOT NULL DEFAULT '[]',
  quantidade_lancamentos INTEGER NOT NULL DEFAULT 0,
  ignorados_duplicados INTEGER NOT NULL DEFAULT 0,
  validacao TEXT,
  usuario_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  data_importacao TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_imports_client ON imports(client_id, status);

CREATE TABLE IF NOT EXISTS import_periodos (
  import_id TEXT NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('atualizado', 'substituido')),
  PRIMARY KEY (import_id, mes)
);
CREATE INDEX IF NOT EXISTS idx_import_periodos_client ON import_periodos(client_id, mes);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  import_id TEXT NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  linha INTEGER,
  data_competencia TEXT,
  data_pagamento TEXT,
  mes_referencia TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  natureza TEXT CHECK (natureza IN ('fixa', 'variavel')),
  centro_custo TEXT,
  descricao TEXT NOT NULL DEFAULT '',
  conta TEXT,
  forma_pagamento TEXT,
  valor REAL NOT NULL CHECK (valor > 0),
  observacao TEXT,
  chave TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transacoes_client_mes ON financial_transactions(client_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_transacoes_client_chave ON financial_transactions(client_id, chave);

CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  UNIQUE (client_id, nome)
);

-- Plano de contas. client_id NULL = estrutura padrão Rosan.
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria TEXT NOT NULL,
  subcategoria TEXT NOT NULL DEFAULT '',
  UNIQUE (client_id, tipo, categoria, subcategoria)
);

CREATE TABLE IF NOT EXISTS assumptions (
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  parametro TEXT NOT NULL,
  valor REAL NOT NULL,
  PRIMARY KEY (client_id, parametro)
);
`;

/** Plano de contas padrão Rosan. */
export const PLANO_PADRAO: { tipo: 'receita' | 'despesa'; categoria: string; subcategorias: string[] }[] = [
  { tipo: 'receita', categoria: 'Receita de vendas', subcategorias: ['Produtos', 'Mercadorias'] },
  { tipo: 'receita', categoria: 'Receita de serviços', subcategorias: ['Serviços prestados', 'Contratos recorrentes'] },
  { tipo: 'receita', categoria: 'Outras receitas', subcategorias: ['Rendimentos financeiros', 'Receitas diversas'] },
  { tipo: 'despesa', categoria: 'Administrativo', subcategorias: ['Aluguel', 'Energia', 'Água', 'Internet', 'Telefonia', 'Sistemas', 'Material de escritório', 'Contabilidade'] },
  { tipo: 'despesa', categoria: 'Pessoal', subcategorias: ['Pró-labore', 'Salários', 'Encargos', 'Benefícios', 'Rescisões'] },
  { tipo: 'despesa', categoria: 'Marketing', subcategorias: ['Tráfego pago', 'Agência', 'Publicidade', 'Eventos'] },
  { tipo: 'despesa', categoria: 'Operacional', subcategorias: ['Fornecedores', 'Materiais', 'Serviços', 'Fretes', 'Manutenção'] },
  { tipo: 'despesa', categoria: 'Comercial', subcategorias: ['Comissões', 'Viagens', 'Brindes'] },
  { tipo: 'despesa', categoria: 'Impostos', subcategorias: ['Simples Nacional', 'ISS', 'ICMS', 'PIS/COFINS', 'IRPJ/CSLL'] },
  { tipo: 'despesa', categoria: 'Financeiro', subcategorias: ['Tarifas bancárias', 'Juros', 'Multas', 'Taxas de cartão'] },
];

export function abrirBanco(caminho: string): Db {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(ESQUEMA);
  semearPlanoPadrao(db);
  return db;
}

function semearPlanoPadrao(db: Db) {
  const existe = db.prepare('SELECT 1 FROM categories WHERE client_id IS NULL LIMIT 1').get();
  if (existe) return;
  const ins = db.prepare('INSERT INTO categories (id, client_id, tipo, categoria, subcategoria) VALUES (?, NULL, ?, ?, ?)');
  transacao(db, () => {
    for (const g of PLANO_PADRAO) {
      for (const s of g.subcategorias) ins.run(crypto.randomUUID(), g.tipo, g.categoria, s);
    }
  });
}

/** Executa fn dentro de uma transação (com rollback em caso de erro). */
export function transacao<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

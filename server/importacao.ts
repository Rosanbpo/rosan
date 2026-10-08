import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import {
  ABA_PRINCIPAL,
  type Celula,
  type LinhaValidada,
  normalizarChave,
  type Problema,
  validarPlanilha,
} from '../shared/planilha';
import { type Db, transacao } from './db';
import { centrosDoCliente, planoDoCliente } from './repositorio';

export const LIMITE_LINHAS = 50000;

export class ErroImportacao extends Error {
  constructor(mensagem: string, public status = 400) {
    super(mensagem);
  }
}

function valorCelula(v: ExcelJS.CellValue): Celula {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'object') {
    if ('result' in v) return valorCelula(v.result as ExcelJS.CellValue);
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return String(v.text);
    if ('error' in v) return null;
  }
  return String(v);
}

/** Lê a aba Base_Financeira do arquivo Excel como matriz de células. */
export async function lerPlanilha(buffer: Buffer): Promise<Celula[][]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new ErroImportacao('Não foi possível ler o arquivo. Envie uma planilha Excel (.xlsx) no modelo Rosan.');
  }
  const aba = wb.worksheets.find((w) => normalizarChave(w.name) === normalizarChave(ABA_PRINCIPAL));
  if (!aba) {
    throw new ErroImportacao(`A planilha não possui a aba "${ABA_PRINCIPAL}". Use o modelo padrão Rosan.`);
  }
  if (aba.rowCount > LIMITE_LINHAS + 1) {
    throw new ErroImportacao(`A planilha possui mais de ${LIMITE_LINHAS} linhas. Divida a importação por período.`);
  }
  const linhas: Celula[][] = [];
  const largura = Math.min(aba.columnCount, 40);
  for (let r = 1; r <= aba.rowCount; r++) {
    const row = aba.getRow(r);
    const celulas: Celula[] = [];
    for (let c = 1; c <= largura; c++) celulas.push(valorCelula(row.getCell(c).value));
    linhas.push(celulas);
  }
  return linhas;
}

export interface Previa {
  importId: string | null;
  arquivo: string;
  valido: boolean;
  colunasFaltando: string[];
  totalLinhas: number;
  linhasValidas: number;
  linhasComErro: number;
  erros: Problema[];
  avisos: Problema[];
  totalErros: number;
  totalAvisos: number;
  meses: { mes: string; quantidade: number; existentes: number }[];
  resumo: { receitas: number; despesas: number; transferencias: number; valorReceitas: number; valorDespesas: number };
  amostra: LinhaValidada[];
  arquivoJaImportado: { data: string; importId: string } | null;
  periodosExistentes: string[];
  usaCentroCusto: boolean;
}

/** Valida o arquivo e, se estiver correto, guarda a importação como pendente de confirmação. */
export async function prepararImportacao(
  db: Db,
  clientId: string,
  nomeArquivo: string,
  buffer: Buffer,
  usuarioId: string | null,
): Promise<Previa> {
  const hash = createHash('sha256').update(buffer).digest('hex');
  const celulas = await lerPlanilha(buffer);
  const plano = planoDoCliente(db, clientId);
  const v = validarPlanilha(celulas, {
    centrosCadastrados: centrosDoCliente(db, clientId).map((c) => c.nome),
    categoriasCadastradas: [...new Set(plano.map((p) => p.categoria))],
  });

  const repetido = db
    .prepare(
      `SELECT id, data_importacao FROM imports WHERE client_id = ? AND arquivo_hash = ? AND status = 'concluida'
       ORDER BY data_importacao DESC LIMIT 1`,
    )
    .get(clientId, hash) as { id: string; data_importacao: string } | undefined;

  const contarMes = db.prepare('SELECT count(*) AS n FROM financial_transactions WHERE client_id = ? AND mes_referencia = ?');
  const meses = Object.entries(v.meses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, quantidade]) => ({ mes, quantidade, existentes: (contarMes.get(clientId, mes) as { n: number }).n }));

  const resumo = { receitas: 0, despesas: 0, transferencias: 0, valorReceitas: 0, valorDespesas: 0 };
  for (const l of v.linhas) {
    if (l.tipo === 'receita') {
      resumo.receitas++;
      resumo.valorReceitas += l.valor;
    } else if (l.tipo === 'despesa') {
      resumo.despesas++;
      resumo.valorDespesas += l.valor;
    } else resumo.transferencias++;
  }

  const valido = v.erros.length === 0 && v.linhas.length > 0 && !repetido;
  let importId: string | null = null;
  if (valido) {
    importId = crypto.randomUUID();
    db.prepare(`DELETE FROM imports WHERE status = 'pendente' AND created_at < datetime('now', '-1 day')`).run();
    db.prepare(
      `INSERT INTO imports (id, client_id, nome_arquivo, arquivo_hash, status, periodos, quantidade_lancamentos, validacao, usuario_id)
       VALUES (?, ?, ?, ?, 'pendente', ?, ?, ?, ?)`,
    ).run(importId, clientId, nomeArquivo, hash, JSON.stringify(meses.map((m) => m.mes)), v.linhas.length, JSON.stringify(v.linhas), usuarioId);
  }

  return {
    importId,
    arquivo: nomeArquivo,
    valido,
    colunasFaltando: v.colunasFaltando,
    totalLinhas: v.linhas.length + v.linhasComErro,
    linhasValidas: v.linhas.length,
    linhasComErro: v.linhasComErro,
    erros: v.erros.slice(0, 300),
    avisos: v.avisos.slice(0, 300),
    totalErros: v.erros.length,
    totalAvisos: v.avisos.length,
    meses,
    resumo,
    amostra: v.linhas.slice(0, 15),
    arquivoJaImportado: repetido ? { data: repetido.data_importacao, importId: repetido.id } : null,
    periodosExistentes: meses.filter((m) => m.existentes > 0).map((m) => m.mes),
    usaCentroCusto: v.linhas.some((l) => l.tipo === 'despesa' && !!l.centroCusto),
  };
}

export type ModoImportacao = 'substituir' | 'adicionar';

export interface ResultadoImportacao {
  importId: string;
  inseridos: number;
  ignoradosDuplicados: number;
  periodos: string[];
  substituidos: number;
}

/**
 * Grava a importação pendente. clientId deve ser o mesmo da importação
 * (o servidor confere), garantindo que uma prévia nunca vá para outro cliente.
 */
export function confirmarImportacao(db: Db, importId: string, clientId: string, modo: ModoImportacao | undefined): ResultadoImportacao {
  const imp = db
    .prepare(`SELECT id, client_id, status, periodos, validacao FROM imports WHERE id = ? AND client_id = ?`)
    .get(importId, clientId) as { id: string; client_id: string; status: string; periodos: string; validacao: string } | undefined;
  if (!imp) throw new ErroImportacao('Importação não encontrada.', 404);
  if (imp.status !== 'pendente') throw new ErroImportacao('Esta importação já foi processada ou cancelada.', 409);

  const linhas = JSON.parse(imp.validacao) as LinhaValidada[];
  const periodos = JSON.parse(imp.periodos) as string[];
  const contarMes = db.prepare('SELECT count(*) AS n FROM financial_transactions WHERE client_id = ? AND mes_referencia = ?');
  const existentes = periodos.filter((m) => (contarMes.get(clientId, m) as { n: number }).n > 0);
  if (existentes.length && modo !== 'substituir' && modo !== 'adicionar') {
    throw new ErroImportacao('Este período já possui dados. Escolha substituir a importação anterior ou adicionar novos dados.', 409);
  }
  const modoFinal = existentes.length ? modo! : 'nova';

  return transacao(db, () => {
    let substituidos = 0;
    if (modoFinal === 'substituir') {
      const marcar = db.prepare(`UPDATE import_periodos SET status = 'substituido' WHERE client_id = ? AND mes = ? AND status = 'atualizado'`);
      const apagar = db.prepare('DELETE FROM financial_transactions WHERE client_id = ? AND mes_referencia = ?');
      for (const mes of existentes) {
        marcar.run(clientId, mes);
        substituidos += Number(apagar.run(clientId, mes).changes);
      }
      // importações cujos períodos foram todos substituídos
      db.prepare(
        `UPDATE imports SET status = 'substituida'
         WHERE client_id = ? AND status = 'concluida'
           AND NOT EXISTS (SELECT 1 FROM import_periodos ip WHERE ip.import_id = imports.id AND ip.status = 'atualizado')`,
      ).run(clientId);
    }

    const jaExiste = db.prepare('SELECT 1 FROM financial_transactions WHERE client_id = ? AND chave = ? LIMIT 1');
    const inserir = db.prepare(
      `INSERT INTO financial_transactions
        (client_id, import_id, linha, data_competencia, data_pagamento, mes_referencia, tipo, categoria, subcategoria,
         natureza, centro_custo, descricao, conta, forma_pagamento, valor, observacao, chave)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let inseridos = 0;
    let ignorados = 0;
    const porMes = new Map<string, number>();
    for (const l of linhas) {
      if (modoFinal === 'adicionar' && jaExiste.get(clientId, l.chave)) {
        ignorados++;
        continue;
      }
      inserir.run(
        clientId, importId, l.linha, l.dataCompetencia, l.dataPagamento, l.mes, l.tipo, l.categoria, l.subcategoria,
        l.natureza, l.centroCusto, l.descricao, l.conta, l.formaPagamento, l.valor, l.observacao, l.chave,
      );
      inseridos++;
      porMes.set(l.mes, (porMes.get(l.mes) ?? 0) + 1);
    }

    const periodo = db.prepare(`INSERT INTO import_periodos (import_id, client_id, mes, quantidade, status) VALUES (?, ?, ?, ?, 'atualizado')`);
    for (const [mes, qtd] of porMes) periodo.run(importId, clientId, mes, qtd);

    // cadastra centros de custo e categorias novos
    const centro = db.prepare(`INSERT OR IGNORE INTO cost_centers (id, client_id, nome) VALUES (?, ?, ?)`);
    const centrosAtuais = new Set(centrosDoCliente(db, clientId).map((c) => normalizarChave(c.nome)));
    const categoria = db.prepare(`INSERT OR IGNORE INTO categories (id, client_id, tipo, categoria, subcategoria) VALUES (?, ?, ?, ?, ?)`);
    for (const l of linhas) {
      if (l.centroCusto && !centrosAtuais.has(normalizarChave(l.centroCusto))) {
        centro.run(crypto.randomUUID(), clientId, l.centroCusto);
        centrosAtuais.add(normalizarChave(l.centroCusto));
      }
      if (l.tipo !== 'transferencia') categoria.run(crypto.randomUUID(), clientId, l.tipo, l.categoria, l.subcategoria ?? '');
    }

    db.prepare(
      `UPDATE imports SET status = 'concluida', modo = ?, quantidade_lancamentos = ?, ignorados_duplicados = ?,
         periodos = ?, validacao = NULL, data_importacao = datetime('now') WHERE id = ?`,
    ).run(modoFinal, inseridos, ignorados, JSON.stringify([...porMes.keys()].sort()), importId);

    return { importId, inseridos, ignoradosDuplicados: ignorados, periodos: [...porMes.keys()].sort(), substituidos };
  });
}

export function cancelarImportacao(db: Db, importId: string, clientId: string) {
  const r = db
    .prepare(`UPDATE imports SET status = 'cancelada', validacao = NULL WHERE id = ? AND client_id = ? AND status = 'pendente'`)
    .run(importId, clientId);
  if (!r.changes) throw new ErroImportacao('Importação não encontrada ou já processada.', 404);
}

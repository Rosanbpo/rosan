import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { semearDemonstracao } from '../server/demo';
import { type Ambiente, linha, Navegador, planilha, subirAmbiente } from './util';

let amb: Ambiente;
let adm: Navegador;
let cliente: { id: string; slug: string };

beforeAll(async () => {
  amb = await subirAmbiente();
  adm = new Navegador(amb.url);
  await adm.login('admin@rosan.test', 'Admin12345');
  cliente = (await adm.post('/api/admin/clientes', { nome: 'Importadora Teste' })).dados;
});
afterAll(() => amb.fechar());

const contar = () =>
  (amb.db.prepare('SELECT count(*) AS n FROM financial_transactions WHERE client_id = ?').get(cliente.id) as { n: number }).n;

const base = () =>
  planilha([
    linha({ Tipo: 'Receita', Categoria: 'Receita de serviços', Subcategoria: 'Serviços prestados', Natureza: null, Valor: 50000 }),
    linha({ Valor: 8000, Centro_Custo: 'Loja 01' }),
    linha({ Categoria: 'Marketing', Subcategoria: 'Tráfego pago', Natureza: 'Variável', Valor: 3000, Centro_Custo: null }),
    linha({ Tipo: 'Transferência Interna', Categoria: null, Subcategoria: null, Natureza: null, Valor: 20000 }),
  ]);

describe('importação de planilha', () => {
  it('planilha correta: prévia, confirmação e dashboard atualizado', async () => {
    const p = await adm.importar(cliente.id, await base(), 'setembro.xlsx');
    expect(p.status).toBe(200);
    expect(p.dados.valido).toBe(true);
    expect(p.dados.linhasValidas).toBe(4);
    expect(p.dados.meses).toEqual([{ mes: '2026-09', quantidade: 4, existentes: 0 }]);
    expect(p.dados.resumo.transferencias).toBe(1);
    // centro de custo novo é avisado, não bloqueia
    expect(p.dados.avisos.some((a: { mensagem: string }) => a.mensagem.includes('Loja 01'))).toBe(true);
    expect(contar()).toBe(0); // nada gravado antes da confirmação

    const c = await adm.post(`/api/admin/importacoes/${p.dados.importId}/confirmar`, {});
    expect(c.status).toBe(200);
    expect(c.dados.inseridos).toBe(4);
    expect(contar()).toBe(4);

    const a = await adm.get(`/api/clientes/${cliente.slug}/analise?periodo=mes&ref=2026-09`);
    expect(a.dados.kpis.faturamento.atual).toBe(50000);
    expect(a.dados.kpis.despesas.atual).toBe(11000); // transferência fora
    const centros = await adm.get(`/api/admin/clientes/${cliente.id}`);
    expect(centros.dados.centros.map((c: { nome: string }) => c.nome)).toContain('Loja 01');
  });

  it('a mesma importação não pode ser confirmada duas vezes', async () => {
    const hist = await adm.get(`/api/admin/importacoes?clienteId=${cliente.id}`);
    const r = await adm.post(`/api/admin/importacoes/${hist.dados[0].id}/confirmar`, {});
    expect(r.status).toBe(409);
    expect(contar()).toBe(4);
  });

  it('o mesmo arquivo não é importado duas vezes', async () => {
    const p = await adm.importar(cliente.id, await base(), 'setembro-copia.xlsx');
    expect(p.dados.valido).toBe(false);
    expect(p.dados.arquivoJaImportado).not.toBeNull();
    expect(p.dados.importId).toBeNull();
  });

  it('período já importado exige escolher substituir ou adicionar', async () => {
    const arq = await planilha([linha({ Valor: 8000, Centro_Custo: 'Loja 01' }), linha({ Descricao: 'Energia', Subcategoria: 'Energia', Valor: 700 })]);
    const p = await adm.importar(cliente.id, arq);
    expect(p.dados.valido).toBe(true);
    expect(p.dados.periodosExistentes).toEqual(['2026-09']);
    const semModo = await adm.post(`/api/admin/importacoes/${p.dados.importId}/confirmar`, {});
    expect(semModo.status).toBe(409);
    expect(semModo.dados.erro).toContain('substituir');

    // adicionar: o lançamento idêntico (aluguel 8000) é ignorado, não duplicado
    const add = await adm.post(`/api/admin/importacoes/${p.dados.importId}/confirmar`, { modo: 'adicionar' });
    expect(add.status).toBe(200);
    expect(add.dados.inseridos).toBe(1);
    expect(add.dados.ignoradosDuplicados).toBe(1);
    expect(contar()).toBe(5);
  });

  it('substituir troca os dados do período e mantém o histórico', async () => {
    const arq = await planilha([
      linha({ Tipo: 'Receita', Categoria: 'Receita de vendas', Subcategoria: 'Produtos', Natureza: null, Valor: 70000 }),
      linha({ Valor: 9000 }),
    ]);
    const p = await adm.importar(cliente.id, arq, 'setembro-corrigido.xlsx');
    const r = await adm.post(`/api/admin/importacoes/${p.dados.importId}/confirmar`, { modo: 'substituir' });
    expect(r.status).toBe(200);
    expect(r.dados.substituidos).toBe(5);
    expect(contar()).toBe(2);
    const a = await adm.get(`/api/clientes/${cliente.slug}/analise?periodo=mes&ref=2026-09`);
    expect(a.dados.kpis.faturamento.atual).toBe(70000);
    const hist = await adm.get(`/api/clientes/${cliente.slug}/historico`);
    const status = hist.dados.map((h: { status: string }) => h.status);
    expect(status.filter((s: string) => s === 'atualizado')).toHaveLength(1);
    expect(status.filter((s: string) => s === 'substituido')).toHaveLength(2);
  });

  it('coluna ausente bloqueia a importação', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Base_Financeira');
    ws.addRow(['Data_Competencia', 'Mes_Referencia', 'Tipo', 'Categoria', 'Valor']);
    ws.addRow(['01/09/2026', '09/2026', 'Despesa', 'Administrativo', 100]);
    const p = await adm.importar(cliente.id, Buffer.from(await wb.xlsx.writeBuffer()));
    expect(p.dados.valido).toBe(false);
    expect(p.dados.colunasFaltando).toContain('Natureza');
    expect(p.dados.colunasFaltando).toContain('Data_Pagamento_Recebimento');
  });

  it('aba Base_Financeira ausente ou arquivo inválido', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Planilha1').addRow(['x']);
    const p = await adm.importar(cliente.id, Buffer.from(await wb.xlsx.writeBuffer()));
    expect(p.status).toBe(400);
    expect(p.dados.erro).toContain('Base_Financeira');
    const lixo = await adm.importar(cliente.id, Buffer.from('não é excel'));
    expect(lixo.status).toBe(400);
  });

  it('data e valor inválidos apontam linha e campo', async () => {
    const arq = await planilha([
      linha({}),
      linha({ Data_Competencia: '31/02/2026' }),
      linha({ Valor: 'abc' }),
      linha({ Tipo: 'Despezza' }),
      linha({ Natureza: 'Semi' }),
    ]);
    const p = await adm.importar(cliente.id, arq);
    expect(p.dados.valido).toBe(false);
    expect(p.dados.linhasComErro).toBe(4);
    const campos = p.dados.erros.map((e: { linha: number; campo: string }) => `${e.linha}:${e.campo}`);
    expect(campos).toEqual(['3:Data_Competencia', '4:Valor', '5:Tipo', '6:Natureza']);
    expect(p.dados.importId).toBeNull();
  });

  it('clientes demonstrativos nunca recebem importações reais', async () => {
    await semearDemonstracao(amb.db, '2026-09');
    const demo = amb.db.prepare('SELECT id FROM clients WHERE demonstrativo = 1 LIMIT 1').get() as { id: string };
    const p = await adm.importar(demo.id, await base());
    expect(p.status).toBe(400);
    expect(p.dados.erro).toContain('demonstrativos');
  });

  it('modelo de planilha pode ser baixado e é aceito pela validação', async () => {
    const r = await adm.get('/api/modelo-planilha');
    expect(r.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.dados);
    expect(wb.getWorksheet('Base_Financeira')).toBeTruthy();
  });
});

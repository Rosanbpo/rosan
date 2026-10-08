/**
 * Testes de segurança e isolamento entre clientes.
 * Cliente A nunca pode consultar, acessar, alterar ou receber dados do Cliente B.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Ambiente, linha, Navegador, planilha, subirAmbiente } from './util';

let amb: Ambiente;
const admin = () => new Navegador(amb.url);
let clienteA: { id: string; slug: string };
let clienteB: { id: string; slug: string };
let navA: Navegador;
let navB: Navegador;
let navAdmin: Navegador;

beforeAll(async () => {
  amb = await subirAmbiente();
  navAdmin = admin();
  await navAdmin.login('admin@rosan.test', 'Admin12345');

  const a = await navAdmin.post('/api/admin/clientes', {
    nome: 'Empresa Alfa',
    usuario: { nome: 'Ana', email: 'ana@alfa.test', senha: 'SenhaAlfa1' },
  });
  const b = await navAdmin.post('/api/admin/clientes', {
    nome: 'Empresa Beta',
    usuario: { nome: 'Bruno', email: 'bruno@beta.test', senha: 'SenhaBeta1' },
  });
  expect(a.status).toBe(201);
  expect(b.status).toBe(201);
  clienteA = a.dados;
  clienteB = b.dados;

  // dados distintos para cada empresa
  for (const [c, valor] of [
    [clienteA, 11111],
    [clienteB, 99999],
  ] as const) {
    const arq = await planilha([
      linha({ Tipo: 'Receita', Categoria: 'Receita de serviços', Subcategoria: 'Serviços prestados', Natureza: null, Valor: valor }),
      linha({ Valor: 1000 }),
    ]);
    const p = await navAdmin.importar(c.id, arq);
    expect(p.dados.valido).toBe(true);
    const conf = await navAdmin.post(`/api/admin/importacoes/${p.dados.importId}/confirmar`, {});
    expect(conf.status).toBe(200);
  }

  navA = new Navegador(amb.url);
  await navA.login('ana@alfa.test', 'SenhaAlfa1');
  navB = new Navegador(amb.url);
  await navB.login('bruno@beta.test', 'SenhaBeta1');
});

afterAll(() => amb.fechar());

const analise = (slug: string) => `/api/clientes/${slug}/analise?periodo=mes&ref=2026-09`;

describe('isolamento entre clientes', () => {
  it('Cliente A acessa somente o Cliente A', async () => {
    const eu = await navA.get('/api/auth/eu');
    expect(eu.dados.clienteSlug).toBe(clienteA.slug);
    const r = await navA.get(analise(clienteA.slug));
    expect(r.status).toBe(200);
    expect(r.dados.kpis.faturamento.atual).toBe(11111);
  });

  it('Cliente B acessa somente o Cliente B', async () => {
    const r = await navB.get(analise(clienteB.slug));
    expect(r.status).toBe(200);
    expect(r.dados.kpis.faturamento.atual).toBe(99999);
  });

  it('Cliente A não consegue acessar a URL do Cliente B', async () => {
    for (const caminho of [`/api/clientes/${clienteB.slug}`, analise(clienteB.slug), `/api/clientes/${clienteB.slug}/historico`]) {
      const r = await navA.get(caminho);
      expect(r.status).toBe(404);
      expect(JSON.stringify(r.dados)).not.toContain('99999');
      expect(JSON.stringify(r.dados)).not.toContain('Beta');
    }
  });

  it('Cliente A não consegue manipular parâmetros para acessar o Cliente B', async () => {
    const tentativas = [
      `${analise(clienteA.slug)}&clienteId=${clienteB.id}`,
      `${analise(clienteA.slug)}&client_id=${clienteB.id}`,
      `/api/clientes/${clienteB.id}/analise`,
      `/api/clientes/${encodeURIComponent(clienteB.slug + '/../' + clienteA.slug)}/analise`,
      `/api/clientes/%2e%2e/analise`,
    ];
    for (const t of tentativas) {
      const r = await navA.get(t);
      if (r.status === 200) expect(r.dados.kpis.faturamento.atual).toBe(11111);
      else expect([400, 404]).toContain(r.status);
      expect(JSON.stringify(r.dados)).not.toContain('99999');
    }
  });

  it('cliente não acessa nenhuma rota administrativa', async () => {
    const rotas: [string, string, unknown?][] = [
      ['GET', '/api/admin/painel'],
      ['GET', '/api/admin/clientes'],
      ['GET', `/api/admin/clientes/${clienteB.id}`],
      ['GET', `/api/admin/importacoes?clienteId=${clienteB.id}`],
      ['PUT', `/api/admin/clientes/${clienteA.id}`, { nome: 'Hack', status: 'ativo' }],
      ['POST', `/api/admin/clientes/${clienteB.id}/usuarios`, { nome: 'X', email: 'x@x.test', senha: 'Senha12345' }],
      ['PUT', `/api/admin/clientes/${clienteB.id}/premissas`, { margemReferencia: 0.5 }],
      ['POST', '/api/admin/clientes', { nome: 'Nova' }],
    ];
    for (const [m, c, b] of rotas) {
      const r = await navA.req(m, c, b);
      expect(r.status, `${m} ${c}`).toBe(403);
    }
    const imp = await navA.importar(clienteB.id, await planilha([linha({})]));
    expect(imp.status).toBe(403);
  });

  it('Admin acessa ambos os clientes', async () => {
    const a = await navAdmin.get(analise(clienteA.slug));
    const b = await navAdmin.get(analise(clienteB.slug));
    expect(a.dados.kpis.faturamento.atual).toBe(11111);
    expect(b.dados.kpis.faturamento.atual).toBe(99999);
    const painel = await navAdmin.get('/api/admin/painel');
    expect(painel.dados.clientes).toHaveLength(2);
  });

  it('isolamento existe no acesso a dados (repositório sempre filtra por client_id)', async () => {
    const { lancamentosDoCliente } = await import('../server/repositorio');
    const daA = lancamentosDoCliente(amb.db, clienteA.id);
    expect(daA.every((l) => l.valor !== 99999)).toBe(true);
  });
});

describe('autenticação', () => {
  it('sem login nada é acessível, nem com o link do cliente', async () => {
    const anon = new Navegador(amb.url);
    expect((await anon.get(analise(clienteA.slug))).status).toBe(401);
    expect((await anon.get(`/api/clientes/${clienteA.slug}`)).status).toBe(401);
    expect((await anon.get('/api/admin/painel')).status).toBe(401);
  });

  it('senha errada é recusada com mensagem genérica', async () => {
    const r = await new Navegador(amb.url).post('/api/auth/login', { email: 'ana@alfa.test', senha: 'errada123' });
    expect(r.status).toBe(401);
    const r2 = await new Navegador(amb.url).post('/api/auth/login', { email: 'naoexiste@x.test', senha: 'errada123' });
    expect(r2.dados.erro).toBe(r.dados.erro);
  });

  it('cookie de sessão é httpOnly e SameSite=Strict', async () => {
    const r = await new Navegador(amb.url).post('/api/auth/login', { email: 'ana@alfa.test', senha: 'SenhaAlfa1' });
    const c = r.headers.get('set-cookie')!;
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=Strict/i);
  });

  it('requisição que altera dados sem o cabeçalho anti-CSRF é recusada', async () => {
    const r = await navAdmin.req('POST', '/api/admin/clientes', { nome: 'Sem CSRF' }, { semCsrf: true });
    expect(r.status).toBe(403);
  });

  it('logout encerra a sessão no servidor', async () => {
    const n = new Navegador(amb.url);
    await n.login('ana@alfa.test', 'SenhaAlfa1');
    const cookie = n.cookie;
    await n.post('/api/auth/logout');
    const reuso = new Navegador(amb.url);
    reuso.cookie = cookie;
    expect((await reuso.get('/api/auth/eu')).status).toBe(401);
  });

  it('desativar o cliente bloqueia o acesso imediatamente', async () => {
    const n = new Navegador(amb.url);
    await n.login('bruno@beta.test', 'SenhaBeta1');
    await navAdmin.put(`/api/admin/clientes/${clienteB.id}`, { nome: 'Empresa Beta', status: 'inativo' });
    expect((await n.get(analise(clienteB.slug))).status).toBe(401);
    const login = await new Navegador(amb.url).post('/api/auth/login', { email: 'bruno@beta.test', senha: 'SenhaBeta1' });
    expect(login.status).toBe(403);
    await navAdmin.put(`/api/admin/clientes/${clienteB.id}`, { nome: 'Empresa Beta', status: 'ativo' });
  });

  it('bloqueia força bruta no login', async () => {
    const n = new Navegador(amb.url);
    let ultimo = 0;
    for (let i = 0; i < 10; i++) ultimo = (await n.post('/api/auth/login', { email: 'ana@alfa.test', senha: `errada${i}x` })).status;
    expect(ultimo).toBe(429);
  });

  it('senhas são armazenadas com hash', () => {
    const u = amb.db.prepare(`SELECT senha_hash FROM users WHERE email = 'ana@alfa.test'`).get() as { senha_hash: string };
    expect(u.senha_hash).not.toContain('SenhaAlfa1');
    expect(u.senha_hash.startsWith('scrypt$')).toBe(true);
  });
});

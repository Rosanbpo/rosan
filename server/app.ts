import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { analisar, DESCRICAO_PREMISSAS, PREMISSAS_PADRAO, type Premissas, resumirCliente } from '../shared/analise';
import {
  deslocarMes,
  ehMes,
  mesAtual,
  resolverComparacao,
  resolverPeriodo,
  type TipoComparacao,
  type TipoPeriodo,
} from '../shared/periodos';
import {
  carregarUsuario,
  conferirIsca,
  conferirSenha,
  criarLimitadorLogin,
  criarSessao,
  encerrarSessao,
  encerrarSessoesDoUsuario,
  exigirAcessoCliente,
  exigirAdmin,
  exigirCabecalhoAntiCsrf,
  exigirLogin,
  gravarCookieSessao,
  hashSenha,
  lerCookie,
  limparCookieSessao,
  COOKIE_SESSAO,
  validarForcaSenha,
} from './auth';
import { type Db, transacao } from './db';
import { cancelarImportacao, confirmarImportacao, ErroImportacao, prepararImportacao } from './importacao';
import { gerarPlanilha } from './modelo';
import {
  centrosDoCliente,
  clienteUsaCentroCusto,
  copiarPlanoPadrao,
  historicoDoCliente,
  lancamentosDoCliente,
  mesesDoCliente,
  planoDoCliente,
  premissasDoCliente,
} from './repositorio';

export interface OpcoesApp {
  db: Db;
  /** cookies com flag Secure (produção em HTTPS) */
  cookieSeguro?: boolean;
  /** pasta do frontend compilado, servida em produção */
  pastaWeb?: string;
}

const PERIODOS: TipoPeriodo[] = ['mes', 'trimestre', 'semestre', 'ano', 'personalizado'];
const COMPARACOES: TipoComparacao[] = ['anterior', 'ano_anterior', 'acumulado'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const txt = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};

export function gerarSlug(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'empresa'
  );
}

/** Erros esperados viram respostas 4xx com mensagem amigável. */
class ErroHttp extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

const rota =
  (fn: (req: Request, res: Response) => unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

export function criarApp({ db, cookieSeguro = false, pastaWeb }: OpcoesApp) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  // verificação de saúde usada pela hospedagem (não expõe dados)
  app.get('/api/saude', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ ok: true });
  });

  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '1mb' }));
  app.use('/api', carregarUsuario(db));
  app.use('/api', exigirCabecalhoAntiCsrf);

  const limitador = criarLimitadorLogin();

  /* ================= autenticação ================= */

  app.post(
    '/api/auth/login',
    rota((req, res) => {
      const email = txt(req.body?.email, 200)?.toLowerCase() ?? '';
      const senha = typeof req.body?.senha === 'string' ? req.body.senha.slice(0, 200) : '';
      const chave = `${req.ip}|${email}`;
      if (limitador.bloqueado(chave)) {
        return res.status(429).json({ erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
      }
      const u = db
        .prepare(
          `SELECT u.id, u.senha_hash, u.role, u.ativo, c.status AS client_status
           FROM users u LEFT JOIN client_users cu ON cu.user_id = u.id LEFT JOIN clients c ON c.id = cu.client_id
           WHERE u.email = ?`,
        )
        .get(email) as { id: string; senha_hash: string; role: string; ativo: number; client_status: string | null } | undefined;
      const ok = u ? conferirSenha(senha, u.senha_hash) : conferirIsca(senha);
      if (!u || !ok) {
        limitador.falhou(chave);
        return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
      }
      if (!u.ativo || (u.role === 'cliente' && u.client_status !== 'ativo')) {
        return res.status(403).json({ erro: 'Acesso desativado. Fale com a equipe Rosan.' });
      }
      limitador.limpar(chave);
      gravarCookieSessao(res, criarSessao(db, u.id), cookieSeguro);
      res.json({ ok: true });
    }),
  );

  app.post('/api/auth/logout', (req, res) => {
    const token = lerCookie(req, COOKIE_SESSAO);
    if (token) encerrarSessao(db, token);
    limparCookieSessao(res, cookieSeguro);
    res.json({ ok: true });
  });

  app.get('/api/auth/eu', exigirLogin, (req, res) => {
    const u = req.usuario!;
    res.json({
      id: u.id,
      nome: u.nome,
      email: u.email,
      role: u.role,
      trocarSenha: u.trocarSenha,
      clienteSlug: u.clientSlug,
    });
  });

  app.post(
    '/api/auth/trocar-senha',
    exigirLogin,
    rota((req, res) => {
      const u = req.usuario!;
      const atual = db.prepare('SELECT senha_hash FROM users WHERE id = ?').get(u.id) as { senha_hash: string };
      if (!conferirSenha(String(req.body?.senhaAtual ?? ''), atual.senha_hash)) {
        return res.status(400).json({ erro: 'Senha atual incorreta.' });
      }
      const problema = validarForcaSenha(req.body?.novaSenha);
      if (problema) return res.status(400).json({ erro: problema });
      db.prepare('UPDATE users SET senha_hash = ?, trocar_senha = 0 WHERE id = ?').run(hashSenha(req.body.novaSenha), u.id);
      encerrarSessoesDoUsuario(db, u.id, lerCookie(req, COOKIE_SESSAO) ?? undefined);
      res.json({ ok: true });
    }),
  );

  /* ================= modelo de planilha ================= */

  app.get(
    '/api/modelo-planilha',
    exigirLogin,
    rota(async (_req, res) => {
      const buf = await gerarPlanilha();
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', 'attachment; filename="modelo-planilha-rosan.xlsx"');
      res.send(buf);
    }),
  );

  /* ================= dashboard do cliente (escopo por :slug) ================= */

  const acessoCliente = exigirAcessoCliente(db);

  app.get('/api/clientes/:slug', acessoCliente, (req, res) => {
    const c = db
      .prepare('SELECT id, slug, nome_empresa, logo, demonstrativo, periodo_inicial FROM clients WHERE id = ?')
      .get(req.cliente!.id) as Record<string, unknown>;
    const meses = mesesDoCliente(db, req.cliente!.id);
    res.json({
      slug: c.slug,
      nome: c.nome_empresa,
      logo: c.logo,
      demonstrativo: c.demonstrativo === 1,
      periodoInicial: c.periodo_inicial,
      meses,
      ultimoMes: meses.at(-1) ?? null,
      usaCentroCusto: clienteUsaCentroCusto(db, req.cliente!.id),
    });
  });

  app.get('/api/clientes/:slug/analise', acessoCliente, (req, res) => {
    const clientId = req.cliente!.id;
    const meses = mesesDoCliente(db, clientId);
    const ultimo = meses.at(-1) ?? null;
    const q = req.query;
    const tipo = PERIODOS.includes(q.periodo as TipoPeriodo) ? (q.periodo as TipoPeriodo) : 'mes';
    const comparacao = COMPARACOES.includes(q.comparacao as TipoComparacao) ? (q.comparacao as TipoComparacao) : 'anterior';
    const ref = ehMes(q.ref) ? q.ref : ultimo ?? mesAtual();
    const personalizado = ehMes(q.inicio) && ehMes(q.fim) ? { inicio: q.inicio, fim: q.fim } : undefined;
    const intervalo = resolverPeriodo(tipo, ref, ultimo, personalizado);
    const p = resolverComparacao(intervalo, comparacao);
    const analise = analisar(lancamentosDoCliente(db, clientId), {
      atual: p.atual,
      comparacao: p.comparacao,
      rotuloComparacao: p.rotuloComparacao,
      usaCentroCusto: clienteUsaCentroCusto(db, clientId),
      premissas: premissasDoCliente(db, clientId),
    });
    res.json(analise);
  });

  app.get('/api/clientes/:slug/historico', acessoCliente, (req, res) => {
    res.json(historicoDoCliente(db, req.cliente!.id));
  });

  /* ================= administração Rosan ================= */

  const admin = express.Router();
  admin.use(exigirAdmin);

  function clientePorId(id: string) {
    const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!c) throw new ErroHttp(404, 'Cliente não encontrado.');
    return c;
  }

  function resumoDosClientes() {
    const clientes = db
      .prepare(
        `SELECT c.id, c.slug, c.nome_empresa, c.cnpj, c.status, c.demonstrativo,
           (SELECT count(*) FROM client_users cu WHERE cu.client_id = c.id) AS usuarios,
           (SELECT max(data_importacao) FROM imports i WHERE i.client_id = c.id AND i.status = 'concluida') AS ultimaImportacao
         FROM clients c ORDER BY c.nome_empresa COLLATE NOCASE`,
      )
      .all() as Record<string, unknown>[];
    const hoje = mesAtual();
    return clientes.map((c) => {
      const id = c.id as string;
      const r = resumirCliente(lancamentosDoCliente(db, id), clienteUsaCentroCusto(db, id), premissasDoCliente(db, id));
      const atualizado = !!r.ultimoPeriodo && r.ultimoPeriodo >= deslocarMes(hoje, -1);
      const semDadosRecentes = !r.ultimoPeriodo || r.ultimoPeriodo < deslocarMes(hoje, -2);
      return {
        id,
        slug: c.slug,
        nome: c.nome_empresa,
        cnpj: c.cnpj,
        status: c.status,
        demonstrativo: c.demonstrativo === 1,
        usuarios: c.usuarios,
        ultimaImportacao: c.ultimaImportacao,
        ...r,
        atualizado,
        semDadosRecentes,
      };
    });
  }

  admin.get('/painel', (_req, res) => {
    const clientes = resumoDosClientes();
    const ativos = clientes.filter((c) => c.status === 'ativo');
    res.json({
      indicadores: {
        total: clientes.length,
        ativos: ativos.length,
        atualizados: ativos.filter((c) => c.atualizado).length,
        atencao: ativos.filter((c) => c.atencao).length,
        margemNegativa: ativos.filter((c) => c.margem !== null && c.margem < 0).length,
        abaixoPE: ativos.filter((c) => c.abaixoPE).length,
        semDadosRecentes: ativos.filter((c) => c.semDadosRecentes).length,
      },
      clientes,
    });
  });

  admin.get('/clientes', (_req, res) => res.json(resumoDosClientes()));

  function lerDadosCliente(body: Record<string, unknown>) {
    const nome = txt(body.nome, 160);
    if (!nome) throw new ErroHttp(400, 'Informe o nome da empresa.');
    const email = txt(body.email, 200);
    if (email && !EMAIL_RE.test(email)) throw new ErroHttp(400, 'E-mail da empresa inválido.');
    const cnpj = txt(body.cnpj, 20)?.replace(/\D/g, '') ?? null;
    if (cnpj && cnpj.length !== 14) throw new ErroHttp(400, 'CNPJ deve ter 14 dígitos.');
    const periodoInicial = txt(body.periodoInicial, 7);
    if (periodoInicial && !ehMes(periodoInicial)) throw new ErroHttp(400, 'Período inicial inválido (use AAAA-MM).');
    return {
      nome,
      cnpj,
      responsavel: txt(body.responsavel, 160),
      email,
      telefone: txt(body.telefone, 30),
      status: body.status === 'inativo' ? 'inativo' : 'ativo',
      periodoInicial,
    };
  }

  function criarUsuarioCliente(clientId: string, body: Record<string, unknown>) {
    const nome = txt(body.nome, 160);
    const email = txt(body.email, 200)?.toLowerCase();
    if (!nome || !email || !EMAIL_RE.test(email)) throw new ErroHttp(400, 'Informe nome e e-mail válidos para o usuário de acesso.');
    const problema = validarForcaSenha(body.senha);
    if (problema) throw new ErroHttp(400, problema);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new ErroHttp(409, 'Já existe um usuário com este e-mail.');
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO users (id, nome, email, senha_hash, role, trocar_senha) VALUES (?, ?, ?, ?, 'cliente', 1)`).run(
      id,
      nome,
      email,
      hashSenha(String(body.senha)),
    );
    db.prepare('INSERT INTO client_users (user_id, client_id) VALUES (?, ?)').run(id, clientId);
    return id;
  }

  admin.post(
    '/clientes',
    rota((req, res) => {
      const d = lerDadosCliente(req.body ?? {});
      const id = crypto.randomUUID();
      let slug = gerarSlug(d.nome);
      const base = slug;
      for (let n = 2; db.prepare('SELECT 1 FROM clients WHERE slug = ?').get(slug); n++) slug = `${base}-${n}`;
      transacao(db, () => {
        db.prepare(
          `INSERT INTO clients (id, slug, nome_empresa, cnpj, responsavel, email, telefone, status, periodo_inicial)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(id, slug, d.nome, d.cnpj, d.responsavel, d.email, d.telefone, d.status, d.periodoInicial);
        copiarPlanoPadrao(db, id);
        if (req.body?.usuario) criarUsuarioCliente(id, req.body.usuario);
      });
      res.status(201).json({ id, slug });
    }),
  );

  admin.get('/clientes/:id', (req, res) => {
    const c = clientePorId(String(req.params.id));
    const usuarios = db
      .prepare(
        `SELECT u.id, u.nome, u.email, u.ativo, u.trocar_senha AS trocarSenha FROM users u
         JOIN client_users cu ON cu.user_id = u.id WHERE cu.client_id = ? ORDER BY u.nome`,
      )
      .all(c.id as string);
    res.json({
      id: c.id,
      slug: c.slug,
      nome: c.nome_empresa,
      cnpj: c.cnpj,
      responsavel: c.responsavel,
      email: c.email,
      telefone: c.telefone,
      status: c.status,
      demonstrativo: c.demonstrativo === 1,
      logo: c.logo,
      periodoInicial: c.periodo_inicial,
      usuarios,
      centros: centrosDoCliente(db, c.id as string),
      plano: planoDoCliente(db, c.id as string),
      premissas: premissasDoCliente(db, c.id as string),
    });
  });

  admin.put(
    '/clientes/:id',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const d = lerDadosCliente(req.body ?? {});
      db.prepare(
        `UPDATE clients SET nome_empresa = ?, cnpj = ?, responsavel = ?, email = ?, telefone = ?, status = ?, periodo_inicial = ?
         WHERE id = ?`,
      ).run(d.nome, d.cnpj, d.responsavel, d.email, d.telefone, d.status, d.periodoInicial, c.id as string);
      if (d.status === 'inativo') {
        db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT user_id FROM client_users WHERE client_id = ?)').run(c.id as string);
      }
      res.json({ ok: true });
    }),
  );

  admin.put(
    '/clientes/:id/logo',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const logo = req.body?.logo;
      if (logo === null) {
        db.prepare('UPDATE clients SET logo = NULL WHERE id = ?').run(c.id as string);
        return res.json({ ok: true });
      }
      if (typeof logo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo) || logo.length > 400_000) {
        throw new ErroHttp(400, 'Envie uma imagem PNG, JPG ou WEBP de até 300 KB.');
      }
      db.prepare('UPDATE clients SET logo = ? WHERE id = ?').run(logo, c.id as string);
      res.json({ ok: true });
    }),
  );

  admin.post(
    '/clientes/:id/usuarios',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const id = criarUsuarioCliente(c.id as string, req.body ?? {});
      res.status(201).json({ id });
    }),
  );

  admin.put(
    '/usuarios/:id',
    rota((req, res) => {
      const u = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(String(req.params.id)) as { id: string; role: string } | undefined;
      if (!u) throw new ErroHttp(404, 'Usuário não encontrado.');
      if (u.id === req.usuario!.id && req.body?.ativo === false) throw new ErroHttp(400, 'Você não pode desativar o próprio acesso.');
      if (typeof req.body?.ativo === 'boolean') {
        db.prepare('UPDATE users SET ativo = ? WHERE id = ?').run(req.body.ativo ? 1 : 0, u.id);
        if (!req.body.ativo) encerrarSessoesDoUsuario(db, u.id);
      }
      if (req.body?.novaSenha !== undefined) {
        const problema = validarForcaSenha(req.body.novaSenha);
        if (problema) throw new ErroHttp(400, problema);
        db.prepare('UPDATE users SET senha_hash = ?, trocar_senha = 1 WHERE id = ?').run(hashSenha(req.body.novaSenha), u.id);
        encerrarSessoesDoUsuario(db, u.id);
      }
      res.json({ ok: true });
    }),
  );

  admin.post(
    '/clientes/:id/centros',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const nome = txt(req.body?.nome, 80);
      if (!nome) throw new ErroHttp(400, 'Informe o nome do centro de custo.');
      const r = db.prepare('INSERT OR IGNORE INTO cost_centers (id, client_id, nome) VALUES (?, ?, ?)').run(crypto.randomUUID(), c.id as string, nome);
      if (!r.changes) throw new ErroHttp(409, 'Este centro de custo já existe.');
      res.status(201).json({ ok: true });
    }),
  );

  admin.put(
    '/clientes/:id/centros/:centroId',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const status = req.body?.status === 'inativo' ? 'inativo' : 'ativo';
      // o filtro por client_id impede alterar o centro de outro cliente
      const r = db.prepare('UPDATE cost_centers SET status = ? WHERE id = ? AND client_id = ?').run(status, String(req.params.centroId), c.id as string);
      if (!r.changes) throw new ErroHttp(404, 'Centro de custo não encontrado.');
      res.json({ ok: true });
    }),
  );

  admin.post(
    '/clientes/:id/plano',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const tipo = req.body?.tipo === 'receita' ? 'receita' : 'despesa';
      const categoria = txt(req.body?.categoria, 80);
      if (!categoria) throw new ErroHttp(400, 'Informe a categoria.');
      const sub = txt(req.body?.subcategoria, 80) ?? '';
      const r = db
        .prepare('INSERT OR IGNORE INTO categories (id, client_id, tipo, categoria, subcategoria) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), c.id as string, tipo, categoria, sub);
      if (!r.changes) throw new ErroHttp(409, 'Esta categoria/subcategoria já existe.');
      res.status(201).json({ ok: true });
    }),
  );

  admin.delete(
    '/clientes/:id/plano/:itemId',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const r = db.prepare('DELETE FROM categories WHERE id = ? AND client_id = ?').run(String(req.params.itemId), c.id as string);
      if (!r.changes) throw new ErroHttp(404, 'Item não encontrado.');
      res.json({ ok: true });
    }),
  );

  admin.put(
    '/clientes/:id/premissas',
    rota((req, res) => {
      const c = clientePorId(String(req.params.id));
      const entrada = (req.body ?? {}) as Record<string, unknown>;
      transacao(db, () => {
        for (const chave of Object.keys(DESCRICAO_PREMISSAS) as (keyof Premissas)[]) {
          const v = entrada[chave];
          if (v === undefined) continue;
          if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
            throw new ErroHttp(400, `Valor inválido para ${DESCRICAO_PREMISSAS[chave].rotulo}.`);
          }
          db.prepare('INSERT INTO assumptions (client_id, parametro, valor) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET valor = excluded.valor').run(
            c.id as string,
            chave,
            v,
          );
        }
      });
      res.json({ ok: true });
    }),
  );

  admin.get('/premissas-padrao', (_req, res) => res.json({ valores: PREMISSAS_PADRAO, descricao: DESCRICAO_PREMISSAS }));

  admin.get('/plano-padrao', (_req, res) => {
    res.json(
      db
        .prepare('SELECT tipo, categoria, subcategoria FROM categories WHERE client_id IS NULL ORDER BY tipo DESC, categoria, subcategoria')
        .all(),
    );
  });

  admin.get('/centros', (_req, res) => {
    const clientes = db.prepare('SELECT id, slug, nome_empresa AS nome FROM clients ORDER BY nome_empresa COLLATE NOCASE').all() as {
      id: string;
      slug: string;
      nome: string;
    }[];
    res.json(
      clientes.map((c) => ({
        ...c,
        centros: centrosDoCliente(db, c.id),
        usaCentroCusto: clienteUsaCentroCusto(db, c.id),
      })),
    );
  });

  admin.get('/administradores', (_req, res) => {
    res.json(db.prepare(`SELECT id, nome, email, ativo FROM users WHERE role = 'admin' ORDER BY nome`).all());
  });

  admin.post(
    '/administradores',
    rota((req, res) => {
      const nome = txt(req.body?.nome, 160);
      const email = txt(req.body?.email, 200)?.toLowerCase();
      if (!nome || !email || !EMAIL_RE.test(email)) throw new ErroHttp(400, 'Informe nome e e-mail válidos.');
      const problema = validarForcaSenha(req.body?.senha);
      if (problema) throw new ErroHttp(400, problema);
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new ErroHttp(409, 'Já existe um usuário com este e-mail.');
      db.prepare(`INSERT INTO users (id, nome, email, senha_hash, role, trocar_senha) VALUES (?, ?, ?, ?, 'admin', 1)`).run(
        crypto.randomUUID(),
        nome,
        email,
        hashSenha(req.body.senha),
      );
      res.status(201).json({ ok: true });
    }),
  );

  /* ---------- importação ---------- */

  admin.post(
    '/importacoes/previa',
    express.raw({ type: 'application/octet-stream', limit: '10mb' }),
    rota(async (req, res) => {
      const c = clientePorId(String(req.query.clienteId ?? ''));
      if (c.demonstrativo === 1) {
        throw new ErroHttp(400, 'Clientes demonstrativos não recebem importações, para nunca misturar dados fictícios com dados reais.');
      }
      const nome = (txt(req.query.arquivo, 200) ?? 'planilha.xlsx').replace(/[^\w.\- ()À-ú]/g, '_');
      if (!Buffer.isBuffer(req.body) || !req.body.length) throw new ErroHttp(400, 'Selecione um arquivo Excel.');
      const previa = await prepararImportacao(db, c.id as string, nome, req.body, req.usuario!.id);
      res.json(previa);
    }),
  );

  admin.post(
    '/importacoes/:id/confirmar',
    rota((req, res) => {
      const imp = db.prepare('SELECT client_id FROM imports WHERE id = ?').get(String(req.params.id)) as { client_id: string } | undefined;
      if (!imp) throw new ErroHttp(404, 'Importação não encontrada.');
      const modo = req.body?.modo === 'substituir' || req.body?.modo === 'adicionar' ? req.body.modo : undefined;
      res.json(confirmarImportacao(db, String(req.params.id), imp.client_id, modo));
    }),
  );

  admin.post(
    '/importacoes/:id/cancelar',
    rota((req, res) => {
      const imp = db.prepare('SELECT client_id FROM imports WHERE id = ?').get(String(req.params.id)) as { client_id: string } | undefined;
      if (!imp) throw new ErroHttp(404, 'Importação não encontrada.');
      cancelarImportacao(db, String(req.params.id), imp.client_id);
      res.json({ ok: true });
    }),
  );

  admin.get('/importacoes', (req, res) => {
    const clienteId = txt(req.query.clienteId, 64);
    const linhas = db
      .prepare(
        `SELECT i.id, i.client_id AS clienteId, c.nome_empresa AS cliente, c.slug, i.nome_arquivo AS arquivo, i.status, i.modo,
           i.periodos, i.quantidade_lancamentos AS lancamentos, i.ignorados_duplicados AS ignorados,
           i.data_importacao AS dataImportacao, u.nome AS usuario
         FROM imports i JOIN clients c ON c.id = i.client_id LEFT JOIN users u ON u.id = i.usuario_id
         WHERE i.status IN ('concluida', 'substituida') AND (? IS NULL OR i.client_id = ?)
         ORDER BY i.data_importacao DESC LIMIT 500`,
      )
      .all(clienteId, clienteId) as Record<string, unknown>[];
    res.json(linhas.map((l) => ({ ...l, periodos: JSON.parse(l.periodos as string) })));
  });

  app.use('/api/admin', admin);

  app.use('/api', (_req, res) => {
    res.status(404).json({ erro: 'Recurso não encontrado.' });
  });

  /* ================= frontend ================= */

  if (pastaWeb && existsSync(pastaWeb)) {
    app.use(express.static(pastaWeb, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(pastaWeb, 'index.html')));
  }

  /* ================= erros ================= */

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ErroHttp || err instanceof ErroImportacao) {
      return res.status(err.status).json({ erro: err.message });
    }
    const e = err as { type?: string; status?: number };
    if (e?.type === 'entity.too.large') return res.status(413).json({ erro: 'Arquivo muito grande (máximo 10 MB).' });
    if (e?.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Requisição inválida.' });
    console.error(err);
    res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
  });

  return app;
}

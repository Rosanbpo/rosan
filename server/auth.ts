import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Db } from './db';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'cliente';
  trocarSenha: boolean;
  /** empresa vinculada (somente usuários cliente) */
  clientId: string | null;
  clientSlug: string | null;
}

export interface Cliente {
  id: string;
  slug: string;
  nome_empresa: string;
  status: 'ativo' | 'inativo';
  demonstrativo: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: Usuario;
    /** cliente autorizado para a rota atual (definido por exigirAcessoCliente) */
    cliente?: Cliente;
  }
}

export const COOKIE_SESSAO = 'rosan_sessao';
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;

/* ---------------- senhas ---------------- */

export function hashSenha(senha: string): string {
  const sal = randomBytes(16);
  const hash = scryptSync(senha, sal, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

export function conferirSenha(senha: string, armazenado: string): boolean {
  const [alg, salB64, hashB64] = armazenado.split('$');
  if (alg !== 'scrypt' || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, 'base64');
  const calculado = scryptSync(senha, Buffer.from(salB64, 'base64'), esperado.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(esperado, calculado);
}

/** Hash "isca" para manter o tempo de resposta igual quando o e-mail não existe. */
const HASH_ISCA = hashSenha(randomBytes(12).toString('hex'));
export const conferirIsca = (senha: string) => conferirSenha(senha, HASH_ISCA);

export function validarForcaSenha(senha: unknown): string | null {
  if (typeof senha !== 'string' || senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (senha.length > 200) return 'Senha muito longa.';
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'A senha precisa conter letras e números.';
  return null;
}

/* ---------------- sessões ---------------- */

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export function criarSessao(db: Db, userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const agora = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(agora);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    agora + DURACAO_SESSAO_MS,
    agora,
  );
  return token;
}

export function encerrarSessao(db: Db, token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function encerrarSessoesDoUsuario(db: Db, userId: string, exceto?: string) {
  if (exceto) db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(userId, hashToken(exceto));
  else db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function lerCookie(req: Request, nome: string): string | null {
  const cab = req.headers.cookie;
  if (!cab) return null;
  for (const parte of cab.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

export function gravarCookieSessao(res: Response, token: string, seguro: boolean) {
  res.cookie(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: seguro,
    path: '/',
    maxAge: DURACAO_SESSAO_MS,
  });
}

export function limparCookieSessao(res: Response, seguro: boolean) {
  res.clearCookie(COOKIE_SESSAO, { httpOnly: true, sameSite: 'strict', secure: seguro, path: '/' });
}

/* ---------------- middlewares ---------------- */

/** Identifica o usuário pela sessão (cookie httpOnly). Nunca confia em dados do cliente. */
export function carregarUsuario(db: Db) {
  const consulta = db.prepare(`
    SELECT u.id, u.nome, u.email, u.role, u.trocar_senha, cu.client_id, c.slug, c.status AS client_status
    FROM sessions s
    JOIN users u ON u.id = s.user_id AND u.ativo = 1
    LEFT JOIN client_users cu ON cu.user_id = u.id
    LEFT JOIN clients c ON c.id = cu.client_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `);
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = lerCookie(req, COOKIE_SESSAO);
    if (token) {
      const r = consulta.get(hashToken(token), Date.now()) as Record<string, unknown> | undefined;
      // usuário cliente sem empresa ativa não tem acesso a nada
      if (r && (r.role === 'admin' || (r.client_id && r.client_status === 'ativo'))) {
        req.usuario = {
          id: r.id as string,
          nome: r.nome as string,
          email: r.email as string,
          role: r.role as Usuario['role'],
          trocarSenha: r.trocar_senha === 1,
          clientId: r.role === 'cliente' ? (r.client_id as string) : null,
          clientSlug: r.role === 'cliente' ? (r.slug as string) : null,
        };
      }
    }
    next();
  };
}

export function exigirLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario) return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  next();
}

export function exigirAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario) return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  if (req.usuario.role !== 'admin') return res.status(403).json({ erro: 'Acesso restrito à equipe Rosan.' });
  next();
}

/**
 * Autoriza o acesso ao cliente indicado em :slug.
 * Admin: qualquer cliente. Usuário cliente: somente a empresa vinculada a ele no banco.
 * Para não revelar a existência de outras empresas, a negativa é um 404.
 */
export function exigirAcessoCliente(db: Db) {
  const porSlug = db.prepare('SELECT id, slug, nome_empresa, status, demonstrativo FROM clients WHERE slug = ?');
  return (req: Request, res: Response, next: NextFunction) => {
    const u = req.usuario;
    if (!u) return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
    const slug = String(req.params.slug ?? '');
    const cliente = porSlug.get(slug) as Cliente | undefined;
    const autorizado = !!cliente && (u.role === 'admin' || (cliente.id === u.clientId && cliente.status === 'ativo'));
    if (!autorizado) return res.status(404).json({ erro: 'Empresa não encontrada.' });
    req.cliente = cliente;
    next();
  };
}

/**
 * Proteção contra CSRF: toda requisição que altera dados precisa do cabeçalho
 * X-Rosan (navegadores não enviam cabeçalhos customizados entre origens sem CORS).
 */
export function exigirCabecalhoAntiCsrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Rosan') !== '1') return res.status(403).json({ erro: 'Requisição recusada.' });
  next();
}

/** Limite simples de tentativas de login por IP + e-mail. */
export function criarLimitadorLogin(max = 8, janelaMs = 15 * 60 * 1000) {
  const tentativas = new Map<string, { n: number; desde: number }>();
  return {
    bloqueado(chave: string) {
      const t = tentativas.get(chave);
      if (!t) return false;
      if (Date.now() - t.desde > janelaMs) {
        tentativas.delete(chave);
        return false;
      }
      return t.n >= max;
    },
    falhou(chave: string) {
      const t = tentativas.get(chave);
      if (!t || Date.now() - t.desde > janelaMs) tentativas.set(chave, { n: 1, desde: Date.now() });
      else t.n++;
    },
    limpar(chave: string) {
      tentativas.delete(chave);
    },
  };
}

import { randomBytes } from 'node:crypto';
import { hashSenha } from './auth';
import type { Db } from './db';

/** Garante que exista ao menos um administrador Rosan. */
export function garantirAdmin(db: Db) {
  if (db.prepare(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`).get()) return;
  const email = (process.env.ROSAN_ADMIN_EMAIL ?? 'admin@rosan.com.br').toLowerCase();
  const senha = process.env.ROSAN_ADMIN_SENHA ?? `Rosan-${randomBytes(6).toString('base64url')}1`;
  db.prepare(`INSERT INTO users (id, nome, email, senha_hash, role, trocar_senha) VALUES (?, 'Administrador Rosan', ?, ?, 'admin', 1)`).run(
    crypto.randomUUID(),
    email,
    hashSenha(senha),
  );
  console.log('\n  Administrador Rosan criado');
  console.log(`  E-mail: ${email}`);
  if (!process.env.ROSAN_ADMIN_SENHA) console.log(`  Senha provisória: ${senha}  (será pedida a troca no primeiro acesso)`);
  console.log('');
}

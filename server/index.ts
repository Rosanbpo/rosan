import { resolve } from 'node:path';
import { criarApp } from './app';
import { abrirBanco } from './db';
import { semearDemonstracao } from './demo';
import { garantirAdmin } from './inicial';

const db = abrirBanco(process.env.ROSAN_DB ?? resolve('dados/rosan.db'));
garantirAdmin(db);

// ROSAN_DEMO=1 cria os clientes demonstrativos uma única vez (nunca mistura com clientes reais)
if (process.env.ROSAN_DEMO === '1' && !db.prepare('SELECT 1 FROM clients WHERE demonstrativo = 1 LIMIT 1').get()) {
  await semearDemonstracao(db);
  console.log('Clientes demonstrativos criados.');
}

const producao = process.env.NODE_ENV === 'production';
const app = criarApp({
  db,
  cookieSeguro: producao || process.env.COOKIE_SEGURO === '1',
  pastaWeb: resolve('dist'),
});
const porta = Number(process.env.PORT ?? 3001);
app.listen(porta, () => console.log(`Rosan rodando em http://localhost:${porta}`));

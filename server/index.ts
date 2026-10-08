import { resolve } from 'node:path';
import { criarApp } from './app';
import { abrirBanco } from './db';
import { garantirAdmin } from './inicial';

const db = abrirBanco(process.env.ROSAN_DB ?? resolve('dados/rosan.db'));
garantirAdmin(db);

const producao = process.env.NODE_ENV === 'production';
const app = criarApp({
  db,
  cookieSeguro: producao || process.env.COOKIE_SEGURO === '1',
  pastaWeb: resolve('dist'),
});
const porta = Number(process.env.PORT ?? 3001);
app.listen(porta, () => console.log(`Rosan rodando em http://localhost:${porta}`));

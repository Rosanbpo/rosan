import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { criarApp } from '../server/app';
import { hashSenha } from '../server/auth';
import { abrirBanco, type Db } from '../server/db';
import { gerarPlanilha, type LinhaPlanilha } from '../server/modelo';

export interface Ambiente {
  db: Db;
  url: string;
  fechar: () => Promise<void>;
}

export async function subirAmbiente(): Promise<Ambiente> {
  const db = abrirBanco(':memory:');
  db.prepare(`INSERT INTO users (id, nome, email, senha_hash, role) VALUES ('admin-1', 'Admin', 'admin@rosan.test', ?, 'admin')`).run(
    hashSenha('Admin12345'),
  );
  const app = criarApp({ db });
  const server: Server = await new Promise((ok) => {
    const s = app.listen(0, () => ok(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    db,
    url: `http://127.0.0.1:${port}`,
    fechar: () => new Promise((ok) => server.close(() => ok())),
  };
}

/** Cliente HTTP com "navegador" próprio (guarda o cookie de sessão). */
export class Navegador {
  cookie = '';
  constructor(private base: string) {}

  async req(metodo: string, caminho: string, corpo?: unknown, opcoes: { semCsrf?: boolean; binario?: Buffer } = {}) {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (!opcoes.semCsrf) headers['X-Rosan'] = '1';
    let body: BodyInit | undefined;
    if (opcoes.binario) {
      headers['Content-Type'] = 'application/octet-stream';
      body = new Uint8Array(opcoes.binario);
    } else if (corpo !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(corpo);
    }
    const r = await fetch(this.base + caminho, { method: metodo, headers, body });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const tipo = r.headers.get('content-type') ?? '';
    const dados = tipo.includes('json') ? await r.json() : await r.arrayBuffer();
    return { status: r.status, dados: dados as any, headers: r.headers };
  }

  get = (c: string) => this.req('GET', c);
  post = (c: string, b?: unknown) => this.req('POST', c, b ?? {});
  put = (c: string, b?: unknown) => this.req('PUT', c, b ?? {});

  async login(email: string, senha: string) {
    const r = await this.post('/api/auth/login', { email, senha });
    if (r.status !== 200) throw new Error(`login falhou: ${r.status} ${JSON.stringify(r.dados)}`);
    return r;
  }

  async importar(clienteId: string, arquivo: Buffer, nome = 'base.xlsx') {
    return this.req('POST', `/api/admin/importacoes/previa?clienteId=${clienteId}&arquivo=${encodeURIComponent(nome)}`, undefined, {
      binario: arquivo,
    });
  }
}

/** Linha de planilha com valores padrão. */
export function linha(p: Partial<LinhaPlanilha>): LinhaPlanilha {
  return {
    Data_Competencia: '05/09/2026',
    Data_Pagamento_Recebimento: '06/09/2026',
    Mes_Referencia: '09/2026',
    Tipo: 'Despesa',
    Categoria: 'Administrativo',
    Subcategoria: 'Aluguel',
    Natureza: 'Fixa',
    Centro_Custo: null,
    Descricao: 'Aluguel',
    Conta: 'Banco',
    Forma_Pagamento: 'Boleto',
    Valor: 1000,
    Observacao: null,
    ...p,
  };
}

export const planilha = (linhas: LinhaPlanilha[]) => gerarPlanilha(linhas);

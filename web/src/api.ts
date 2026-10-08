/** Cliente HTTP da API Rosan. A sessão vai no cookie httpOnly; nunca em localStorage. */

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string, public dados?: unknown) {
    super(mensagem);
  }
}

async function requisicao<T>(metodo: string, caminho: string, corpo?: unknown, binario?: Blob): Promise<T> {
  const headers: Record<string, string> = { 'X-Rosan': '1' };
  let body: BodyInit | undefined;
  if (binario) {
    headers['Content-Type'] = 'application/octet-stream';
    body = binario;
  } else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }
  const r = await fetch(`/api${caminho}`, { method: metodo, headers, body, credentials: 'same-origin' });
  const tipo = r.headers.get('content-type') ?? '';
  const dados = tipo.includes('json') ? await r.json() : null;
  if (!r.ok) {
    if (r.status === 401 && !caminho.startsWith('/auth/')) window.dispatchEvent(new Event('rosan:sessao-expirada'));
    throw new ErroApi(r.status, (dados as { erro?: string })?.erro ?? 'Não foi possível concluir a operação.', dados);
  }
  return dados as T;
}

export const api = {
  get: <T>(c: string) => requisicao<T>('GET', c),
  post: <T>(c: string, b?: unknown) => requisicao<T>('POST', c, b ?? {}),
  put: <T>(c: string, b?: unknown) => requisicao<T>('PUT', c, b ?? {}),
  del: <T>(c: string) => requisicao<T>('DELETE', c),
  enviar: <T>(c: string, arquivo: Blob) => requisicao<T>('POST', c, undefined, arquivo),
};

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { Achado } from '../../../shared/analise';
import { pctSinal, ppSinal } from '../../../shared/formato';
import { api } from '../api';

/* ---------------- dados ---------------- */

const cache = new Map<string, unknown>();

/** Busca dados da API com cache simples por URL. */
export function useDados<T>(url: string | null) {
  const [dados, setDados] = useState<T | null>(() => (url ? (cache.get(url) as T) ?? null : null));
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(!!url && !cache.has(url));
  const atual = useRef(url);

  const carregar = useCallback(async () => {
    if (!url) return;
    atual.current = url;
    setCarregando(true);
    setErro(null);
    try {
      const d = await api.get<T>(url);
      cache.set(url, d);
      if (atual.current === url) setDados(d);
    } catch (e) {
      if (atual.current === url) setErro((e as Error).message);
    } finally {
      if (atual.current === url) setCarregando(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) setDados(cache.get(url) as T);
    carregar();
  }, [url, carregar]);

  return { dados, erro, carregando, recarregar: carregar };
}

export const limparCache = () => cache.clear();

/* ---------------- ícones (poucos, discretos) ---------------- */

export function Icone({ nome }: { nome: 'ok' | 'alerta' | 'ideia' | 'seta-cima' | 'seta-baixo' }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (nome) {
    case 'ok':
      return <svg viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" {...p} /></svg>;
    case 'alerta':
      return <svg viewBox="0 0 16 16" aria-hidden><path d="M8 3.5v5.5M8 12.2v.3" {...p} /></svg>;
    case 'ideia':
      return <svg viewBox="0 0 16 16" aria-hidden><path d="M8 3v6M5 6l3-3 3 3" {...p} transform="rotate(45 8 8)" /></svg>;
    case 'seta-cima':
      return <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden><path d="M6 2l4 6H2z" fill="currentColor" /></svg>;
    case 'seta-baixo':
      return <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden><path d="M6 10L2 4h8z" fill="currentColor" /></svg>;
  }
}

export function IconeEstado({ tipo }: { tipo: Achado['tipo'] }) {
  return (
    <span className="icone-estado" aria-hidden>
      <Icone nome={tipo === 'positivo' ? 'ok' : tipo === 'atencao' ? 'alerta' : 'ideia'} />
    </span>
  );
}

/* ---------------- variação ---------------- */

export function Variacao({
  valor,
  tipo = 'pct',
  subirEhBom = true,
  rotulo,
}: {
  valor: number | null;
  tipo?: 'pct' | 'pp';
  subirEhBom?: boolean;
  rotulo?: string;
}) {
  if (valor === null || !Number.isFinite(valor)) return null;
  const neutro = Math.abs(valor) < 0.0005;
  const bom = valor > 0 === subirEhBom;
  return (
    <span className={`variacao ${neutro ? 'neutro' : bom ? 'bom' : 'ruim'}`}>
      {!neutro && <Icone nome={valor > 0 ? 'seta-cima' : 'seta-baixo'} />}
      {tipo === 'pct' ? pctSinal(valor) : ppSinal(valor)}
      {rotulo && <small>{rotulo}</small>}
    </span>
  );
}

/* ---------------- blocos ---------------- */

export function Secao({
  titulo,
  descricao,
  acoes,
  children,
  id,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="secao" id={id}>
      <header>
        <div>
          <h2>{titulo}</h2>
          {descricao && <p>{descricao}</p>}
        </div>
        {acoes}
      </header>
      {children}
    </section>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <div className="carregando">{texto}</div>;
}

export function Erro({ mensagem }: { mensagem: string }) {
  return <div className="mensagem-erro" role="alert">{mensagem}</div>;
}

export function Leitura({ titulo = 'Leitura Rosan', children }: { titulo?: string; children: ReactNode }) {
  return (
    <div className="leitura">
      <span className="sobretitulo">{titulo}</span>
      {children}
    </div>
  );
}

export function Notas({ notas }: { notas: string[] }) {
  if (!notas.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      {notas.map((n) => (
        <div className="nota" key={n}>
          <span aria-hidden>ⓘ</span>
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

export function Alertas({ alertas }: { alertas: { id: string; rotulo: string; severidade: number }[] }) {
  if (!alertas.length) return null;
  return (
    <div className="alertas" aria-label="Indicadores de atenção">
      <span>Merece atenção</span>
      {alertas.map((a) => (
        <span key={a.id} className={`alerta ${a.severidade < 2 ? 'leve' : ''}`}>
          <i className="ponto" aria-hidden />
          {a.rotulo}
        </span>
      ))}
    </div>
  );
}

export function Etiqueta({ tom, children }: { tom?: 'bom' | 'ruim' | 'neutra'; children: ReactNode }) {
  return <span className={`etiqueta ${tom ?? ''}`}>{children}</span>;
}

export function Ranking({ itens, tom }: { itens: { nome: string; valor: string; fracao: number; detalhe?: string }[]; tom?: 'despesa' }) {
  const max = Math.max(...itens.map((i) => i.fracao), 0.0001);
  return (
    <ol className="ranking">
      {itens.map((i) => (
        <li key={i.nome}>
          <div className="cab">
            <span title={i.nome}>{i.nome}</span>
            <b>
              {i.valor}
              {i.detalhe && <span className="muted" style={{ fontWeight: 400 }}> · {i.detalhe}</span>}
            </b>
          </div>
          <div className={`trilho ${tom ?? ''}`}>
            <div style={{ width: `${(i.fracao / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

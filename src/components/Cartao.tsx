import { useState, type ReactNode } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  className?: string;
  /** Visão em tabela alternativa ao gráfico (acessibilidade e conferência). */
  tabela?: ReactNode;
  children: ReactNode;
}

export function Cartao({ titulo, subtitulo, className = '', tabela, children }: Props) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <section className={`cartao ${className}`}>
      <div className="cartao-topo">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {tabela && (
          <button className="botao-link" onClick={() => setVerTabela((v) => !v)} aria-pressed={verTabela}>
            {verTabela ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        )}
      </div>
      {verTabela && tabela ? <div className="tabela-wrap">{tabela}</div> : children}
    </section>
  );
}

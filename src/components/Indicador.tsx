import type { ReactNode } from 'react';
import { variacao } from '../lib/formato';

interface Props {
  rotulo: string;
  valor: string;
  heroi?: boolean;
  /** Variação vs período anterior (fração). */
  delta?: number | null;
  /** Se subir é bom (receita) ou ruim (despesa). */
  subirEhBom?: boolean;
  detalhe?: ReactNode;
}

export function Indicador({ rotulo, valor, heroi, delta, subirEhBom = true, detalhe }: Props) {
  let deltaEl: ReactNode = null;
  if (delta != null && Number.isFinite(delta)) {
    const bom = delta === 0 ? null : delta > 0 === subirEhBom;
    deltaEl = (
      <span className={`delta ${bom === null ? '' : bom ? 'bom' : 'ruim'}`}>
        {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {variacao(delta)}
      </span>
    );
  }
  return (
    <div className={`cartao tile ${heroi ? 'heroi' : ''}`}>
      <div className="rotulo">{rotulo}</div>
      <div className="valor">{valor}</div>
      {(deltaEl || detalhe) && (
        <div className="detalhe">
          {deltaEl}
          {deltaEl && detalhe ? ' ' : null}
          {detalhe}
        </div>
      )}
    </div>
  );
}

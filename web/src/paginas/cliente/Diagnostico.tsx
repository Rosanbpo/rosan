import type { Achado } from '../../../../shared/analise';
import { Notas, Secao } from '../../components/ui';
import { ComAnalise } from './comum';

function Cadeia({ a }: { a: Achado }) {
  return (
    <dl className="cadeia">
      <dt>O que aconteceu</dt>
      <dd>{a.dado}</dd>
      {a.comparacao && (
        <>
          <dt>Comparação</dt>
          <dd>{a.comparacao}</dd>
        </>
      )}
      {a.impacto && (
        <>
          <dt>Por que importa</dt>
          <dd>{a.impacto}</dd>
        </>
      )}
      <dt>Leitura Rosan</dt>
      <dd>{a.insight}</dd>
      {a.recomendacao && (
        <>
          <dt>Recomendação</dt>
          <dd className="recomenda">{a.recomendacao}</dd>
        </>
      )}
    </dl>
  );
}

export function Diagnostico() {
  return (
    <ComAnalise>
      {(a) => (
        <Secao
          titulo="Diagnóstico Financeiro Rosan"
          descricao="Os pontos específicos que pedem atenção no período, do mais relevante para o menos relevante. Cada um parte dos números da empresa."
        >
          <Notas notas={a.notas} />
          {a.diagnostico.length === 0 ? (
            <div className="painel">
              <h3 style={{ fontFamily: 'var(--serifa)', fontSize: 22 }}>Nenhum problema relevante identificado</h3>
              <p className="secundario" style={{ marginTop: 6 }}>
                Os indicadores do período não apresentam desvios que exijam atenção imediata.
                {a.insights.positivos.length > 0 && ` Destaques: ${a.insights.positivos.map((p) => p.titulo.toLowerCase()).join(', ')}.`}
              </p>
            </div>
          ) : (
            a.diagnostico.map((d, i) => (
              <article className="achado" key={d.id}>
                <div className="topo">
                  <span className="numero">{i + 1}.</span>
                  <h3>{d.titulo}</h3>
                  {d.severidade === 3 && <span className="etiqueta ruim">Crítico</span>}
                </div>
                <Cadeia a={d} />
              </article>
            ))
          )}
        </Secao>
      )}
    </ComAnalise>
  );
}

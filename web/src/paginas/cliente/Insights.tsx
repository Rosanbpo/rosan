import type { Achado } from '../../../../shared/analise';
import { IconeEstado, Secao } from '../../components/ui';
import { ComAnalise } from './comum';

const BLOCOS: { tipo: Achado['tipo']; titulo: string; vazio: string }[] = [
  { tipo: 'positivo', titulo: 'Pontos positivos', vazio: 'Nenhum avanço relevante identificado em relação ao período de comparação.' },
  { tipo: 'atencao', titulo: 'Pontos de atenção', vazio: 'Nenhum ponto de atenção relevante no período.' },
  { tipo: 'oportunidade', titulo: 'Oportunidades', vazio: 'Nenhuma oportunidade específica identificada nos dados do período.' },
];

export function Insights() {
  return (
    <ComAnalise>
      {(a) => {
        const grupos = { positivo: a.insights.positivos, atencao: a.insights.atencao, oportunidade: a.insights.oportunidades };
        return (
          <>
            <Secao titulo="O que a Rosan identifica neste período?" descricao="Leitura objetiva dos números: o que melhorou, o que merece atenção e onde estão as oportunidades.">
              <div className="grade-3">
                {BLOCOS.map((b) => (
                  <section key={b.tipo} className={`coluna-insight ${b.tipo}`}>
                    <header>
                      <IconeEstado tipo={b.tipo} />
                      {b.titulo}
                    </header>
                    {grupos[b.tipo].length === 0 ? (
                      <p className="muted">{b.vazio}</p>
                    ) : (
                      grupos[b.tipo].map((x) => (
                        <div className="insight" key={x.id}>
                          <strong>{x.titulo}</strong>
                          <p>{x.insight}</p>
                          {x.recomendacao && b.tipo !== 'positivo' && <p className="recomenda">{x.recomendacao}</p>}
                        </div>
                      ))
                    )}
                  </section>
                ))}
              </div>
            </Secao>

            <Secao titulo="Prioridades para o próximo período" descricao="Os principais achados transformados em até três frentes de ação.">
              <div className="painel">
                {a.prioridades.length ? (
                  <ol className="prioridades">
                    {a.prioridades.map((p) => (
                      <li key={p.ordem}>
                        <span className="ordem">{String(p.ordem).padStart(2, '0')}</span>
                        <div>
                          <h3>{p.titulo}</h3>
                          <p>{p.texto}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="secundario">Nenhum ponto exige ação prioritária neste período.</p>
                )}
              </div>
            </Secao>
          </>
        );
      }}
    </ComAnalise>
  );
}

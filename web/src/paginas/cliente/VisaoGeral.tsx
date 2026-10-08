import { Link, useLocation } from 'react-router';
import type { AnaliseFinanceira } from '../../../../shared/analise';
import { moedaInteira, pct } from '../../../../shared/formato';
import { GraficoEvolucao } from '../../components/graficos';
import { Alertas, Leitura, Notas, Ranking, Secao, Variacao } from '../../components/ui';
import { ComAnalise } from './comum';

export function Kpis({ a }: { a: AnaliseFinanceira }) {
  const k = a.kpis;
  const rc = a.periodo.temComparacao ? `vs ${a.periodo.rotuloComparacao}` : undefined;
  const pe = a.pontoEquilibrio;
  return (
    <div className="kpis">
      <div className="kpi">
        <span className="rotulo">Faturamento</span>
        <span className="valor">{moedaInteira(k.faturamento.atual)}</span>
        <Variacao valor={k.faturamento.percentual} rotulo={rc} />
        <p className="explica">{a.explicacoes.faturamento.split('. ')[0]}.</p>
      </div>
      <div className="kpi">
        <span className="rotulo">Despesas</span>
        <span className="valor">{moedaInteira(k.despesas.atual)}</span>
        <Variacao valor={k.despesas.percentual} subirEhBom={false} rotulo={rc} />
        <p className="explica">{a.explicacoes.despesas.split('. ')[0]}.</p>
      </div>
      <div className="kpi">
        <span className="rotulo">Resultado</span>
        <span className={`valor ${k.resultado.atual < 0 ? 'negativo' : ''}`}>{moedaInteira(k.resultado.atual)}</span>
        <Variacao valor={k.resultado.percentual} rotulo={rc} />
        <p className="explica">{a.explicacoes.resultado}</p>
      </div>
      <div className="kpi">
        <span className="rotulo">Margem de lucro</span>
        <span className={`valor ${(k.margem.atual ?? 0) < 0 ? 'negativo' : ''}`}>{k.margem.atual === null ? '—' : pct(k.margem.atual)}</span>
        <Variacao valor={k.margem.diferenca} tipo="pp" rotulo={rc} />
        <p className="explica">{a.explicacoes.margem}</p>
      </div>
      <div className="kpi">
        <span className="rotulo">Ponto de equilíbrio</span>
        <span className="valor">{k.pontoEquilibrio.atual === null ? '—' : moedaInteira(k.pontoEquilibrio.atual)}</span>
        {pe.status === 'calculado' && (
          <span className={`variacao ${pe.situacao === 'acima' ? 'bom' : 'ruim'}`}>
            {pe.situacao === 'acima' ? 'Acima do ponto de equilíbrio' : 'Abaixo do ponto de equilíbrio'}
          </span>
        )}
        <p className="explica">
          {pe.status === 'insuficiente'
            ? pe.motivo
            : pe.pontoEquilibrio === null
              ? pe.texto
              : 'Faturamento mínimo para cobrir as despesas fixas e variáveis do período.'}
        </p>
      </div>
    </div>
  );
}

export function VisaoGeral() {
  const { search } = useLocation();
  return (
    <ComAnalise>
      {(a) => (
        <>
          <Alertas alertas={a.alertas.filter((x) => x.severidade >= 2)} />
          <Notas notas={a.notas} />
          <Kpis a={a} />

          <div className="grade-2 secao">
            <div>
              <Leitura titulo="O que os números dizem">
                {a.evolucao.narrativa.slice(0, 2).map((t) => (
                  <p key={t}>{t}</p>
                ))}
                {a.topDespesas.leituras[0] && <p>{a.topDespesas.leituras[0]}</p>}
              </Leitura>
              <div className="painel" style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 12 }}>Evolução dos últimos meses</h3>
                <GraficoEvolucao meses={a.evolucao.meses} altura={240} />
              </div>
            </div>
            <div className="painel">
              <h2 style={{ marginBottom: 6 }}>Prioridades para o próximo período</h2>
              <p className="secundario" style={{ marginBottom: 16 }}>O que merece sua atenção agora, com base nos dados do período.</p>
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
                <p className="secundario">Nenhum ponto exige ação prioritária neste período. Siga acompanhando os indicadores mês a mês.</p>
              )}
              <p style={{ marginTop: 12 }}>
                <Link to={`insights${search}`}>Ver todos os insights →</Link>
              </p>
            </div>
          </div>

          <Secao titulo="Onde está o dinheiro?" descricao="As cinco maiores despesas do período.">
            <div className="painel">
              <Ranking
                tom="despesa"
                itens={a.topDespesas.itens.map((i) => ({
                  nome: `${i.nome} · ${i.categoria}`,
                  valor: moedaInteira(i.valor),
                  detalhe: pct(i.participacao),
                  fracao: i.participacao,
                }))}
              />
              <p style={{ marginTop: 16 }}>
                <Link to={`despesas${search}`}>Ver análise completa das despesas →</Link>
              </p>
            </div>
          </Secao>
        </>
      )}
    </ComAnalise>
  );
}

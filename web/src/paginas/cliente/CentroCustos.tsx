import { moeda, moedaInteira, pct } from '../../../../shared/formato';
import { MiniColunas } from '../../components/graficos';
import { Leitura, Secao, Variacao } from '../../components/ui';
import { ComAnalise } from './comum';

export function CentroCustos() {
  return (
    <ComAnalise>
      {(a) => {
        const c = a.centros;
        if (!c.disponivel) {
          return (
            <div className="nota">
              <span aria-hidden>ⓘ</span>
              <span>{c.mensagem}</span>
            </div>
          );
        }
        const varios = a.evolucao.meses.length > 1;
        return (
          <>
            <Secao titulo="Despesas por centro de custo" descricao="Quanto cada área da empresa consome e como isso evoluiu.">
              <div>
                <div className="painel tabela-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Centro de custo</th>
                        <th className="n">Despesas</th>
                        <th className="n">% total</th>
                        <th className="n">% do faturamento</th>
                        {a.periodo.temComparacao && <th className="n">Variação</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {c.centros.map((x) => (
                        <tr key={x.nome}>
                          <td>{x.nome}</td>
                          <td className="n">{moeda(x.valor)}</td>
                          <td className="n" style={{ minWidth: 150 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                              <div className="trilho despesa" style={{ width: 70 }}><div style={{ width: `${(x.participacao / c.centros[0].participacao) * 100}%` }} /></div>
                              {pct(x.participacao)}
                            </div>
                          </td>
                          <td className="n secundario">{x.sobreFaturamento === null ? '—' : pct(x.sobreFaturamento)}</td>
                          {a.periodo.temComparacao && (
                            <td className="n">{x.variacao === null ? <span className="muted">novo</span> : <Variacao valor={x.variacao} subirEhBom={false} />}</td>
                          )}
                        </tr>
                      ))}
                      {c.semCentro.valor > 0 && (
                        <tr>
                          <td className="muted">Sem centro de custo</td>
                          <td className="n muted">{moeda(c.semCentro.valor)}</td>
                          <td className="n muted">{pct(c.semCentro.participacao)}</td>
                          <td />
                          {a.periodo.temComparacao && <td />}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <Leitura>
                  {c.leituras.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </Leitura>
              </div>
            </Secao>

            {c.semCentro.valor > 0 && (
              <Secao titulo="Despesas ainda não classificadas">
                <div className="painel">
                  <p style={{ fontSize: 18 }}>
                    <strong>{moedaInteira(c.semCentro.valor)}</strong> em despesas não possuem centro de custo informado ({c.semCentro.quantidade} lançamento
                    {c.semCentro.quantidade === 1 ? '' : 's'}).
                  </p>
                  <p className="secundario" style={{ marginTop: 6 }}>
                    Classificar essas despesas permitirá uma visão mais precisa de onde os recursos da empresa estão sendo consumidos.
                  </p>
                </div>
              </Secao>
            )}

            <Secao titulo="Maiores despesas de cada centro">
              <div className="grade-3">
                {c.centros.map((x) => (
                  <div className="painel" key={x.nome} style={{ marginTop: 0 }}>
                    <h3>{x.nome}</h3>
                    <p className="muted" style={{ marginBottom: 12 }}>
                      {moedaInteira(x.valor)} · {pct(x.participacao)} das despesas
                    </p>
                    <ol className="ranking" style={{ gap: 8 }}>
                      {x.maioresDespesas.map((d) => (
                        <li key={d.nome + d.categoria} className="cab" style={{ marginBottom: 0 }}>
                          <span>{d.nome}</span>
                          <b>{moedaInteira(d.valor)}</b>
                        </li>
                      ))}
                    </ol>
                    {varios && (
                      <div style={{ marginTop: 14 }}>
                        <span className="muted" style={{ fontSize: 12 }}>Evolução mensal</span>
                        <MiniColunas dados={x.evolucao} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Secao>
          </>
        );
      }}
    </ComAnalise>
  );
}

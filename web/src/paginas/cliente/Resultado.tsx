import { moeda, pct } from '../../../../shared/formato';
import { nomeMesTitulo } from '../../../../shared/periodos';
import { GraficoEvolucao, GraficoResultado } from '../../components/graficos';
import { Leitura, Secao } from '../../components/ui';
import { ComAnalise } from './comum';
import { Kpis } from './VisaoGeral';

export function Resultado() {
  return (
    <ComAnalise>
      {(a) => {
        const meses = a.evolucao.meses;
        const comDados = meses.filter((m) => m.temDados);
        const tot = comDados.reduce((s, m) => ({ f: s.f + m.faturamento, d: s.d + m.despesas }), { f: 0, d: 0 });
        return (
          <>
            <Kpis a={a} />

            <Secao
              titulo="Evolução Financeira"
              descricao={`Faturamento, despesas e resultado mês a mês${meses.length ? `, de ${nomeMesTitulo(meses[0].mes).toLowerCase()} a ${nomeMesTitulo(meses[meses.length - 1].mes).toLowerCase()}` : ''}.`}
            >
              <div className="painel">
                <GraficoEvolucao meses={meses} />
              </div>
            </Secao>

            <div className="grade-2 secao">
              <Leitura titulo="O que mudou">
                {a.evolucao.narrativa.map((t) => (
                  <p key={t}>{t}</p>
                ))}
                {a.evolucao.sinais.length > 0 && (
                  <div className="sinais" style={{ marginTop: 14 }}>
                    {a.evolucao.sinais.map((s) => (
                      <span key={s.indicador} className={`sinal ${s.favoravel === null ? '' : s.favoravel ? 'bom' : 'ruim'}`}>
                        {s.texto}
                      </span>
                    ))}
                  </div>
                )}
              </Leitura>
              <div className="painel">
                <h3 style={{ marginBottom: 10 }}>Resultado mensal</h3>
                <GraficoResultado meses={meses} />
              </div>
            </div>

            <Secao titulo="Mês a mês">
              <div className="painel tabela-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th className="n">Faturamento</th>
                      <th className="n">Despesas</th>
                      <th className="n">Resultado</th>
                      <th className="n">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...meses].reverse().map((m) => (
                      <tr key={m.mes}>
                        <td>{nomeMesTitulo(m.mes)}</td>
                        {m.temDados ? (
                          <>
                            <td className="n">{moeda(m.faturamento)}</td>
                            <td className="n">{moeda(m.despesas)}</td>
                            <td className={`n ${m.resultado < 0 ? 'negativo' : ''}`}>{moeda(m.resultado)}</td>
                            <td className={`n ${(m.margem ?? 0) < 0 ? 'negativo' : ''}`}>{m.margem === null ? '—' : pct(m.margem)}</td>
                          </>
                        ) : (
                          <td colSpan={4} className="muted">Sem dados importados</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {comDados.length > 1 && (
                    <tfoot>
                      <tr>
                        <td>Total do intervalo</td>
                        <td className="n">{moeda(tot.f)}</td>
                        <td className="n">{moeda(tot.d)}</td>
                        <td className={`n ${tot.f - tot.d < 0 ? 'negativo' : ''}`}>{moeda(tot.f - tot.d)}</td>
                        <td className="n">{tot.f > 0 ? pct((tot.f - tot.d) / tot.f) : '—'}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Secao>
          </>
        );
      }}
    </ComAnalise>
  );
}

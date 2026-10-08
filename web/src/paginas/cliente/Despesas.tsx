import { useState } from 'react';
import { moeda, moedaInteira, pct } from '../../../../shared/formato';
import { Leitura, Ranking, Secao, Variacao } from '../../components/ui';
import { ComAnalise } from './comum';

export function Despesas() {
  const [aberta, setAberta] = useState<string | null>(null);
  return (
    <ComAnalise>
      {(a) => (
        <>
          <Secao titulo="Onde está o dinheiro?" descricao="As cinco maiores despesas do período e quanto cada uma representa do total gasto.">
            <div className="grade-2">
              <div className="painel tabela-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Despesa</th>
                      <th>Categoria</th>
                      <th className="n">Valor</th>
                      <th className="n">% das despesas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.topDespesas.itens.map((i) => (
                      <tr key={`${i.categoria}-${i.nome}`}>
                        <td>{i.nome}</td>
                        <td className="secundario">{i.categoria}</td>
                        <td className="n">{moeda(i.valor)}</td>
                        <td className="n">{pct(i.participacao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="painel">
                <Ranking
                  tom="despesa"
                  itens={a.topDespesas.itens.map((i) => ({ nome: i.nome, valor: moedaInteira(i.valor), fracao: i.participacao, detalhe: pct(i.participacao) }))}
                />
              </div>
            </div>
            {a.topDespesas.leituras.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Leitura titulo="Impacto">
                  {a.topDespesas.leituras.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </Leitura>
              </div>
            )}
          </Secao>

          <Secao
            titulo="Análise por categoria"
            descricao={`Despesas agrupadas pelo plano de contas${a.periodo.temComparacao ? `, comparadas ao ${a.periodo.rotuloComparacao}` : ''}. Clique em uma categoria para ver as subcategorias.`}
          >
            <div className="painel tabela-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th className="n">Valor</th>
                    <th className="n">% do total</th>
                    {a.periodo.temComparacao && <th className="n">Anterior</th>}
                    {a.periodo.temComparacao && <th className="n">Variação</th>}
                  </tr>
                </thead>
                <tbody>
                  {a.categorias.flatMap((c) => {
                    const linhas = [
                      <tr key={c.categoria} className="clicavel" style={{ cursor: 'pointer' }} onClick={() => setAberta(aberta === c.categoria ? null : c.categoria)}>
                        <td>
                          <button className="link" style={{ textDecoration: 'none', color: 'var(--azul)', fontWeight: 600 }} aria-expanded={aberta === c.categoria}>
                            {aberta === c.categoria ? '▾' : '▸'} {c.categoria}
                          </button>
                        </td>
                        <td className="n">{moeda(c.valor)}</td>
                        <td className="n">{pct(c.participacao)}</td>
                        {a.periodo.temComparacao && <td className="n secundario">{c.anterior === null ? '—' : moeda(c.anterior)}</td>}
                        {a.periodo.temComparacao && (
                          <td className="n">{c.variacao === null ? <span className="muted">nova</span> : <Variacao valor={c.variacao} subirEhBom={false} />}</td>
                        )}
                      </tr>,
                    ];
                    if (aberta === c.categoria) {
                      for (const s of c.subcategorias) {
                        linhas.push(
                          <tr key={`${c.categoria}-${s.nome}`}>
                            <td style={{ paddingLeft: 38 }} className="secundario">{s.nome}</td>
                            <td className="n secundario">{moeda(s.valor)}</td>
                            <td className="n muted">{pct(s.participacao)} da categoria</td>
                            {a.periodo.temComparacao && <td />}
                            {a.periodo.temComparacao && <td />}
                          </tr>,
                        );
                      }
                    }
                    return linhas;
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="n">{moeda(a.kpis.despesas.atual)}</td>
                    <td className="n">100%</td>
                    {a.periodo.temComparacao && <td className="n">{moeda(a.kpis.despesas.anterior ?? 0)}</td>}
                    {a.periodo.temComparacao && <td className="n"><Variacao valor={a.kpis.despesas.percentual} subirEhBom={false} /></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Secao>
        </>
      )}
    </ComAnalise>
  );
}

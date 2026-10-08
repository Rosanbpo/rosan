import { moedaInteira, pct } from '../../../../shared/formato';
import { Secao } from '../../components/ui';
import { ComAnalise } from './comum';

export function PontoEquilibrio() {
  return (
    <ComAnalise>
      {(a) => {
        const pe = a.pontoEquilibrio;
        const glossario = (
          <Secao titulo="Entenda os termos">
            <dl className="glossario painel">
              <div>
                <dt>Despesas fixas</dt>
                <dd>Gastos que acontecem mesmo sem vendas, como aluguel, salários e sistemas.</dd>
              </div>
              <div>
                <dt>Despesas variáveis</dt>
                <dd>Gastos que acompanham o volume de vendas, como impostos sobre faturamento, comissões e materiais.</dd>
              </div>
              <div>
                <dt>Margem de contribuição</dt>
                <dd>Quanto da receita permanece disponível depois das despesas variáveis para cobrir as despesas fixas e gerar resultado.</dd>
              </div>
              <div>
                <dt>Ponto de equilíbrio</dt>
                <dd>Faturamento mínimo para pagar todas as despesas consideradas, sem lucro nem prejuízo. Fórmula: despesas fixas ÷ margem de contribuição %.</dd>
              </div>
            </dl>
          </Secao>
        );

        if (pe.status === 'insuficiente') {
          return (
            <>
              <div className="vazio" style={{ textAlign: 'left' }}>
                <h3>Ponto de equilíbrio indisponível</h3>
                <p>{pe.motivo}</p>
              </div>
              {(pe.despesasFixas > 0 || pe.despesasVariaveis > 0 || pe.despesasSemNatureza > 0) && (
                <dl className="numeros" style={{ marginTop: 20 }}>
                  <div><dt>Despesas fixas</dt><dd>{moedaInteira(pe.despesasFixas)}</dd></div>
                  <div><dt>Despesas variáveis</dt><dd>{moedaInteira(pe.despesasVariaveis)}</dd></div>
                  <div><dt>Sem classificação</dt><dd>{moedaInteira(pe.despesasSemNatureza)}</dd></div>
                </dl>
              )}
              {glossario}
            </>
          );
        }

        const acima = pe.situacao === 'acima';
        const ref = Math.max(pe.faturamento, pe.pontoEquilibrio ?? 0) * 1.08 || 1;
        const posPe = pe.pontoEquilibrio !== null ? (pe.pontoEquilibrio / ref) * 100 : null;
        return (
          <>
            <div className={`situacao-pe ${acima ? '' : 'abaixo'}`}>
              <div>
                <span className="sobretitulo" style={{ color: 'var(--marrom-claro)' }}>Situação no período</span>
                <div className="estado">{acima ? 'Acima do ponto de equilíbrio' : 'Abaixo do ponto de equilíbrio'}</div>
              </div>
              <p>{pe.texto}</p>
            </div>

            <div className="painel secao" style={{ marginTop: 20 }}>
              <h3>Faturamento atual × ponto de equilíbrio</h3>
              <div className="regua" role="img" aria-label={`Faturamento de ${moedaInteira(pe.faturamento)}; ponto de equilíbrio de ${pe.pontoEquilibrio === null ? 'inexistente' : moedaInteira(pe.pontoEquilibrio)}`}>
                <div className="barra">
                  <div className="preenchido" style={{ width: `${(pe.faturamento / ref) * 100}%`, background: acima ? 'var(--serie-faturamento)' : 'var(--atencao)' }} />
                  {posPe !== null && (
                    <div className={`marco ${posPe > 70 ? 'direita' : ''}`} style={{ left: `${posPe}%` }}>
                      <span>Ponto de equilíbrio · {moedaInteira(pe.pontoEquilibrio!)}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="secundario">
                Faturamento do período: <strong>{moedaInteira(pe.faturamento)}</strong>
                {pe.distancia !== null && (
                  <>
                    {' · '}
                    {acima ? 'folga de' : 'faltam'} <strong>{moedaInteira(Math.abs(pe.distancia))}</strong> ({pct(Math.abs(pe.distanciaPct!))})
                  </>
                )}
              </p>
            </div>

            <Secao titulo="Como o cálculo foi feito">
              <dl className="numeros">
                <div><dt>Despesas variáveis</dt><dd>{moedaInteira(pe.despesasVariaveis)}</dd></div>
                <div><dt>Margem de contribuição</dt><dd>{moedaInteira(pe.margemContribuicao)}</dd></div>
                <div><dt>Margem de contribuição %</dt><dd>{pct(pe.margemContribuicaoPct)}</dd></div>
                <div><dt>Despesas fixas</dt><dd>{moedaInteira(pe.despesasFixas)}</dd></div>
                <div><dt>Ponto de equilíbrio</dt><dd>{pe.pontoEquilibrio === null ? '—' : moedaInteira(pe.pontoEquilibrio)}</dd></div>
                <div>
                  <dt>Distância até o ponto de equilíbrio</dt>
                  <dd style={{ color: acima ? 'var(--positivo)' : 'var(--atencao)' }}>{pe.distancia === null ? '—' : moedaInteira(pe.distancia)}</dd>
                </div>
              </dl>
              {pe.notas.map((n) => (
                <div className="nota" key={n} style={{ marginTop: 12 }}>
                  <span aria-hidden>ⓘ</span>
                  <span>{n}</span>
                </div>
              ))}
            </Secao>
            {glossario}
          </>
        );
      }}
    </ComAnalise>
  );
}

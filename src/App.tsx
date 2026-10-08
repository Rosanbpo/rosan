import { useEffect, useMemo, useState } from 'react';
import { Cartao } from './components/Cartao';
import { GraficoCategorias, GraficoEntradasSaidas, GraficoResultado } from './components/Graficos';
import { Indicador } from './components/Indicador';
import { fonteDados, type DadosEmpresa, type Empresa, type TipoLancamento } from './data';
import {
  agenda,
  delta,
  despesasPorCategoria,
  fluxoMensal,
  pendentes,
  saldoProjetado,
  saldoTotal,
  totais,
} from './lib/analise';
import { dataBR, hojeISO, rotuloMes, ultimosMeses } from './lib/datas';
import { moeda, moedaCompacta, moedaInteira, percentual } from './lib/formato';

const PERIODOS = [3, 6, 12] as const;
type Periodo = (typeof PERIODOS)[number];
const LIMITE_AGENDA = 12;
type Tema = 'auto' | 'light' | 'dark';

function lerPreferencia<T extends string>(chave: string, padrao: T): T {
  try {
    return (localStorage.getItem(chave) as T) ?? padrao;
  } catch {
    return padrao;
  }
}

function salvarPreferencia(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* armazenamento indisponível: segue sem lembrar */
  }
}

export function App() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState(() => lerPreferencia<string>('empresa', ''));
  const [periodo, setPeriodo] = useState<Periodo>(6);
  const [dados, setDados] = useState<DadosEmpresa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tema, setTema] = useState<Tema>(() => lerPreferencia<Tema>('tema', 'auto'));
  const [filtroAgenda, setFiltroAgenda] = useState<'todos' | TipoLancamento>('todos');
  const [agendaCompleta, setAgendaCompleta] = useState(false);

  useEffect(() => {
    fonteDados.listarEmpresas().then((lista) => {
      setEmpresas(lista);
      setEmpresaId((atual) => (lista.some((e) => e.id === atual) ? atual : lista[0]?.id ?? ''));
    }, (e) => setErro(String(e)));
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    salvarPreferencia('empresa', empresaId);
    setDados(null);
    fonteDados.carregar(empresaId).then(setDados, (e) => setErro(String(e)));
  }, [empresaId]);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'auto') raiz.removeAttribute('data-theme');
    else raiz.setAttribute('data-theme', tema);
    salvarPreferencia('tema', tema);
  }, [tema]);

  const analise = useMemo(() => {
    if (!dados) return null;
    const meses = ultimosMeses(periodo);
    const mesesAnteriores = ultimosMeses(periodo, -periodo);
    const fluxo = fluxoMensal(dados.lancamentos, meses);
    return {
      meses,
      fluxo,
      atual: totais(fluxo),
      anterior: totais(fluxoMensal(dados.lancamentos, mesesAnteriores)),
      categorias: despesasPorCategoria(dados.lancamentos, meses),
      aReceber: pendentes(dados.lancamentos, 'receber'),
      aPagar: pendentes(dados.lancamentos, 'pagar'),
      saldo: saldoTotal(dados),
      projetado: saldoProjetado(dados, 30),
      agenda: agenda(dados.lancamentos, 30),
    };
  }, [dados, periodo]);

  const empresa = empresas.find((e) => e.id === empresaId);
  const agendaFiltrada = analise?.agenda.filter((l) => filtroAgenda === 'todos' || l.tipo === filtroAgenda) ?? [];
  const hoje = hojeISO();

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Dashboard financeiro</h1>
          <p className="sub">
            {empresa?.nome ?? 'Carregando…'}
            {analise && ` · ${rotuloMes(analise.meses[0])} a ${rotuloMes(analise.meses.at(-1)!)}`}
          </p>
        </div>
        <div className="filtros">
          <select
            className="campo"
            aria-label="Empresa"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <div className="segmentado" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p} aria-pressed={periodo === p} onClick={() => setPeriodo(p)}>
                {p} meses
              </button>
            ))}
          </div>
          <select className="campo" aria-label="Tema" value={tema} onChange={(e) => setTema(e.target.value as Tema)}>
            <option value="auto">Tema do sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
      </header>

      {erro && <div className="aviso" role="alert">Não foi possível carregar os dados: {erro}</div>}
      {dados?.exemplo && (
        <div className="aviso">
          Dados de exemplo: os valores são fictícios. Para usar dados reais, implemente a fonte em{" "}
          <code>src/data/index.ts</code>.
        </div>
      )}

      {!analise ? (
        <div className="cartao vazio">Carregando…</div>
      ) : (
        <>
          <div className="indicadores">
            <Indicador
              heroi
              rotulo="Saldo em caixa hoje"
              valor={moedaInteira(analise.saldo)}
              detalhe={<>Projeção em 30 dias: <b>{moedaInteira(analise.projetado)}</b></>}
            />
            <Indicador
              rotulo="Receitas realizadas"
              valor={moedaCompacta(analise.atual.entradas)}
              delta={delta(analise.atual.entradas, analise.anterior.entradas)}
              detalhe="vs período anterior"
            />
            <Indicador
              rotulo="Despesas realizadas"
              valor={moedaCompacta(analise.atual.saidas)}
              delta={delta(analise.atual.saidas, analise.anterior.saidas)}
              subirEhBom={false}
              detalhe="vs período anterior"
            />
            <Indicador
              rotulo="Resultado"
              valor={moedaCompacta(analise.atual.resultado)}
              delta={delta(analise.atual.resultado, analise.anterior.resultado)}
              detalhe={`margem ${percentual(analise.atual.margem)}`}
            />
            <Indicador
              rotulo="A receber"
              valor={moedaCompacta(analise.aReceber.total)}
              detalhe={
                analise.aReceber.quantidadeVencida ? (
                  <span className="alerta">{moedaCompacta(analise.aReceber.vencido)} vencido</span>
                ) : (
                  `${analise.aReceber.quantidade} em aberto`
                )
              }
            />
            <Indicador
              rotulo="A pagar"
              valor={moedaCompacta(analise.aPagar.total)}
              detalhe={
                analise.aPagar.quantidadeVencida ? (
                  <span className="alerta">{moedaCompacta(analise.aPagar.vencido)} vencido</span>
                ) : (
                  `${analise.aPagar.quantidade} em aberto`
                )
              }
            />
          </div>

          <div className="grade">
            <Cartao
              className="col-8"
              titulo="Entradas e saídas"
              subtitulo={`Realizado por mês de pagamento · ${rotuloMes(analise.meses.at(-1)!)} em andamento`}
              tabela={<TabelaFluxo fluxo={analise.fluxo} />}
            >
              <GraficoEntradasSaidas dados={analise.fluxo} />
            </Cartao>

            <Cartao className="col-4" titulo="Saldo por conta" subtitulo={`Total ${moeda(analise.saldo)}`}>
              <ul className="contas">
                {[...dados!.contas].sort((a, b) => b.saldo - a.saldo).map((c) => (
                  <li key={c.nome}>
                    <div className="cab">
                      <span>{c.nome}</span>
                      <b>{moeda(c.saldo)}</b>
                    </div>
                    <div className="trilho">
                      <div style={{ width: `${analise.saldo > 0 ? Math.max(0, (c.saldo / analise.saldo) * 100) : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Cartao>

            <Cartao
              className="col-6"
              titulo="Resultado mensal"
              subtitulo="Entradas menos saídas"
              tabela={<TabelaFluxo fluxo={analise.fluxo} />}
            >
              <GraficoResultado dados={analise.fluxo} />
            </Cartao>

            <Cartao
              className="col-6"
              titulo="Despesas por categoria"
              subtitulo={`Realizado no período · total ${moeda(analise.atual.saidas)}`}
              tabela={
                <table>
                  <thead>
                    <tr><th>Categoria</th><th className="num">Valor</th><th className="num">Participação</th></tr>
                  </thead>
                  <tbody>
                    {analise.categorias.map((c) => (
                      <tr key={c.categoria}>
                        <td>{c.categoria}</td>
                        <td className="num">{moeda(c.valor)}</td>
                        <td className="num">{percentual(c.participacao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <GraficoCategorias dados={analise.categorias} />
            </Cartao>

            <section className="cartao col-12">
              <div className="cartao-topo">
                <div>
                  <h2>Vencimentos</h2>
                  <p>Em atraso e próximos 30 dias</p>
                </div>
                <div className="segmentado" role="group" aria-label="Tipo de lançamento">
                  {(['todos', 'pagar', 'receber'] as const).map((f) => (
                    <button key={f} aria-pressed={filtroAgenda === f} onClick={() => setFiltroAgenda(f)}>
                      {f === 'todos' ? 'Todos' : f === 'pagar' ? 'A pagar' : 'A receber'}
                    </button>
                  ))}
                </div>
              </div>
              {agendaFiltrada.length === 0 ? (
                <div className="vazio">Nada pendente neste período.</div>
              ) : (
                <div className="tabela-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vencimento</th>
                        <th>Tipo</th>
                        <th>Contato</th>
                        <th>Categoria</th>
                        <th>Situação</th>
                        <th className="num">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(agendaCompleta ? agendaFiltrada : agendaFiltrada.slice(0, LIMITE_AGENDA)).map((l) => {
                        const vencido = l.vencimento < hoje;
                        return (
                          <tr key={l.id}>
                            <td>{dataBR(l.vencimento)}</td>
                            <td>
                              <span className="etiqueta">
                                <i style={{ background: l.tipo === 'receber' ? 'var(--series-1)' : 'var(--series-2)' }} />
                                {l.tipo === 'receber' ? 'A receber' : 'A pagar'}
                              </span>
                            </td>
                            <td>{l.contato}</td>
                            <td>{l.categoria}</td>
                            <td>{vencido ? <span className="alerta">Vencido</span> : 'Em aberto'}</td>
                            <td className="num">{moeda(l.valor)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {agendaFiltrada.length > LIMITE_AGENDA && (
                    <button className="botao-link mais" onClick={() => setAgendaCompleta((v) => !v)}>
                      {agendaCompleta ? 'Mostrar menos' : `Mostrar todos (${agendaFiltrada.length})`}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function TabelaFluxo({ fluxo }: { fluxo: ReturnType<typeof fluxoMensal> }) {
  return (
    <table>
      <thead>
        <tr><th>Mês</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Resultado</th></tr>
      </thead>
      <tbody>
        {fluxo.map((p) => (
          <tr key={p.mes}>
            <td>{rotuloMes(p.mes)}</td>
            <td className="num">{moeda(p.entradas)}</td>
            <td className="num">{moeda(p.saidas)}</td>
            <td className="num">{moeda(p.resultado)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

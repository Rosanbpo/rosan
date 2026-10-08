import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams, useSearchParams } from 'react-router';
import type { AnaliseFinanceira } from '../../../shared/analise';
import { mesCurto, nomeMesTitulo, partes, type TipoComparacao, type TipoPeriodo } from '../../../shared/periodos';
import { Carregando, useDados, Vazio } from '../components/ui';
import { useSessao } from '../sessao';

export interface InfoCliente {
  slug: string;
  nome: string;
  logo: string | null;
  demonstrativo: boolean;
  meses: string[];
  ultimoMes: string | null;
  usaCentroCusto: boolean;
}

export interface ContextoCliente {
  info: InfoCliente;
  analise: AnaliseFinanceira | null;
  carregando: boolean;
  erro: string | null;
}

export const useCliente = () => useOutletContext<ContextoCliente>();

const SECOES = [
  { caminho: '', rotulo: 'Visão Geral' },
  { caminho: 'resultado', rotulo: 'Resultado Financeiro' },
  { caminho: 'despesas', rotulo: 'Despesas' },
  { caminho: 'centros-de-custo', rotulo: 'Centro de Custos', soComCentro: true },
  { caminho: 'ponto-de-equilibrio', rotulo: 'Ponto de Equilíbrio' },
  { caminho: 'diagnostico', rotulo: 'Diagnóstico Financeiro' },
  { caminho: 'insights', rotulo: 'Insights Estratégicos' },
  { caminho: 'historico', rotulo: 'Histórico' },
];

const ROTULO_PERIODO: Record<TipoPeriodo, string> = {
  mes: 'Mês',
  trimestre: 'Trimestre',
  semestre: 'Semestre',
  ano: 'Ano',
  personalizado: 'Personalizado',
};

/** Opções de referência para o tipo de período, a partir dos meses com dados. */
function opcoesReferencia(tipo: TipoPeriodo, meses: string[]) {
  const vistos = new Map<string, string>();
  for (const m of [...meses].reverse()) {
    const [a, mm] = partes(m);
    if (tipo === 'mes') vistos.set(m, nomeMesTitulo(m));
    else if (tipo === 'trimestre') {
      const q = Math.floor((mm - 1) / 3);
      const ini = `${a}-${String(q * 3 + 1).padStart(2, '0')}`;
      if (!vistos.has(ini)) vistos.set(ini, `${q + 1}º trimestre/${a}`);
    } else if (tipo === 'semestre') {
      const ini = `${a}-${mm <= 6 ? '01' : '07'}`;
      if (!vistos.has(ini)) vistos.set(ini, `${mm <= 6 ? '1º' : '2º'} semestre/${a}`);
    } else if (tipo === 'ano') {
      if (!vistos.has(`${a}-01`)) vistos.set(`${a}-01`, String(a));
    }
  }
  return [...vistos.entries()];
}

/** Normaliza o mês de referência para o início do bloco do tipo escolhido. */
function inicioDoBloco(tipo: TipoPeriodo, mes: string) {
  const [a, m] = partes(mes);
  if (tipo === 'trimestre') return `${a}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')}`;
  if (tipo === 'semestre') return `${a}-${m <= 6 ? '01' : '07'}`;
  if (tipo === 'ano') return `${a}-01`;
  return mes;
}

export function LayoutCliente() {
  const { slug = '' } = useParams();
  const { usuario, sair } = useSessao();
  const local = useLocation();
  const [busca, setBusca] = useSearchParams();
  const [menuAberto, setMenuAberto] = useState(false);
  const { dados: info, erro: erroInfo, carregando: carregandoInfo } = useDados<InfoCliente>(`/clientes/${slug}`);

  useEffect(() => setMenuAberto(false), [local.pathname]);

  const tipo = (busca.get('periodo') as TipoPeriodo) || 'mes';
  const comparacao = (busca.get('comparacao') as TipoComparacao) || 'anterior';
  const ref = busca.get('ref') || info?.ultimoMes || '';
  const inicio = busca.get('inicio') || info?.meses[0] || '';
  const fim = busca.get('fim') || info?.ultimoMes || '';

  const urlAnalise = useMemo(() => {
    if (!info?.ultimoMes) return null;
    const q = new URLSearchParams({ periodo: tipo, comparacao, ref: inicioDoBloco(tipo, ref) });
    if (tipo === 'personalizado') {
      q.set('inicio', inicio);
      q.set('fim', fim);
    }
    return `/clientes/${slug}/analise?${q}`;
  }, [info?.ultimoMes, slug, tipo, comparacao, ref, inicio, fim]);
  const { dados: analise, carregando, erro } = useDados<AnaliseFinanceira>(urlAnalise);

  const alterar = (mudancas: Record<string, string>) => {
    const q = new URLSearchParams(busca);
    for (const [k, v] of Object.entries(mudancas)) q.set(k, v);
    setBusca(q, { replace: true });
  };

  if (carregandoInfo && !info) return <Carregando />;
  if (erroInfo || !info) {
    return (
      <div className="conteudo">
        <Vazio titulo="Empresa não encontrada">Verifique o endereço ou entre com o usuário da sua empresa.</Vazio>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/">Voltar ao início</Link>
        </p>
      </div>
    );
  }

  const base = `/cliente/${slug}`;
  const sufixo = busca.toString() ? `?${busca}` : '';
  const secaoAtual = SECOES.find((s) => (s.caminho ? local.pathname.startsWith(`${base}/${s.caminho}`) : local.pathname === base || local.pathname === `${base}/`));
  const naHistoria = secaoAtual?.caminho === 'historico';
  const opcoes = opcoesReferencia(tipo, info.meses);
  const n = tipo === 'mes';

  return (
    <div className="estrutura">
      <div className="barra-movel">
        <span className="marca"><b>ROSAN</b></span>
        <button onClick={() => setMenuAberto(true)} aria-expanded={menuAberto}>Menu</button>
      </div>
      <aside className={`lateral ${menuAberto ? 'aberta' : ''}`} onClick={(e) => e.target === e.currentTarget && setMenuAberto(false)}>
        <Link to={base + sufixo} className="marca">
          <b>ROSAN</b>
          <small>Gestão financeira</small>
        </Link>
        {usuario?.role === 'admin' && (
          <Link to="/admin" className="voltar-admin">← Painel Rosan</Link>
        )}
        <div className="empresa">
          {info.logo && <img src={info.logo} alt="" />}
          <span>Empresa</span>
          <strong>{info.nome}</strong>
        </div>
        <nav aria-label="Seções do dashboard">
          <ul className="menu">
            {SECOES.filter((s) => !s.soComCentro || info.usaCentroCusto).map((s, i) => (
              <li key={s.caminho}>
                <NavLink to={`${base}${s.caminho ? `/${s.caminho}` : ''}${sufixo}`} end={!s.caminho}>
                  <span className="indice">{String(i + 1).padStart(2, '0')}</span>
                  {s.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rodape">
          <span>{usuario?.nome}</span>
          <Link to="/trocar-senha">Alterar senha</Link>
          <button onClick={sair}>Sair</button>
        </div>
      </aside>

      <main className="conteudo">
        <header className="cabecalho">
          <div className="sobre">
            <span className="sobretitulo">{secaoAtual?.rotulo ?? 'Dashboard'}</span>
            <h1>{info.nome}</h1>
            {!naHistoria && analise && (
              <p className="periodo">
                Período analisado: <strong>{analise.periodo.rotuloAtual}</strong>
                {analise.periodo.temComparacao && <> · comparado ao {analise.periodo.rotuloComparacao} ({analise.periodo.comparacao && rotuloCurto(analise.periodo.comparacao)})</>}
              </p>
            )}
            {info.demonstrativo && <span className="selo-demo">Dados demonstrativos</span>}
          </div>
          {!naHistoria && info.ultimoMes && (
            <div className="filtros">
              <label className="campo">
                <span>Período</span>
                <select
                  className="entrada"
                  value={tipo}
                  onChange={(e) => alterar({ periodo: e.target.value, ref: inicioDoBloco(e.target.value as TipoPeriodo, info.ultimoMes!) })}
                >
                  {Object.entries(ROTULO_PERIODO).map(([v, r]) => (
                    <option key={v} value={v}>{r}</option>
                  ))}
                </select>
              </label>
              {tipo === 'personalizado' ? (
                <>
                  <label className="campo">
                    <span>De</span>
                    <select className="entrada" value={inicio} onChange={(e) => alterar({ inicio: e.target.value })}>
                      {info.meses.map((m) => <option key={m} value={m}>{mesCurto(m)}</option>)}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Até</span>
                    <select className="entrada" value={fim} onChange={(e) => alterar({ fim: e.target.value })}>
                      {info.meses.filter((m) => m >= inicio).map((m) => <option key={m} value={m}>{mesCurto(m)}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <label className="campo">
                  <span>Referência</span>
                  <select className="entrada" value={inicioDoBloco(tipo, ref)} onChange={(e) => alterar({ ref: e.target.value })}>
                    {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </label>
              )}
              <label className="campo">
                <span>Comparar com</span>
                <select className="entrada" value={comparacao} onChange={(e) => alterar({ comparacao: e.target.value })}>
                  <option value="anterior">{n ? 'Mês anterior' : 'Período anterior'}</option>
                  <option value="ano_anterior">{n ? 'Mesmo mês do ano anterior' : 'Mesmo período do ano anterior'}</option>
                  <option value="acumulado">Acumulado do ano</option>
                </select>
              </label>
            </div>
          )}
        </header>

        {!info.ultimoMes && !naHistoria ? (
          <Vazio titulo="Ainda não existem dados financeiros importados para este período.">
            Assim que a Rosan importar a planilha financeira da empresa, o dashboard será atualizado automaticamente.
          </Vazio>
        ) : (
          <Outlet context={{ info, analise, carregando, erro } satisfies ContextoCliente} />
        )}
      </main>
    </div>
  );
}

function rotuloCurto(i: { inicio: string; fim: string }) {
  return i.inicio === i.fim ? mesCurto(i.inicio) : `${mesCurto(i.inicio)} a ${mesCurto(i.fim)}`;
}

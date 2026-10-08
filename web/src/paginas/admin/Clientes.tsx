import { Link } from 'react-router';
import { moedaInteira, pct } from '../../../../shared/formato';
import { nomeMesTitulo } from '../../../../shared/periodos';
import { Carregando, Erro, Etiqueta, Secao, useDados, Vazio } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';
import { dataHora } from '../cliente/Historico';
import { nomeCliente, type ResumoCliente, StatusCliente } from './Painel';

function useClientes() {
  return useDados<ResumoCliente[]>('/admin/clientes');
}

export function Clientes() {
  const { dados, erro } = useClientes();
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  return (
    <>
      <Cabecalho titulo="Clientes" descricao={`${dados.length} empresa(s) cadastrada(s).`} acoes={<Link className="botao" to="/admin/clientes/novo">Novo cliente</Link>} />
      {dados.length === 0 ? (
        <Vazio titulo="Nenhum cliente cadastrado" />
      ) : (
        <div className="painel tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Status</th>
                <th>Último período</th>
                <th className="n">Faturamento</th>
                <th className="n">Resultado</th>
                <th className="n">Margem</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((c) => (
                <tr key={c.id}>
                  <td>
                    {nomeCliente(c)}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c.usuarios} usuário(s) de acesso · /cliente/{c.slug}
                    </div>
                  </td>
                  <td>{c.status === 'ativo' ? <Etiqueta tom="neutra">Ativo</Etiqueta> : <Etiqueta>Inativo</Etiqueta>}</td>
                  <td>{c.ultimoPeriodo ? nomeMesTitulo(c.ultimoPeriodo) : <span className="muted">Sem dados</span>}</td>
                  <td className="n">{c.ultimoPeriodo ? moedaInteira(c.faturamento) : '—'}</td>
                  <td className={`n ${c.resultado < 0 ? 'negativo' : ''}`}>{c.ultimoPeriodo ? moedaInteira(c.resultado) : '—'}</td>
                  <td className={`n ${(c.margem ?? 0) < 0 ? 'negativo' : ''}`}>{c.margem === null ? '—' : pct(c.margem)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link className="botao pequeno" to={`/cliente/${c.slug}`}>Visualizar Dashboard</Link>
                      <Link className="botao pequeno secundario" to={`/admin/clientes/${c.id}`}>Configurar</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function Dashboards() {
  const { dados, erro } = useClientes();
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  const ativos = dados.filter((c) => c.status === 'ativo');
  return (
    <>
      <Cabecalho titulo="Dashboards" descricao="Acesse o dashboard de qualquer cliente exatamente como ele o vê." />
      <div className="grade-3">
        {ativos.map((c) => (
          <Link key={c.id} to={`/cliente/${c.slug}`} className="painel" style={{ marginTop: 0, textDecoration: 'none', color: 'inherit', display: 'grid', gap: 8 }}>
            <span className="sobretitulo">{c.ultimoPeriodo ? nomeMesTitulo(c.ultimoPeriodo) : 'Sem dados'}</span>
            <h2 style={{ fontSize: 22 }}>{c.nome}</h2>
            {c.ultimoPeriodo ? (
              <p className="secundario">
                Faturamento {moedaInteira(c.faturamento)} · margem {c.margem === null ? '—' : pct(c.margem)}
              </p>
            ) : (
              <p className="muted">Ainda não existem dados financeiros importados.</p>
            )}
            <div><StatusCliente c={c} /></div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function Indicadores() {
  const { dados, erro } = useClientes();
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  const ativos = dados.filter((c) => c.status === 'ativo' && c.ultimoPeriodo);
  return (
    <>
      <Cabecalho titulo="Indicadores" descricao="Comparativo dos clientes ativos no último mês com dados de cada um." />
      <Secao titulo="Indicadores por cliente">
        <div className="painel tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Período</th>
                <th className="n">Faturamento</th>
                <th className="n">Despesas</th>
                <th className="n">Resultado</th>
                <th className="n">Margem</th>
                <th>Ponto de equilíbrio</th>
                <th>Alertas</th>
                <th>Última importação</th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/cliente/${c.slug}`}>{c.nome}</Link></td>
                  <td>{nomeMesTitulo(c.ultimoPeriodo!)}</td>
                  <td className="n">{moedaInteira(c.faturamento)}</td>
                  <td className="n">{moedaInteira(c.despesas)}</td>
                  <td className={`n ${c.resultado < 0 ? 'negativo' : ''}`}>{moedaInteira(c.resultado)}</td>
                  <td className={`n ${(c.margem ?? 0) < 0 ? 'negativo' : ''}`}>{c.margem === null ? '—' : pct(c.margem)}</td>
                  <td>
                    {c.abaixoPE === null ? <span className="muted">Dados insuficientes</span> : c.abaixoPE ? <Etiqueta tom="ruim">Abaixo</Etiqueta> : <Etiqueta tom="bom">Acima</Etiqueta>}
                  </td>
                  <td className="secundario" style={{ whiteSpace: 'normal', minWidth: 200 }}>{c.alertas.length ? c.alertas.join(' · ') : '—'}</td>
                  <td>{dataHora(c.ultimaImportacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </>
  );
}

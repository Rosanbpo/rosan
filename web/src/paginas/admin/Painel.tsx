import { Link, useNavigate } from 'react-router';
import { moedaInteira, pct } from '../../../../shared/formato';
import { nomeMesTitulo } from '../../../../shared/periodos';
import { Carregando, Erro, Etiqueta, Secao, useDados, Vazio } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';

export interface ResumoCliente {
  id: string;
  slug: string;
  nome: string;
  cnpj: string | null;
  status: 'ativo' | 'inativo';
  demonstrativo: boolean;
  usuarios: number;
  ultimaImportacao: string | null;
  ultimoPeriodo: string | null;
  faturamento: number;
  despesas: number;
  resultado: number;
  margem: number | null;
  abaixoPE: boolean | null;
  atencao: boolean;
  alertas: string[];
  atualizado: boolean;
  semDadosRecentes: boolean;
}

interface PainelDados {
  indicadores: Record<'total' | 'ativos' | 'atualizados' | 'atencao' | 'margemNegativa' | 'abaixoPE' | 'semDadosRecentes', number>;
  clientes: ResumoCliente[];
}

export function StatusCliente({ c }: { c: ResumoCliente }) {
  if (c.status === 'inativo') return <Etiqueta>Inativo</Etiqueta>;
  if (!c.ultimoPeriodo) return <Etiqueta>Sem dados</Etiqueta>;
  if (c.atencao) return <Etiqueta tom="ruim">Atenção · {c.alertas[0]}</Etiqueta>;
  if (c.semDadosRecentes) return <Etiqueta>Sem dados recentes</Etiqueta>;
  if (c.alertas.length) return <Etiqueta tom="neutra">{c.alertas[0]}</Etiqueta>;
  return <Etiqueta tom="bom">Saudável</Etiqueta>;
}

export const nomeCliente = (c: { nome: string; demonstrativo: boolean }) => (
  <>
    {c.nome}
    {c.demonstrativo && <span className="muted" style={{ fontSize: 12 }}> · demonstrativo</span>}
  </>
);

export function Painel() {
  const { dados, erro } = useDados<PainelDados>('/admin/painel');
  const nav = useNavigate();
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  const i = dados.indicadores;
  const itens: [string, number, boolean?][] = [
    ['Total de clientes', i.total],
    ['Clientes ativos', i.ativos],
    ['Com dados atualizados', i.atualizados],
    ['Com atenção financeira', i.atencao, true],
    ['Com margem negativa', i.margemNegativa, true],
    ['Abaixo do ponto de equilíbrio', i.abaixoPE, true],
    ['Sem dados recentes', i.semDadosRecentes, true],
  ];
  return (
    <>
      <Cabecalho
        titulo="Painel Rosan"
        descricao="Visão geral da carteira de clientes no último período importado de cada empresa."
        acoes={
          <>
            <Link className="botao secundario" to="/admin/importar">Importar dados</Link>
            <Link className="botao" to="/admin/clientes/novo">Novo cliente</Link>
          </>
        }
      />
      <dl className="indicadores-rosan">
        {itens.map(([r, v, alerta]) => (
          <div key={r}>
            <dt>{r}</dt>
            <dd className={alerta && v > 0 ? 'alerta-num' : ''}>{v}</dd>
          </div>
        ))}
      </dl>

      <Secao titulo="Clientes" descricao="Resultado do último mês com dados de cada cliente. Clique para abrir o dashboard.">
        {dados.clientes.length === 0 ? (
          <Vazio titulo="Nenhum cliente cadastrado">Cadastre o primeiro cliente para começar.</Vazio>
        ) : (
          <div className="painel tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Último período</th>
                  <th className="n">Faturamento</th>
                  <th className="n">Despesas</th>
                  <th className="n">Resultado</th>
                  <th className="n">Margem</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dados.clientes.map((c) => (
                  <tr key={c.id} className="clicavel" style={{ cursor: 'pointer' }} onClick={() => nav(`/cliente/${c.slug}`)}>
                    <td>{nomeCliente(c)}</td>
                    <td>{c.ultimoPeriodo ? nomeMesTitulo(c.ultimoPeriodo) : <span className="muted">—</span>}</td>
                    <td className="n">{c.ultimoPeriodo ? moedaInteira(c.faturamento) : '—'}</td>
                    <td className="n">{c.ultimoPeriodo ? moedaInteira(c.despesas) : '—'}</td>
                    <td className={`n ${c.resultado < 0 ? 'negativo' : ''}`}>{c.ultimoPeriodo ? moedaInteira(c.resultado) : '—'}</td>
                    <td className={`n ${(c.margem ?? 0) < 0 ? 'negativo' : ''}`}>{c.margem === null ? '—' : pct(c.margem)}</td>
                    <td><StatusCliente c={c} /></td>
                    <td className="n">
                      <Link className="botao pequeno secundario" style={{ whiteSpace: 'normal', height: 'auto', padding: '6px 12px', lineHeight: 1.3 }} to={`/cliente/${c.slug}`} onClick={(e) => e.stopPropagation()}>
                        Visualizar Dashboard
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </>
  );
}

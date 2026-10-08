import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { pct } from '../../../../shared/formato';
import type { Premissas } from '../../../../shared/analise';
import { api } from '../../api';
import { Carregando, Erro, Etiqueta, Secao, useDados } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';

interface CentrosCliente {
  id: string;
  slug: string;
  nome: string;
  usaCentroCusto: boolean;
  centros: { id: string; nome: string; status: string }[];
}

export function CentrosAdmin() {
  const { dados, erro } = useDados<CentrosCliente[]>('/admin/centros');
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  return (
    <>
      <Cabecalho titulo="Centros de Custo" descricao="Estrutura de centros de custo de cada cliente. Cada empresa possui a sua." />
      <div className="painel tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Centros cadastrados</th>
              <th>Análise por centro</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dados.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td style={{ whiteSpace: 'normal' }}>
                  {c.centros.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {c.centros.map((x) => <Etiqueta key={x.id} tom={x.status === 'ativo' ? 'neutra' : undefined}>{x.nome}</Etiqueta>)}
                    </div>
                  ) : (
                    <span className="muted">Não utiliza</span>
                  )}
                </td>
                <td>{c.usaCentroCusto ? <Etiqueta tom="bom">Disponível</Etiqueta> : <span className="muted">Sem lançamentos classificados</span>}</td>
                <td className="n">
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {c.usaCentroCusto && <Link className="botao pequeno" to={`/cliente/${c.slug}/centros-de-custo`}>Ver análise</Link>}
                    <Link className="botao pequeno secundario" to={`/admin/clientes/${c.id}`}>Gerenciar</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Configuracoes() {
  const { dados: plano } = useDados<{ tipo: string; categoria: string; subcategoria: string }[]>('/admin/plano-padrao');
  const { dados: premissas } = useDados<{ valores: Premissas; descricao: Record<keyof Premissas, { rotulo: string; ajuda: string }> }>('/admin/premissas-padrao');
  const { dados: admins, recarregar } = useDados<{ id: string; nome: string; email: string; ativo: number }[]>('/admin/administradores');
  const [novo, setNovo] = useState({ nome: '', email: '', senha: '' });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const grupos = new Map<string, string[]>();
  for (const p of plano ?? []) {
    const k = `${p.tipo === 'receita' ? 'Receita' : 'Despesa'} · ${p.categoria}`;
    grupos.set(k, [...(grupos.get(k) ?? []), p.subcategoria]);
  }

  const criarAdmin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/administradores', novo);
      setMsg({ ok: true, texto: 'Administrador criado. A troca de senha será pedida no primeiro acesso.' });
      setNovo({ nome: '', email: '', senha: '' });
      recarregar();
    } catch (er) {
      setMsg({ ok: false, texto: (er as Error).message });
    }
  };

  return (
    <>
      <Cabecalho titulo="Configurações" descricao="Estruturas padrão Rosan e acesso da equipe." acoes={<a className="botao secundario" href="/api/modelo-planilha">Baixar modelo da planilha</a>} />

      <Secao titulo="Plano de contas padrão Rosan" descricao="Estrutura copiada para cada novo cliente. O plano de cada cliente pode ser adaptado em Clientes → Configurar.">
        <div className="painel grade-2">
          {[...grupos.entries()].map(([g, subs]) => (
            <div key={g}>
              <h3>{g}</h3>
              <p className="secundario">{subs.join(', ')}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Premissas padrão do diagnóstico" descricao="Valores usados quando o cliente não tem premissas próprias.">
        <div className="painel tabela-wrap">
          {premissas && (
            <table>
              <tbody>
                {(Object.keys(premissas.descricao) as (keyof Premissas)[]).map((k) => (
                  <tr key={k}>
                    <td>
                      <strong>{premissas.descricao[k].rotulo}</strong>
                      <div className="muted" style={{ fontSize: 12.5 }}>{premissas.descricao[k].ajuda}</div>
                    </td>
                    <td className="n">{pct(premissas.valores[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Secao>

      <Secao titulo="Equipe Rosan" descricao="Administradores têm acesso a todos os clientes.">
        <div className="painel">
          <table>
            <tbody>
              {admins?.map((a) => (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td className="secundario">{a.email}</td>
                  <td>{a.ativo ? <Etiqueta tom="bom">Ativo</Etiqueta> : <Etiqueta>Bloqueado</Etiqueta>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={criarAdmin} style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Novo administrador</h3>
            <div className="formulario">
              <label className="campo">
                <span>Nome</span>
                <input className="entrada" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              </label>
              <label className="campo">
                <span>E-mail</span>
                <input className="entrada" type="email" required value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
              </label>
              <label className="campo inteiro">
                <span>Senha provisória</span>
                <input className="entrada" required autoComplete="new-password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
              </label>
            </div>
            <div className="acoes">
              <button className="botao">Criar administrador</button>
            </div>
            {msg && <div className={msg.ok ? 'mensagem-ok' : 'mensagem-erro'} style={{ marginTop: 12 }}>{msg.texto}</div>}
          </form>
        </div>
      </Secao>
    </>
  );
}

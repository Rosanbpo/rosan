import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Premissas } from '../../../../shared/analise';
import { api } from '../../api';
import { Carregando, Erro, Etiqueta, limparCache, useDados } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';
import { CamposEmpresa, type DadosEmpresa } from './ClienteForm';

interface Detalhe extends DadosEmpresa {
  id: string;
  slug: string;
  demonstrativo: boolean;
  logo: string | null;
  usuarios: { id: string; nome: string; email: string; ativo: number; trocarSenha: number }[];
  centros: { id: string; nome: string; status: string }[];
  plano: { id: string; tipo: string; categoria: string; subcategoria: string }[];
  premissas: Premissas;
}

const ABAS = ['Dados da empresa', 'Acesso', 'Centros de custo', 'Plano de contas', 'Premissas', 'Logo'] as const;

function useAcao(recarregar: () => void) {
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const executar = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      limparCache();
      setMsg({ tipo: 'ok', texto: ok });
      recarregar();
      return true;
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
      return false;
    }
  };
  const aviso = msg && <div className={msg.tipo === 'ok' ? 'mensagem-ok' : 'mensagem-erro'} style={{ marginTop: 14 }}>{msg.texto}</div>;
  return { executar, aviso };
}

export function ClienteDetalhe() {
  const { id } = useParams();
  const { dados, erro, recarregar } = useDados<Detalhe>(`/admin/clientes/${id}`);
  const [aba, setAba] = useState<(typeof ABAS)[number]>('Dados da empresa');
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  return (
    <>
      <Cabecalho
        sobre="Configurações do cliente"
        titulo={dados.nome}
        descricao={`Link de acesso: ${window.location.origin}/cliente/${dados.slug} (exige login)`}
        acoes={
          <>
            <Link className="botao secundario" to={`/admin/importar?cliente=${dados.id}`}>Importar dados</Link>
            <Link className="botao" to={`/cliente/${dados.slug}`}>Visualizar Dashboard</Link>
          </>
        }
      />
      <div className="abas" role="tablist">
        {ABAS.map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} className={aba === a ? 'ativa' : ''} onClick={() => setAba(a)}>
            {a}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 900 }}>
        {aba === 'Dados da empresa' && <AbaDados d={dados} recarregar={recarregar} />}
        {aba === 'Acesso' && <AbaAcesso d={dados} recarregar={recarregar} />}
        {aba === 'Centros de custo' && <AbaCentros d={dados} recarregar={recarregar} />}
        {aba === 'Plano de contas' && <AbaPlano d={dados} recarregar={recarregar} />}
        {aba === 'Premissas' && <AbaPremissas d={dados} recarregar={recarregar} />}
        {aba === 'Logo' && <AbaLogo d={dados} recarregar={recarregar} />}
      </div>
    </>
  );
}

type PropsAba = { d: Detalhe; recarregar: () => void };

function AbaDados({ d, recarregar }: PropsAba) {
  const [v, setV] = useState<DadosEmpresa>({ ...d, cnpj: d.cnpj ?? '', responsavel: d.responsavel ?? '', email: d.email ?? '', telefone: d.telefone ?? '', periodoInicial: d.periodoInicial ?? '' });
  const { executar, aviso } = useAcao(recarregar);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    executar(() => api.put(`/admin/clientes/${d.id}`, v), v.status === 'inativo' ? 'Cliente desativado: o acesso dos usuários foi bloqueado.' : 'Dados salvos.');
  };
  return (
    <form className="painel" onSubmit={salvar}>
      <CamposEmpresa v={v} set={setV} />
      {d.demonstrativo && <p className="muted" style={{ marginTop: 14 }}>Cliente demonstrativo: não recebe importações reais.</p>}
      {aviso}
      <div className="acoes">
        <button className="botao">Salvar</button>
      </div>
    </form>
  );
}

function AbaAcesso({ d, recarregar }: PropsAba) {
  const [novo, setNovo] = useState({ nome: '', email: '', senha: '' });
  const [senhas, setSenhas] = useState<Record<string, string>>({});
  const { executar, aviso } = useAcao(recarregar);
  return (
    <>
      <div className="painel tabela-wrap">
        <h3 style={{ marginBottom: 12 }}>Usuários com acesso a esta empresa</h3>
        {d.usuarios.length === 0 ? (
          <p className="muted">Nenhum usuário cadastrado. Crie um acesso abaixo.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Situação</th>
                <th>Redefinir senha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.nome}
                    <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td>
                    {u.ativo ? <Etiqueta tom="bom">Ativo</Etiqueta> : <Etiqueta>Bloqueado</Etiqueta>}
                    {u.trocarSenha ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Senha provisória</div> : null}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="entrada"
                        style={{ height: 32, width: 150 }}
                        placeholder="Nova senha"
                        value={senhas[u.id] ?? ''}
                        onChange={(e) => setSenhas({ ...senhas, [u.id]: e.target.value })}
                      />
                      <button
                        className="botao pequeno secundario"
                        disabled={!senhas[u.id]}
                        onClick={() => executar(() => api.put(`/admin/usuarios/${u.id}`, { novaSenha: senhas[u.id] }), `Senha de ${u.nome} redefinida. Será pedida a troca no próximo acesso.`).then((ok) => ok && setSenhas({ ...senhas, [u.id]: '' }))}
                      >
                        Redefinir
                      </button>
                    </div>
                  </td>
                  <td className="n">
                    <button
                      className={`botao pequeno ${u.ativo ? 'perigo' : 'secundario'}`}
                      onClick={() => executar(() => api.put(`/admin/usuarios/${u.id}`, { ativo: !u.ativo }), u.ativo ? 'Acesso bloqueado.' : 'Acesso reativado.')}
                    >
                      {u.ativo ? 'Bloquear' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form
        className="painel"
        onSubmit={(e) => {
          e.preventDefault();
          executar(() => api.post(`/admin/clientes/${d.id}/usuarios`, novo), 'Usuário criado.').then((ok) => ok && setNovo({ nome: '', email: '', senha: '' }));
        }}
      >
        <h3 style={{ marginBottom: 14 }}>Novo usuário de acesso</h3>
        <div className="formulario">
          <label className="campo">
            <span>Nome</span>
            <input className="entrada" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </label>
          <label className="campo">
            <span>E-mail de login</span>
            <input className="entrada" type="email" required value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          </label>
          <label className="campo inteiro">
            <span>Senha provisória (mín. 8 caracteres, letras e números)</span>
            <input className="entrada" required autoComplete="new-password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
          </label>
        </div>
        <div className="acoes">
          <button className="botao">Criar acesso</button>
        </div>
      </form>
      {aviso}
    </>
  );
}

function AbaCentros({ d, recarregar }: PropsAba) {
  const [nome, setNome] = useState('');
  const { executar, aviso } = useAcao(recarregar);
  return (
    <div className="painel">
      <p className="secundario" style={{ marginBottom: 16 }}>
        Cada empresa tem sua própria estrutura. Centros novos encontrados na planilha são cadastrados automaticamente na importação.
      </p>
      {d.centros.length === 0 ? (
        <p className="muted">Nenhum centro de custo cadastrado. A análise por centro de custo aparece quando os lançamentos forem classificados.</p>
      ) : (
        <table>
          <tbody>
            {d.centros.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.status === 'ativo' ? <Etiqueta tom="bom">Ativo</Etiqueta> : <Etiqueta>Inativo</Etiqueta>}</td>
                <td className="n">
                  <button
                    className="botao pequeno secundario"
                    onClick={() => executar(() => api.put(`/admin/clientes/${d.id}/centros/${c.id}`, { status: c.status === 'ativo' ? 'inativo' : 'ativo' }), 'Centro atualizado.')}
                  >
                    {c.status === 'ativo' ? 'Inativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          executar(() => api.post(`/admin/clientes/${d.id}/centros`, { nome }), 'Centro de custo criado.').then((ok) => ok && setNome(''));
        }}
      >
        <input className="entrada" placeholder="Ex.: Loja 01, Unidade Recife, Comercial" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ flex: '1 1 260px' }} />
        <button className="botao">Adicionar centro</button>
      </form>
      {aviso}
    </div>
  );
}

function AbaPlano({ d, recarregar }: PropsAba) {
  const [novo, setNovo] = useState({ tipo: 'despesa', categoria: '', subcategoria: '' });
  const { executar, aviso } = useAcao(recarregar);
  const grupos = new Map<string, Detalhe['plano']>();
  for (const p of d.plano) {
    const k = `${p.tipo === 'receita' ? 'Receita' : 'Despesa'} · ${p.categoria}`;
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  return (
    <>
      <div className="painel">
        <p className="secundario" style={{ marginBottom: 16 }}>
          Plano de contas do cliente, criado a partir da estrutura padrão Rosan. Categorias novas da planilha são adicionadas automaticamente.
        </p>
        <div className="grade-2">
          {[...grupos.entries()].map(([g, itens]) => (
            <div key={g}>
              <h3 style={{ marginBottom: 6 }}>{g}</h3>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {itens.map((i) => (
                  <li key={i.id} className="etiqueta" style={{ gap: 4 }}>
                    {i.subcategoria || '(sem subcategoria)'}
                    <button
                      className="link"
                      style={{ textDecoration: 'none', color: 'var(--tinta-3)' }}
                      aria-label={`Remover ${i.subcategoria}`}
                      onClick={() => executar(() => api.del(`/admin/clientes/${d.id}/plano/${i.id}`), 'Item removido.')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <form
        className="painel"
        onSubmit={(e) => {
          e.preventDefault();
          executar(() => api.post(`/admin/clientes/${d.id}/plano`, novo), 'Item adicionado.').then((ok) => ok && setNovo({ ...novo, subcategoria: '' }));
        }}
      >
        <h3 style={{ marginBottom: 14 }}>Adicionar categoria ou subcategoria</h3>
        <div className="formulario">
          <label className="campo">
            <span>Tipo</span>
            <select className="entrada" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </label>
          <label className="campo">
            <span>Categoria</span>
            <input className="entrada" required list="categorias" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })} />
            <datalist id="categorias">
              {[...new Set(d.plano.map((p) => p.categoria))].map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="campo inteiro">
            <span>Subcategoria</span>
            <input className="entrada" value={novo.subcategoria} onChange={(e) => setNovo({ ...novo, subcategoria: e.target.value })} />
          </label>
        </div>
        <div className="acoes">
          <button className="botao">Adicionar</button>
        </div>
        {aviso}
      </form>
    </>
  );
}

function AbaPremissas({ d, recarregar }: PropsAba) {
  const { dados: padrao } = useDados<{ valores: Premissas; descricao: Record<keyof Premissas, { rotulo: string; ajuda: string }> }>('/admin/premissas-padrao');
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    setV(Object.fromEntries(Object.entries(d.premissas).map(([k, x]) => [k, String(Math.round(x * 1000) / 10)])));
  }, [d.premissas]);
  const { executar, aviso } = useAcao(recarregar);
  if (!padrao) return <Carregando />;
  return (
    <form
      className="painel"
      onSubmit={(e) => {
        e.preventDefault();
        const corpo = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x.replace(',', '.')) / 100]));
        executar(() => api.put(`/admin/clientes/${d.id}/premissas`, corpo), 'Premissas salvas. As análises já usam os novos valores.');
      }}
    >
      <p className="secundario" style={{ marginBottom: 18 }}>
        Parâmetros usados pelo diagnóstico automático deste cliente. Valores em percentual.
      </p>
      <div className="formulario">
        {(Object.keys(padrao.descricao) as (keyof Premissas)[]).map((k) => (
          <label className="campo" key={k}>
            <span>
              {padrao.descricao[k].rotulo} (padrão {Math.round(padrao.valores[k] * 1000) / 10}%)
            </span>
            <input className="entrada" inputMode="decimal" value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            <small className="muted">{padrao.descricao[k].ajuda}</small>
          </label>
        ))}
      </div>
      <div className="acoes">
        <button className="botao">Salvar premissas</button>
      </div>
      {aviso}
    </form>
  );
}

function AbaLogo({ d, recarregar }: PropsAba) {
  const { executar, aviso } = useAcao(recarregar);
  const enviar = (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (arquivo.size > 300 * 1024) {
      alert('Envie uma imagem de até 300 KB.');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => executar(() => api.put(`/admin/clientes/${d.id}/logo`, { logo: leitor.result }), 'Logo atualizada.');
    leitor.readAsDataURL(arquivo);
  };
  return (
    <div className="painel">
      {d.logo ? <img src={d.logo} alt="Logo atual" style={{ maxHeight: 80, maxWidth: 240, marginBottom: 16 }} /> : <p className="muted" style={{ marginBottom: 16 }}>Nenhuma logo cadastrada.</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label className="botao secundario">
          Escolher imagem (PNG, JPG ou WEBP)
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => enviar(e.target.files?.[0])} />
        </label>
        {d.logo && (
          <button className="botao perigo" onClick={() => executar(() => api.put(`/admin/clientes/${d.id}/logo`, { logo: null }), 'Logo removida.')}>
            Remover logo
          </button>
        )}
      </div>
      {aviso}
    </div>
  );
}

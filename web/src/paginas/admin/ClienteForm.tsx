import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api';
import { limparCache } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';

export interface DadosEmpresa {
  nome: string;
  cnpj: string;
  responsavel: string;
  email: string;
  telefone: string;
  status: 'ativo' | 'inativo';
  periodoInicial: string;
}

export const empresaVazia: DadosEmpresa = { nome: '', cnpj: '', responsavel: '', email: '', telefone: '', status: 'ativo', periodoInicial: '' };

export function CamposEmpresa({ v, set }: { v: DadosEmpresa; set: (v: DadosEmpresa) => void }) {
  const campo = (k: keyof DadosEmpresa) => ({ value: v[k] ?? '', onChange: (e: { target: { value: string } }) => set({ ...v, [k]: e.target.value }) });
  return (
    <div className="formulario">
      <label className="campo inteiro">
        <span>Nome da empresa *</span>
        <input className="entrada" required maxLength={160} {...campo('nome')} />
      </label>
      <label className="campo">
        <span>CNPJ</span>
        <input className="entrada" inputMode="numeric" placeholder="00.000.000/0000-00" {...campo('cnpj')} />
      </label>
      <label className="campo">
        <span>Nome do responsável</span>
        <input className="entrada" {...campo('responsavel')} />
      </label>
      <label className="campo">
        <span>E-mail</span>
        <input className="entrada" type="email" {...campo('email')} />
      </label>
      <label className="campo">
        <span>Telefone</span>
        <input className="entrada" type="tel" {...campo('telefone')} />
      </label>
      <label className="campo">
        <span>Status</span>
        <select className="entrada" {...campo('status')}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </label>
      <label className="campo">
        <span>Período inicial</span>
        <input className="entrada" type="month" {...campo('periodoInicial')} />
      </label>
    </div>
  );
}

export function NovoCliente() {
  const nav = useNavigate();
  const [empresa, setEmpresa] = useState<DadosEmpresa>(empresaVazia);
  const [usuario, setUsuario] = useState({ nome: '', email: '', senha: '' });
  const [criarAcesso, setCriarAcesso] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await api.post<{ id: string }>('/admin/clientes', { ...empresa, usuario: criarAcesso ? usuario : undefined });
      limparCache();
      nav(`/admin/clientes/${r.id}`);
    } catch (er) {
      setErro((er as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Cabecalho sobre="Clientes" titulo="Novo cliente" descricao="Cadastre a empresa e o usuário que acessará o dashboard." />
      <form onSubmit={enviar} style={{ maxWidth: 820 }}>
        <div className="painel">
          <h3 style={{ marginBottom: 16 }}>Dados da empresa</h3>
          <CamposEmpresa v={empresa} set={setEmpresa} />
        </div>
        <div className="painel">
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <input type="checkbox" checked={criarAcesso} onChange={(e) => setCriarAcesso(e.target.checked)} />
            <h3>Criar usuário de acesso agora</h3>
          </label>
          {criarAcesso && (
            <div className="formulario">
              <label className="campo">
                <span>Nome do usuário *</span>
                <input className="entrada" required value={usuario.nome} onChange={(e) => setUsuario({ ...usuario, nome: e.target.value })} />
              </label>
              <label className="campo">
                <span>E-mail de login *</span>
                <input className="entrada" type="email" required value={usuario.email} onChange={(e) => setUsuario({ ...usuario, email: e.target.value })} />
              </label>
              <label className="campo inteiro">
                <span>Senha provisória * (mín. 8 caracteres, letras e números; será trocada no primeiro acesso)</span>
                <input className="entrada" type="text" autoComplete="new-password" required value={usuario.senha} onChange={(e) => setUsuario({ ...usuario, senha: e.target.value })} />
              </label>
            </div>
          )}
        </div>
        {erro && <div className="mensagem-erro" style={{ marginTop: 16 }}>{erro}</div>}
        <div className="acoes">
          <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Cadastrar cliente'}</button>
          <button type="button" className="botao secundario" onClick={() => nav(-1)}>Cancelar</button>
        </div>
      </form>
    </>
  );
}

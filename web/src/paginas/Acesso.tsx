import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../api';
import { destinoInicial, useSessao } from '../sessao';

function LadoMarca() {
  return (
    <div className="lado-marca">
      <span className="marca">
        <b>ROSAN</b>
        <small>Gestão financeira</small>
      </span>
      <blockquote>
        A Rosan não apenas organiza os números. <span>Ajuda o empresário a entender o que eles estão dizendo.</span>
      </blockquote>
      <small style={{ opacity: 0.6 }}>Ambiente seguro · acesso individual por empresa</small>
    </div>
  );
}

export function Login() {
  const { usuario, entrar } = useSessao();
  const nav = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={usuario.trocarSenha ? '/trocar-senha' : destinoInicial(usuario)} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const u = await entrar(email, senha);
      const pedido = (local.state as { de?: string } | null)?.de;
      // só segue o link pedido se ele pertencer a este usuário (o servidor também valida)
      const permitido = pedido && (u.role === 'admin' || pedido.startsWith(`/cliente/${u.clienteSlug}`));
      nav(u.trocarSenha ? '/trocar-senha' : permitido ? pedido! : destinoInicial(u), { replace: true });
    } catch (er) {
      setErro((er as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="acesso">
      <LadoMarca />
      <div className="lado-form">
        <form onSubmit={enviar}>
          <div>
            <span className="sobretitulo">Acesso</span>
            <h1 style={{ marginTop: 6 }}>Entrar</h1>
            <p className="secundario" style={{ marginTop: 6 }}>Use o e-mail e a senha fornecidos pela Rosan.</p>
          </div>
          <label className="campo">
            <span>E-mail</span>
            <input className="entrada" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input className="entrada" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {erro && <div className="mensagem-erro" role="alert">{erro}</div>}
          <button className="botao" disabled={enviando} style={{ height: 44 }}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}

export function TrocarSenha() {
  const { usuario, recarregar } = useSessao();
  const nav = useNavigate();
  const [v, setV] = useState({ atual: '', nova: '', confirma: '' });
  const [erro, setErro] = useState<string | null>(null);
  if (!usuario) return <Navigate to="/login" replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (v.nova !== v.confirma) return setErro('A confirmação não confere com a nova senha.');
    try {
      await api.post('/auth/trocar-senha', { senhaAtual: v.atual, novaSenha: v.nova });
      const u = await recarregar();
      if (u) nav(destinoInicial(u), { replace: true });
    } catch (er) {
      setErro((er as Error).message);
    }
  };

  return (
    <div className="acesso">
      <LadoMarca />
      <div className="lado-form">
        <form onSubmit={enviar}>
          <div>
            <span className="sobretitulo">Segurança</span>
            <h1 style={{ marginTop: 6 }}>{usuario.trocarSenha ? 'Defina sua senha' : 'Alterar senha'}</h1>
            <p className="secundario" style={{ marginTop: 6 }}>
              {usuario.trocarSenha ? 'Por segurança, troque a senha provisória antes de continuar.' : 'Mínimo de 8 caracteres, com letras e números.'}
            </p>
          </div>
          <label className="campo">
            <span>Senha atual</span>
            <input className="entrada" type="password" autoComplete="current-password" required value={v.atual} onChange={(e) => setV({ ...v, atual: e.target.value })} />
          </label>
          <label className="campo">
            <span>Nova senha</span>
            <input className="entrada" type="password" autoComplete="new-password" required minLength={8} value={v.nova} onChange={(e) => setV({ ...v, nova: e.target.value })} />
          </label>
          <label className="campo">
            <span>Confirme a nova senha</span>
            <input className="entrada" type="password" autoComplete="new-password" required value={v.confirma} onChange={(e) => setV({ ...v, confirma: e.target.value })} />
          </label>
          {erro && <div className="mensagem-erro" role="alert">{erro}</div>}
          <button className="botao" style={{ height: 44 }}>Salvar nova senha</button>
          {!usuario.trocarSenha && (
            <button type="button" className="link" onClick={() => nav(-1)}>Voltar</button>
          )}
        </form>
      </div>
    </div>
  );
}

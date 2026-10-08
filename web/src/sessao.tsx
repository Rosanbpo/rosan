import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'cliente';
  trocarSenha: boolean;
  clienteSlug: string | null;
}

interface Sessao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => Promise<void>;
  recarregar: () => Promise<Usuario | null>;
}

const Contexto = createContext<Sessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const u = await api.get<Usuario>('/auth/eu');
      setUsuario(u);
      return u;
    } catch {
      setUsuario(null);
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    const expirou = () => setUsuario(null);
    window.addEventListener('rosan:sessao-expirada', expirou);
    return () => window.removeEventListener('rosan:sessao-expirada', expirou);
  }, [recarregar]);

  const entrar = async (email: string, senha: string) => {
    await api.post('/auth/login', { email, senha });
    const u = await recarregar();
    if (!u) throw new Error('Não foi possível iniciar a sessão.');
    return u;
  };

  const sair = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUsuario(null);
  };

  return <Contexto.Provider value={{ usuario, carregando, entrar, sair, recarregar }}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSessao fora do ProvedorSessao');
  return s;
}

export const destinoInicial = (u: Usuario) => (u.role === 'admin' ? '/admin' : `/cliente/${u.clienteSlug}`);

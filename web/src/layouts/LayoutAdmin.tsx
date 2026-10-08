import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useSessao } from '../sessao';

const MENU = [
  { caminho: '/admin', rotulo: 'Visão Geral', fim: true },
  { caminho: '/admin/clientes', rotulo: 'Clientes' },
  { caminho: '/admin/importar', rotulo: 'Importar Dados' },
  { caminho: '/admin/importacoes', rotulo: 'Histórico de Importações' },
  { caminho: '/admin/dashboards', rotulo: 'Dashboards' },
  { caminho: '/admin/indicadores', rotulo: 'Indicadores' },
  { caminho: '/admin/centros', rotulo: 'Centros de Custo' },
  { caminho: '/admin/configuracoes', rotulo: 'Configurações' },
];

export function LayoutAdmin() {
  const { usuario, sair } = useSessao();
  const [aberto, setAberto] = useState(false);
  const local = useLocation();
  useEffect(() => setAberto(false), [local.pathname]);

  return (
    <div className="estrutura">
      <div className="barra-movel">
        <span className="marca"><b>ROSAN</b></span>
        <button onClick={() => setAberto(true)} aria-expanded={aberto}>Menu</button>
      </div>
      <aside className={`lateral ${aberto ? 'aberta' : ''}`} onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
        <Link to="/admin" className="marca">
          <b>ROSAN</b>
          <small>Painel interno</small>
        </Link>
        <nav aria-label="Administração">
          <ul className="menu">
            {MENU.map((m) => (
              <li key={m.caminho}>
                <NavLink to={m.caminho} end={m.fim}>{m.rotulo}</NavLink>
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
        <Outlet />
      </main>
    </div>
  );
}

export function Cabecalho({ sobre = 'Rosan', titulo, descricao, acoes }: { sobre?: string; titulo: string; descricao?: string; acoes?: React.ReactNode }) {
  return (
    <header className="cabecalho">
      <div className="sobre">
        <span className="sobretitulo">{sobre}</span>
        <h1>{titulo}</h1>
        {descricao && <p className="periodo">{descricao}</p>}
      </div>
      {acoes && <div className="filtros">{acoes}</div>}
    </header>
  );
}

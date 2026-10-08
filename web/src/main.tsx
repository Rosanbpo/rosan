import '@fontsource-variable/inter';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import './estilos.css';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Carregando } from './components/ui';
import { LayoutAdmin } from './layouts/LayoutAdmin';
import { LayoutCliente } from './layouts/LayoutCliente';
import { Login, TrocarSenha } from './paginas/Acesso';
import { ClienteDetalhe } from './paginas/admin/ClienteDetalhe';
import { NovoCliente } from './paginas/admin/ClienteForm';
import { Clientes, Dashboards, Indicadores } from './paginas/admin/Clientes';
import { Importacoes } from './paginas/admin/Importacoes';
import { Importar } from './paginas/admin/Importar';
import { CentrosAdmin, Configuracoes } from './paginas/admin/Outras';
import { Painel } from './paginas/admin/Painel';
import { CentroCustos } from './paginas/cliente/CentroCustos';
import { Despesas } from './paginas/cliente/Despesas';
import { Diagnostico } from './paginas/cliente/Diagnostico';
import { Historico } from './paginas/cliente/Historico';
import { Insights } from './paginas/cliente/Insights';
import { PontoEquilibrio } from './paginas/cliente/PontoEquilibrio';
import { Resultado } from './paginas/cliente/Resultado';
import { VisaoGeral } from './paginas/cliente/VisaoGeral';
import { destinoInicial, ProvedorSessao, useSessao } from './sessao';

/** Exige login; o link sozinho nunca dá acesso. A autorização real acontece no servidor. */
function Protegida({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { usuario, carregando } = useSessao();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />;
  if (usuario.trocarSenha) return <Navigate to="/trocar-senha" replace />;
  if (admin && usuario.role !== 'admin') return <Navigate to={destinoInicial(usuario)} replace />;
  return <>{children}</>;
}

function Inicio() {
  const { usuario, carregando } = useSessao();
  if (carregando) return <Carregando />;
  return <Navigate to={usuario ? destinoInicial(usuario) : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<Login />} />
      <Route path="/trocar-senha" element={<TrocarSenha />} />
      <Route
        path="/admin"
        element={
          <Protegida admin>
            <LayoutAdmin />
          </Protegida>
        }
      >
        <Route index element={<Painel />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/novo" element={<NovoCliente />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="importar" element={<Importar />} />
        <Route path="importacoes" element={<Importacoes />} />
        <Route path="dashboards" element={<Dashboards />} />
        <Route path="indicadores" element={<Indicadores />} />
        <Route path="centros" element={<CentrosAdmin />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route
        path="/cliente/:slug"
        element={
          <Protegida>
            <LayoutCliente />
          </Protegida>
        }
      >
        <Route index element={<VisaoGeral />} />
        <Route path="resultado" element={<Resultado />} />
        <Route path="despesas" element={<Despesas />} />
        <Route path="centros-de-custo" element={<CentroCustos />} />
        <Route path="ponto-de-equilibrio" element={<PontoEquilibrio />} />
        <Route path="diagnostico" element={<Diagnostico />} />
        <Route path="insights" element={<Insights />} />
        <Route path="historico" element={<Historico />} />
      </Route>
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorSessao>
        <App />
      </ProvedorSessao>
    </BrowserRouter>
  </StrictMode>,
);

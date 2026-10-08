import { useState } from 'react';
import { Link } from 'react-router';
import { inteiro } from '../../../../shared/formato';
import { mesCurto } from '../../../../shared/periodos';
import { Carregando, Erro, Etiqueta, useDados, Vazio } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';
import { dataHora } from '../cliente/Historico';
import type { ResumoCliente } from './Painel';

interface Importacao {
  id: string;
  clienteId: string;
  cliente: string;
  slug: string;
  arquivo: string;
  status: 'concluida' | 'substituida';
  modo: 'nova' | 'substituir' | 'adicionar';
  periodos: string[];
  lancamentos: number;
  ignorados: number;
  dataImportacao: string;
  usuario: string | null;
}

const MODO = { nova: 'Nova', substituir: 'Substituição', adicionar: 'Adição' };

export function Importacoes() {
  const [cliente, setCliente] = useState('');
  const { dados: clientes } = useDados<ResumoCliente[]>('/admin/clientes');
  const { dados, erro } = useDados<Importacao[]>(`/admin/importacoes${cliente ? `?clienteId=${cliente}` : ''}`);
  return (
    <>
      <Cabecalho
        titulo="Histórico de Importações"
        descricao="Todas as planilhas processadas, por cliente e período."
        acoes={
          <>
            <label className="campo">
              <span>Cliente</span>
              <select className="entrada" value={cliente} onChange={(e) => setCliente(e.target.value)}>
                <option value="">Todos</option>
                {clientes?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <Link className="botao" to="/admin/importar">Nova importação</Link>
          </>
        }
      />
      {erro ? (
        <Erro mensagem={erro} />
      ) : !dados ? (
        <Carregando />
      ) : dados.length === 0 ? (
        <Vazio titulo="Nenhuma importação registrada" />
      ) : (
        <div className="painel tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Arquivo</th>
                <th>Períodos</th>
                <th className="n">Lançamentos</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((i) => (
                <tr key={i.id}>
                  <td>{dataHora(i.dataImportacao)}</td>
                  <td><Link to={`/cliente/${i.slug}`}>{i.cliente}</Link></td>
                  <td className="secundario">{i.arquivo}</td>
                  <td>
                    {i.periodos.length > 3 ? `${mesCurto(i.periodos[0])} a ${mesCurto(i.periodos[i.periodos.length - 1])}` : i.periodos.map(mesCurto).join(', ')}
                  </td>
                  <td className="n">
                    {inteiro(i.lancamentos)}
                    {i.ignorados > 0 && <div className="muted" style={{ fontSize: 12 }}>{i.ignorados} ignorados</div>}
                  </td>
                  <td>{MODO[i.modo] ?? '—'}</td>
                  <td>{i.status === 'concluida' ? <Etiqueta tom="bom">Atualizado</Etiqueta> : <Etiqueta>Substituído</Etiqueta>}</td>
                  <td className="secundario">{i.usuario ?? 'Sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

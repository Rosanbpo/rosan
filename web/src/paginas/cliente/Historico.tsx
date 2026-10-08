import { useParams } from 'react-router';
import { inteiro } from '../../../../shared/formato';
import { nomeMesTitulo } from '../../../../shared/periodos';
import { Carregando, Erro, Etiqueta, Secao, useDados, Vazio } from '../../components/ui';

interface LinhaHistorico {
  mes: string;
  quantidade: number;
  status: 'atualizado' | 'substituido';
  arquivo: string;
  dataImportacao: string;
  modo: string;
}

export const dataHora = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('pt-BR');
};

export function Historico() {
  const { slug } = useParams();
  const { dados, erro } = useDados<LinhaHistorico[]>(`/clientes/${slug}/historico`);
  if (erro) return <Erro mensagem={erro} />;
  if (!dados) return <Carregando />;
  const disponiveis = dados.filter((d) => d.status === 'atualizado');
  return (
    <Secao
      titulo="Histórico Financeiro"
      descricao={
        disponiveis.length
          ? `${disponiveis.length} ${disponiveis.length === 1 ? 'mês disponível' : 'meses disponíveis'} para análise, de ${nomeMesTitulo(disponiveis[disponiveis.length - 1].mes).toLowerCase()} a ${nomeMesTitulo(disponiveis[0].mes).toLowerCase()}.`
          : undefined
      }
    >
      {dados.length === 0 ? (
        <Vazio titulo="Ainda não existem dados financeiros importados.">As importações feitas pela Rosan aparecerão aqui.</Vazio>
      ) : (
        <div className="painel tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Importação</th>
                <th>Arquivo</th>
                <th className="n">Lançamentos</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={`${d.mes}-${d.arquivo}-${d.dataImportacao}`} style={{ opacity: d.status === 'substituido' ? 0.6 : 1 }}>
                  <td>{nomeMesTitulo(d.mes)}</td>
                  <td>{dataHora(d.dataImportacao)}</td>
                  <td className="secundario">{d.arquivo}</td>
                  <td className="n">{inteiro(d.quantidade)}</td>
                  <td>
                    {d.status === 'atualizado' ? <Etiqueta tom="bom">Atualizado</Etiqueta> : <Etiqueta>Substituído</Etiqueta>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Secao>
  );
}

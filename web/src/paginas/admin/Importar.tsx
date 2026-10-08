import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { inteiro, moeda } from '../../../../shared/formato';
import { nomeMesTitulo } from '../../../../shared/periodos';
import type { LinhaValidada, Problema } from '../../../../shared/planilha';
import { api, ErroApi } from '../../api';
import { Carregando, Etiqueta, limparCache, useDados } from '../../components/ui';
import { Cabecalho } from '../../layouts/LayoutAdmin';
import { dataHora } from '../cliente/Historico';
import type { ResumoCliente } from './Painel';

interface Previa {
  importId: string | null;
  arquivo: string;
  valido: boolean;
  colunasFaltando: string[];
  totalLinhas: number;
  linhasValidas: number;
  linhasComErro: number;
  erros: Problema[];
  avisos: Problema[];
  totalErros: number;
  totalAvisos: number;
  meses: { mes: string; quantidade: number; existentes: number }[];
  resumo: { receitas: number; despesas: number; transferencias: number; valorReceitas: number; valorDespesas: number };
  amostra: LinhaValidada[];
  arquivoJaImportado: { data: string; importId: string } | null;
  periodosExistentes: string[];
  usaCentroCusto: boolean;
}

interface Resultado {
  inseridos: number;
  ignoradosDuplicados: number;
  periodos: string[];
  substituidos: number;
}

const ETAPAS = ['Cliente', 'Arquivo', 'Validação', 'Prévia', 'Erros', 'Confirmação', 'Processamento', 'Dashboard'];

export function Importar() {
  const [busca] = useSearchParams();
  const { dados: clientes } = useDados<ResumoCliente[]>('/admin/clientes');
  const [clienteId, setClienteId] = useState(busca.get('cliente') ?? '');
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [lendo, setLendo] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [modo, setModo] = useState<'substituir' | 'adicionar' | ''>('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  if (!clientes) return <Carregando />;
  const elegiveis = clientes.filter((c) => c.status === 'ativo' && !c.demonstrativo);
  const cliente = clientes.find((c) => c.id === clienteId);

  const etapa = resultado ? 8 : processando ? 7 : previa ? (previa.valido ? 6 : 5) : lendo ? 3 : clienteId ? 2 : 1;

  const reiniciar = () => {
    setPrevia(null);
    setResultado(null);
    setErro(null);
    setModo('');
    if (entrada.current) entrada.current.value = '';
  };

  const enviar = async (arquivo: File | undefined) => {
    if (!arquivo || !clienteId) return;
    reiniciar();
    if (!/\.xlsx$/i.test(arquivo.name)) {
      setErro('Envie um arquivo Excel no formato .xlsx (modelo padrão Rosan).');
      return;
    }
    setLendo(true);
    try {
      const p = await api.enviar<Previa>(`/admin/importacoes/previa?clienteId=${encodeURIComponent(clienteId)}&arquivo=${encodeURIComponent(arquivo.name)}`, arquivo);
      setPrevia(p);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLendo(false);
    }
  };

  const confirmar = async () => {
    if (!previa?.importId) return;
    setProcessando(true);
    setErro(null);
    try {
      const r = await api.post<Resultado>(`/admin/importacoes/${previa.importId}/confirmar`, modo ? { modo } : {});
      limparCache();
      setResultado(r);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível concluir a importação.');
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async () => {
    if (previa?.importId) await api.post(`/admin/importacoes/${previa.importId}/cancelar`).catch(() => undefined);
    reiniciar();
  };

  return (
    <>
      <Cabecalho
        titulo="Importar Dados Financeiros"
        descricao="Envie a planilha padrão Rosan (aba Base_Financeira). Nada é gravado antes da sua confirmação."
        acoes={<a className="botao secundario" href="/api/modelo-planilha">Baixar modelo da planilha</a>}
      />

      <ol className="etapas" aria-label="Etapas da importação">
        {ETAPAS.map((e, i) => (
          <li key={e} className={i + 1 < etapa ? 'feita' : i + 1 === etapa ? 'atual' : ''}>{e}</li>
        ))}
      </ol>

      <div className="painel">
        <div className="formulario">
          <label className="campo">
            <span>1. Cliente que receberá os dados</span>
            <select className="entrada" value={clienteId} onChange={(e) => { setClienteId(e.target.value); reiniciar(); }} disabled={processando}>
              <option value="">Selecione o cliente…</option>
              {elegiveis.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          {cliente && (
            <div className="campo">
              <span>Situação atual</span>
              <p style={{ paddingTop: 8 }}>
                {cliente.ultimoPeriodo ? <>Último período: <strong>{nomeMesTitulo(cliente.ultimoPeriodo)}</strong> · importado em {dataHora(cliente.ultimaImportacao)}</> : 'Ainda sem dados importados.'}
              </p>
            </div>
          )}
        </div>

        {clienteId && !resultado && (
          <div style={{ marginTop: 20 }}>
            <span className="muted" style={{ fontSize: 12 }}>2. Arquivo Excel</span>
            <div
              className={`soltar ${arrastando ? 'arrastando' : ''}`}
              style={{ marginTop: 6 }}
              role="button"
              tabIndex={0}
              onClick={() => entrada.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && entrada.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files[0]); }}
            >
              <strong>{lendo ? 'Lendo e validando a planilha…' : previa ? `Arquivo: ${previa.arquivo} · clique para enviar outro` : 'Arraste a planilha aqui ou clique para selecionar'}</strong>
              <span className="muted">Formato .xlsx · até 10 MB · aba Base_Financeira</span>
              <input ref={entrada} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => enviar(e.target.files?.[0])} />
            </div>
          </div>
        )}
        {erro && <div className="mensagem-erro" style={{ marginTop: 16 }}>{erro}</div>}
      </div>

      {previa && !resultado && <ResultadoValidacao p={previa} modo={modo} setModo={setModo} confirmar={confirmar} cancelar={cancelar} processando={processando} />}

      {resultado && cliente && (
        <div className="painel" style={{ marginTop: 16 }}>
          <span className="sobretitulo">Importação concluída</span>
          <h2 style={{ margin: '6px 0 10px' }}>{inteiro(resultado.inseridos)} lançamentos importados</h2>
          <p className="secundario">
            Períodos: {resultado.periodos.map(nomeMesTitulo).join(', ') || '—'}.
            {resultado.substituidos > 0 && ` ${inteiro(resultado.substituidos)} lançamentos anteriores foram substituídos.`}
            {resultado.ignoradosDuplicados > 0 && ` ${inteiro(resultado.ignoradosDuplicados)} lançamentos já existentes foram ignorados para não duplicar.`}
          </p>
          <div className="acoes">
            <Link className="botao" to={`/cliente/${cliente.slug}`}>Visualizar Dashboard</Link>
            <button className="botao secundario" onClick={reiniciar}>Nova importação</button>
          </div>
        </div>
      )}
    </>
  );
}

function ResultadoValidacao({
  p,
  modo,
  setModo,
  confirmar,
  cancelar,
  processando,
}: {
  p: Previa;
  modo: string;
  setModo: (m: 'substituir' | 'adicionar') => void;
  confirmar: () => void;
  cancelar: () => void;
  processando: boolean;
}) {
  const [verAvisos, setVerAvisos] = useState(false);
  const precisaModo = p.periodosExistentes.length > 0;

  if (p.colunasFaltando.length) {
    return (
      <div className="painel" style={{ marginTop: 16 }}>
        <h3>A planilha não segue o modelo padrão Rosan</h3>
        <p className="mensagem-erro" style={{ marginTop: 10 }}>Coluna(s) obrigatória(s) ausente(s): {p.colunasFaltando.join(', ')}.</p>
        <p className="secundario" style={{ marginTop: 10 }}>Baixe o modelo, copie os lançamentos para a aba Base_Financeira e envie novamente.</p>
      </div>
    );
  }

  return (
    <>
      {p.arquivoJaImportado && (
        <div className="painel" style={{ marginTop: 16 }}>
          <div className="mensagem-erro">
            Este arquivo já foi importado para este cliente em {dataHora(p.arquivoJaImportado.data)}. Nada foi alterado, para não duplicar os dados.
          </div>
        </div>
      )}

      {p.totalErros > 0 && (
        <div className="painel" style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: 'var(--serifa)', fontSize: 22 }}>
            A planilha possui {p.linhasComErro || p.totalErros} {(p.linhasComErro || p.totalErros) === 1 ? 'linha que precisa' : 'linhas que precisam'} ser corrigida{(p.linhasComErro || p.totalErros) === 1 ? '' : 's'} antes da importação.
          </h3>
          <p className="secundario" style={{ margin: '6px 0 14px' }}>Corrija os pontos abaixo no Excel e envie o arquivo novamente. Nenhum dado foi gravado.</p>
          <div className="lista-problemas tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Campo</th>
                  <th>Problema</th>
                </tr>
              </thead>
              <tbody>
                {p.erros.map((e, i) => (
                  <tr key={i}>
                    <td className="num">{e.linha ?? '—'}</td>
                    <td>{e.campo ?? '—'}</td>
                    <td>{e.mensagem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.totalErros > p.erros.length && <p className="muted" style={{ marginTop: 8 }}>Mostrando {p.erros.length} de {p.totalErros} problemas.</p>}
        </div>
      )}

      <div className="painel" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Prévia dos dados</h3>
        <dl className="numeros" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div><dt>Lançamentos válidos</dt><dd>{inteiro(p.linhasValidas)}</dd></div>
          <div><dt>Receitas ({p.resumo.receitas})</dt><dd>{moeda(p.resumo.valorReceitas)}</dd></div>
          <div><dt>Despesas ({p.resumo.despesas})</dt><dd>{moeda(p.resumo.valorDespesas)}</dd></div>
          <div><dt>Transferências internas</dt><dd>{inteiro(p.resumo.transferencias)}</dd></div>
        </dl>
        <p className="muted" style={{ marginTop: 10 }}>
          Transferências internas não entram como receita nem despesa. {p.usaCentroCusto ? 'A planilha possui centros de custo.' : 'A planilha não possui centros de custo.'}
        </p>

        <div className="tabela-wrap" style={{ marginTop: 18 }}>
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th className="n">Lançamentos no arquivo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {p.meses.map((m) => (
                <tr key={m.mes}>
                  <td>{nomeMesTitulo(m.mes)}</td>
                  <td className="n">{inteiro(m.quantidade)}</td>
                  <td>{m.existentes ? <Etiqueta tom="ruim">Já possui {inteiro(m.existentes)} lançamentos</Etiqueta> : <Etiqueta tom="neutra">Período novo</Etiqueta>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {p.totalAvisos > 0 && (
          <div style={{ marginTop: 16 }}>
            <button className="link" onClick={() => setVerAvisos(!verAvisos)}>
              {verAvisos ? 'Ocultar' : 'Ver'} {p.totalAvisos} aviso(s) que não impedem a importação
            </button>
            {verAvisos && (
              <ul className="lista-problemas secundario" style={{ marginTop: 8, paddingLeft: 18 }}>
                {p.avisos.map((a, i) => (
                  <li key={i}>
                    {a.linha ? `Linha ${a.linha}: ` : ''}
                    {a.mensagem}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {p.amostra.length > 0 && (
          <details style={{ marginTop: 16 }}>
            <summary className="link" style={{ display: 'inline' }}>Ver primeiras linhas</summary>
            <div className="tabela-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Mês</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Subcategoria</th>
                    <th>Natureza</th>
                    <th>Centro</th>
                    <th>Descrição</th>
                    <th className="n">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {p.amostra.map((l) => (
                    <tr key={l.linha}>
                      <td className="num">{l.linha}</td>
                      <td>{l.mes}</td>
                      <td>{l.tipo === 'receita' ? 'Receita' : l.tipo === 'despesa' ? 'Despesa' : 'Transferência'}</td>
                      <td>{l.categoria}</td>
                      <td>{l.subcategoria ?? '—'}</td>
                      <td>{l.natureza === 'fixa' ? 'Fixa' : l.natureza === 'variavel' ? 'Variável' : '—'}</td>
                      <td>{l.centroCusto ?? '—'}</td>
                      <td>{l.descricao}</td>
                      <td className="n">{moeda(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      {p.valido && (
        <div className="painel" style={{ marginTop: 16 }}>
          {precisaModo && (
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
              <legend style={{ marginBottom: 10 }}>
                <h3 style={{ fontFamily: 'var(--serifa)', fontSize: 22 }}>Este período já possui dados. Deseja substituir a importação anterior ou adicionar novos dados?</h3>
              </legend>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <input type="radio" name="modo" checked={modo === 'substituir'} onChange={() => setModo('substituir')} />
                <span>
                  <strong>Substituir</strong>
                  <span className="secundario"> · apaga os lançamentos de {p.periodosExistentes.map(nomeMesTitulo).join(', ')} e grava os do arquivo. Use para corrigir uma importação.</span>
                </span>
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input type="radio" name="modo" checked={modo === 'adicionar'} onChange={() => setModo('adicionar')} />
                <span>
                  <strong>Adicionar</strong>
                  <span className="secundario"> · mantém os dados atuais e inclui apenas lançamentos que ainda não existem (idênticos são ignorados).</span>
                </span>
              </label>
            </fieldset>
          )}
          <div className="acoes" style={{ marginTop: 0 }}>
            <button className="botao" onClick={confirmar} disabled={processando || (precisaModo && !modo)}>
              {processando ? 'Processando…' : `Confirmar importação de ${inteiro(p.linhasValidas)} lançamentos`}
            </button>
            <button className="botao secundario" onClick={cancelar} disabled={processando}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

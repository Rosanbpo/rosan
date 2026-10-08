export type TipoLancamento = 'pagar' | 'receber';
export type StatusLancamento = 'pendente' | 'pago' | 'recebido';

export interface Empresa {
  id: string;
  nome: string;
}

export interface ContaBancaria {
  nome: string;
  saldo: number;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  contato: string;
  categoria: string;
  valor: number;
  /** AAAA-MM-DD */
  vencimento: string;
  /** AAAA-MM-DD, preenchido quando pago/recebido */
  pagamento?: string;
  status: StatusLancamento;
}

export interface DadosEmpresa {
  contas: ContaBancaria[];
  lancamentos: Lancamento[];
  /** true quando os números são fictícios */
  exemplo: boolean;
}

/**
 * Contrato da fonte de dados do dashboard. Para ligar a uma fonte real
 * (API do BPO, planilha exportada, banco), implemente esta interface e
 * troque a instância exportada em `src/data/index.ts`.
 */
export interface FonteDados {
  listarEmpresas(): Promise<Empresa[]>;
  carregar(empresaId: string): Promise<DadosEmpresa>;
}

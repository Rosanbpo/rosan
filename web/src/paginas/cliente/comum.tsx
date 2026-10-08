import type { ReactNode } from 'react';
import type { AnaliseFinanceira } from '../../../../shared/analise';
import { Carregando, Erro, Vazio } from '../../components/ui';
import { type ContextoCliente, useCliente } from '../../layouts/LayoutCliente';

/** Renderiza a página somente quando a análise está disponível. */
export function ComAnalise({ children }: { children: (a: AnaliseFinanceira, ctx: ContextoCliente) => ReactNode }) {
  const ctx = useCliente();
  if (ctx.erro) return <Erro mensagem={ctx.erro} />;
  if (!ctx.analise) return <Carregando />;
  if (ctx.analise.semDados) {
    return (
      <Vazio titulo="Ainda não existem dados financeiros importados para este período.">
        Escolha outro período nos filtros acima ou aguarde a próxima importação da Rosan.
      </Vazio>
    );
  }
  return <div style={{ opacity: ctx.carregando ? 0.6 : 1, transition: 'opacity .15s' }}>{children(ctx.analise, ctx)}</div>;
}

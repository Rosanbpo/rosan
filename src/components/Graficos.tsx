import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { FatiaCategoria, PontoFluxo } from '../lib/analise';
import { rotuloMes } from '../lib/datas';
import { moeda, moedaCompacta, percentual } from '../lib/formato';

const eixo = { fill: 'var(--text-muted)', fontSize: 12 };
const cursor = { fill: 'var(--wash-1)' };

type Dica = TooltipContentProps<number, string>;

function DicaFluxo({ active, payload }: Dica) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoFluxo;
  return (
    <div className="dica">
      <strong>{rotuloMes(p.mes)}</strong>
      <div className="linha">
        <span><i style={{ background: 'var(--series-1)' }} />Entradas</span>
        <b>{moeda(p.entradas)}</b>
      </div>
      <div className="linha">
        <span><i style={{ background: 'var(--series-2)' }} />Saídas</span>
        <b>{moeda(p.saidas)}</b>
      </div>
      <div className="linha">
        <span>Resultado</span>
        <b>{moeda(p.resultado)}</b>
      </div>
    </div>
  );
}

export function GraficoEntradasSaidas({ dados }: { dados: PontoFluxo[] }) {
  return (
    <>
      <div className="legenda" aria-hidden>
        <span><i style={{ background: 'var(--series-1)' }} />Entradas</span>
        <span><i style={{ background: 'var(--series-2)' }} />Saídas</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dados} barGap={2} barCategoryGap="20%" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="mes" tickFormatter={rotuloMes} tick={eixo} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} />
          <YAxis tickFormatter={moedaCompacta} tick={eixo} tickLine={false} axisLine={false} width={72} />
          <Tooltip content={(p) => <DicaFluxo {...(p as Dica)} />} cursor={cursor} />
          <Bar dataKey="entradas" name="Entradas" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="saidas" name="Saídas" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

function DicaResultado({ active, payload }: Dica) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoFluxo;
  const margem = p.entradas ? p.resultado / p.entradas : 0;
  return (
    <div className="dica">
      <strong>{rotuloMes(p.mes)}</strong>
      <div className="linha"><span>Resultado</span><b>{moeda(p.resultado)}</b></div>
      <div className="linha"><span>Margem</span><b>{percentual(margem)}</b></div>
    </div>
  );
}

export function GraficoResultado({ dados }: { dados: PontoFluxo[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="mes" tickFormatter={rotuloMes} tick={eixo} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={moedaCompacta} tick={eixo} tickLine={false} axisLine={false} width={72} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={(p) => <DicaResultado {...(p as Dica)} />} cursor={cursor} />
        <Bar dataKey="resultado" name="Resultado" maxBarSize={24}>
          {dados.map((p) => (
            <Cell
              key={p.mes}
              fill={p.resultado >= 0 ? 'var(--series-1)' : 'var(--negativo)'}
              // arredonda a ponta de dados; a base no zero fica reta
              radius={(p.resultado >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) as unknown as number}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DicaCategoria({ active, payload }: Dica) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as FatiaCategoria;
  return (
    <div className="dica">
      <strong>{p.categoria}</strong>
      <div className="linha"><span>Valor</span><b>{moeda(p.valor)}</b></div>
      <div className="linha"><span>Participação</span><b>{percentual(p.participacao)}</b></div>
    </div>
  );
}

export function GraficoCategorias({ dados }: { dados: FatiaCategoria[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 40)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="categoria"
          tick={{ ...eixo, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip content={(p) => <DicaCategoria {...(p as Dica)} />} cursor={cursor} />
        <Bar dataKey="valor" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
          <LabelList
            dataKey="valor"
            position="right"
            formatter={(v) => moedaCompacta(Number(v))}
            style={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

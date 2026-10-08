import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { LinhaMes } from '../../../shared/analise';
import { moeda, moedaCompacta, pct } from '../../../shared/formato';
import { mesCurto, nomeMesTitulo } from '../../../shared/periodos';

const COR = {
  faturamento: '#28508c',
  despesas: '#c4843c',
  resultado: '#5e8fc9',
  negativo: '#a5432c',
  grade: '#ece7de',
  eixo: '#cfc6b6',
  texto: '#858a94',
};

const eixo = { fill: COR.texto, fontSize: 12 };
const cursor = { fill: 'rgba(239, 230, 216, 0.55)' };

type Dica = TooltipContentProps<number, string>;

function DicaMes({ active, payload }: Dica) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as LinhaMes;
  return (
    <div className="dica">
      <strong>{nomeMesTitulo(p.mes)}</strong>
      {!p.temDados ? (
        <div className="l">Sem dados importados</div>
      ) : (
        <>
          <div className="l"><span><i style={{ background: COR.faturamento }} />Faturamento</span><b>{moeda(p.faturamento)}</b></div>
          <div className="l"><span><i style={{ background: COR.despesas }} />Despesas</span><b>{moeda(p.despesas)}</b></div>
          <div className="l"><span><i style={{ background: COR.resultado }} />Resultado</span><b>{moeda(p.resultado)}</b></div>
          <div className="l"><span>Margem</span><b>{p.margem === null ? '—' : pct(p.margem)}</b></div>
        </>
      )}
    </div>
  );
}

export function LegendaEvolucao() {
  return (
    <div className="legenda">
      <span><i style={{ background: COR.faturamento }} />Faturamento</span>
      <span><i style={{ background: COR.despesas }} />Despesas</span>
      <span><i className="linha" style={{ background: COR.resultado }} />Resultado</span>
    </div>
  );
}

/** Faturamento e despesas em colunas; resultado em linha (mesmo eixo, mesma unidade). */
export function GraficoEvolucao({ meses, altura = 320 }: { meses: LinhaMes[]; altura?: number }) {
  return (
    <>
      <LegendaEvolucao />
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={meses} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke={COR.grade} />
          <XAxis dataKey="mes" tickFormatter={mesCurto} tick={eixo} tickLine={false} axisLine={{ stroke: COR.eixo }} />
          <YAxis tickFormatter={moedaCompacta} tick={eixo} tickLine={false} axisLine={false} width={78} />
          <ReferenceLine y={0} stroke={COR.eixo} />
          <Tooltip content={(p) => <DicaMes {...(p as Dica)} />} cursor={cursor} />
          <Bar dataKey="faturamento" fill={COR.faturamento} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar dataKey="despesas" fill={COR.despesas} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Line
            dataKey="resultado"
            stroke={COR.resultado}
            strokeWidth={2}
            dot={{ r: 4, fill: COR.resultado, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

function DicaValor({ active, payload, label }: Dica) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dica">
      <strong>{nomeMesTitulo(String(label))}</strong>
      <div className="l"><span>Despesas</span><b>{moeda(Number(payload[0].value))}</b></div>
    </div>
  );
}

/** Pequeno gráfico de colunas de uma única série (ex.: evolução de um centro de custo). */
export function MiniColunas({ dados, altura = 110 }: { dados: { mes: string; valor: number }[]; altura?: number }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="mes" tickFormatter={mesCurto} tick={{ ...eixo, fontSize: 11 }} tickLine={false} axisLine={{ stroke: COR.eixo }} interval="preserveStartEnd" />
        <Tooltip content={(p) => <DicaValor {...(p as Dica)} />} cursor={cursor} />
        <Bar dataKey="valor" fill={COR.despesas} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DicaResultado({ active, payload }: Dica) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as LinhaMes;
  return (
    <div className="dica">
      <strong>{nomeMesTitulo(p.mes)}</strong>
      <div className="l"><span>Resultado</span><b>{moeda(p.resultado)}</b></div>
      <div className="l"><span>Margem</span><b>{p.margem === null ? '—' : pct(p.margem)}</b></div>
    </div>
  );
}

/** Resultado mensal: positivo em azul, negativo em terracota. */
export function GraficoResultado({ meses, altura = 220 }: { meses: LinhaMes[]; altura?: number }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={meses} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke={COR.grade} />
        <XAxis dataKey="mes" tickFormatter={mesCurto} tick={eixo} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={moedaCompacta} tick={eixo} tickLine={false} axisLine={false} width={78} />
        <ReferenceLine y={0} stroke={COR.eixo} />
        <Tooltip content={(p) => <DicaResultado {...(p as Dica)} />} cursor={cursor} />
        <Bar dataKey="resultado" maxBarSize={22} isAnimationActive={false}>
          {meses.map((m) => (
            <Cell
              key={m.mes}
              fill={m.resultado >= 0 ? COR.faturamento : COR.negativo}
              radius={(m.resultado >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) as unknown as number}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

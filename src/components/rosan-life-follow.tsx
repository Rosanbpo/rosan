import { openRosanLifeAction } from "@/app/actions/rosan-life-access";
import {
  SEMAFORO_LABEL,
  hasData,
  rosanLifeBase,
  type FollowState,
  type Semaforo,
} from "@/server/services/rosan-life-follow";

const TONE: Record<Semaforo, string> = {
  em_dia: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  atencao: "bg-amber-50 text-amber-800 ring-amber-200",
  pendencia: "bg-rose-50 text-rose-800 ring-rose-200",
  novo: "bg-sky-50 text-sky-800 ring-sky-200",
};
export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const brDay = (iso: string | null) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—";
const brDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "—";

/** Texto do estado quando não há dados do app. */
export function followNote(
  s: FollowState | undefined,
  hasEmail: boolean,
): string | null {
  if (!hasEmail) return "Sem e-mail cadastrado";
  if (!s) return "Não consultado";
  if ("erro" in s) return s.erro;
  if (hasData(s)) return null;
  return s.conta
    ? "Conta criada, sem permissão de acesso"
    : "Ainda não criou a conta";
}

export function SemaforoBadge({
  s,
  hasEmail = true,
}: {
  s: FollowState | undefined;
  hasEmail?: boolean;
}) {
  if (hasData(s))
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONE[s.semaforo]}`}
      >
        {SEMAFORO_LABEL[s.semaforo]}
      </span>
    );
  return (
    <span className="text-xs text-slate-500">{followNote(s, hasEmail)}</span>
  );
}

/** Bloco da ficha do cliente: o que o app mostra sobre ele e o botão para abrir o app como consultora. */
export function FollowCard({
  s,
  hasEmail,
  clientId,
}: {
  s: FollowState | undefined;
  hasEmail: boolean;
  clientId: string;
}) {
  const base = rosanLifeBase();
  const note = followNote(s, hasEmail);
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">ROSAN LIFE da cliente</h3>
          <SemaforoBadge s={s} hasEmail={hasEmail} />
        </div>
        {base && hasData(s) && (
          <form action={openRosanLifeAction.bind(null, clientId)}>
            <button className="btn-primary">Abrir no ROSAN LIFE</button>
          </form>
        )}
      </div>
      {note && (
        <p className="mt-3 text-sm text-slate-600">
          {note === "Conta criada, sem permissão de acesso"
            ? "A cliente criou a conta, mas ainda não permitiu o seu acesso. Peça a autorização na aba Acesso ao ROSAN LIFE; ela decide dentro do aplicativo."
            : note === "Ainda não criou a conta"
              ? "A cliente ainda não criou a conta no app. Envie o convite pela aba Consultoria."
              : note}
        </p>
      )}
      {hasData(s) && (
        <>
          {s.motivos.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-amber-800">
              {s.motivos.map((m) => (
                <li key={m} className="rounded-lg bg-amber-50 px-2 py-1">
                  {m}
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Item
              label="Último registro"
              value={
                s.ultimoRegistro
                  ? `${brDay(s.ultimoRegistro)}${s.semRegistroDesde ? ` (há ${s.semRegistroDesde} d)` : " (hoje)"}`
                  : "nenhum"
              }
            />
            <Item
              label="Dias sem registro (7 dias)"
              value={String(s.diasSemRegistro)}
            />
            <Item
              label="Sequência em dia"
              value={`${s.sequencia} ${s.sequencia === 1 ? "dia" : "dias"}`}
            />
            <Item label="Último acesso" value={brDateTime(s.ultimoAcesso)} />
            <Item label="Gasto no mês" value={brl(s.mes.gastoCents)} />
            <Item
              label="Orçado no mês"
              value={
                s.mes.orcadoCents
                  ? `${brl(s.mes.orcadoCents)}${s.mes.usoPct !== null ? ` (${s.mes.usoPct}%)` : ""}`
                  : "sem orçamento"
              }
            />
            <Item label="Metas ativas" value={String(s.metasAtivas)} />
            <Item label="Contas em atraso" value={String(s.contasAtrasadas)} />
            <Item
              label="Mês anterior fechado"
              value={s.mesAnteriorFechado ? "Sim" : "Não"}
            />
            <Item
              label="Última reunião no app"
              value={brDateTime(s.ultimaReuniao)}
            />
          </dl>
        </>
      )}
    </section>
  );
}
const Item = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="font-medium text-brand-900">{value}</dd>
  </div>
);

import Link from "next/link";
import {
  PF_CONTINUITY_LABEL,
  PF_STATUS_LABEL,
  type PfStatus,
} from "@/domain/pf-journey";
import { PageHeader } from "@/components/ui/layout";
import { SemaforoBadge, brDay, brl } from "@/components/rosan-life-follow";
import { requirePermission } from "@/server/context";
import { listPfClients } from "@/server/services/pf-journey";
import {
  SEMAFORO_LABEL,
  SEMAFORO_ORDER,
  fetchFollowUp,
  followFor,
  hasData,
  rosanLifeBase,
  type Semaforo,
} from "@/server/services/rosan-life-follow";

export const metadata = { title: "ROSAN LIFE" };
export const dynamic = "force-dynamic";

const FILTERS = [
  "todos",
  "pendencia",
  "atencao",
  "em_dia",
  "novo",
  "sem_dados",
] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = {
  todos: "Todos",
  pendencia: SEMAFORO_LABEL.pendencia,
  atencao: SEMAFORO_LABEL.atencao,
  em_dia: SEMAFORO_LABEL.em_dia,
  novo: SEMAFORO_LABEL.novo,
  sem_dados: "Sem acesso aos dados",
};

/** Fase do cliente na jornada: antes, durante ou depois dos 30 dias de consultoria. */
function fase(s: PfStatus): string {
  if (s === "ATIVO_ACOMPANHAMENTO") return "Acompanhamento mensal";
  if (s === "ATIVO_APLICATIVO") return "Só o aplicativo";
  if (s === "CONSULTORIA_CONCLUIDA" || s === "AGUARDANDO_DECISAO")
    return "Decidindo a continuidade";
  if (s === "NOVO_INTERESSADO" || s === "AGUARDANDO_CONTRATACAO")
    return "Antes de contratar";
  return "Consultoria (30 dias)";
}

/** Gestão do ROSAN LIFE: acompanhamento das clientes de Consultoria PF, do início da consultoria ao acompanhamento mensal. */
export default async function RosanLifePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const actor = await requirePermission("clients.manage");
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.s ?? "")
    ? (sp.s as Filter)
    : "todos";
  const all = await listPfClients(actor);
  const follow = await fetchFollowUp(
    all.flatMap((r) => (r.email ? [r.email] : [])),
  );
  const base = rosanLifeBase();
  const invites = base ? `${base}/convites` : null;

  const rows = all
    .map((r) => ({ ...r, f: followFor(follow, r.email) }))
    .sort(
      (a, b) =>
        (hasData(a.f) ? SEMAFORO_ORDER[a.f.semaforo] : 9) -
          (hasData(b.f) ? SEMAFORO_ORDER[b.f.semaforo] : 9) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  const kind = (r: (typeof rows)[number]): Filter =>
    hasData(r.f) ? r.f.semaforo : "sem_dados";
  const count = (f: Filter) =>
    f === "todos" ? rows.length : rows.filter((r) => kind(r) === f).length;
  const shown =
    filter === "todos" ? rows : rows.filter((r) => kind(r) === filter);
  const erro = Object.values(follow).find((v) => "erro" in v) as
    { erro: string } | undefined;

  return (
    <>
      <PageHeader
        title="ROSAN LIFE"
        description="Acompanhamento das clientes de Consultoria PF no aplicativo, do início da consultoria ao acompanhamento mensal."
      />

      {erro && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          {erro.erro} Os semáforos abaixo podem estar incompletos.
        </p>
      )}

      <nav
        aria-label="Filtrar por situação"
        className="mb-4 flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "todos" ? "/rosan-life" : `/rosan-life?s=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-brand-900 bg-brand-900 text-white" : "border-hair bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {FILTER_LABEL[f]} <span className="opacity-70">{count(f)}</span>
          </Link>
        ))}
      </nav>

      {all.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600">
          Nenhum cliente de Consultoria PF ainda. Ao cadastrar um cliente,
          marque <b>Consultoria Financeira Pessoa Física</b> em Serviço
          contratado.{" "}
          <Link
            href="/clientes/novo"
            className="text-brand-700 hover:underline"
          >
            Novo cliente
          </Link>
        </p>
      ) : shown.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600">
          Nenhuma cliente nesta situação.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Fase</th>
                <th className="p-3">Situação no app</th>
                <th className="p-3">Último registro</th>
                <th className="p-3">Gasto / orçado do mês</th>
                <th className="p-3">Atenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {shown.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="p-3">
                    <Link
                      href={`/clientes/${r.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {r.email ?? "sem e-mail"}
                    </div>
                  </td>
                  <td className="p-3">
                    {fase(r.status)}
                    <div className="text-xs text-slate-500">
                      {PF_STATUS_LABEL[r.status]}
                      {r.continuity
                        ? ` · ${PF_CONTINUITY_LABEL[r.continuity].split(" — ")[0]}`
                        : ""}
                    </div>
                  </td>
                  <td className="p-3">
                    <SemaforoBadge s={r.f} hasEmail={!!r.email} />
                  </td>
                  <td className="p-3">
                    {hasData(r.f)
                      ? r.f.ultimoRegistro
                        ? `${brDay(r.f.ultimoRegistro)}${r.f.semRegistroDesde ? ` (há ${r.f.semRegistroDesde} d)` : " (hoje)"}`
                        : "nenhum"
                      : "—"}
                  </td>
                  <td className="p-3">
                    {hasData(r.f) ? (
                      <>
                        {brl(r.f.mes.gastoCents)}
                        {r.f.mes.orcadoCents ? (
                          <span className="text-slate-500">
                            {" "}
                            / {brl(r.f.mes.orcadoCents)}
                            {r.f.mes.usoPct !== null
                              ? ` (${r.f.mes.usoPct}%)`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {" "}
                            / sem orçamento
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-700">
                    {hasData(r.f) && r.f.motivos.length
                      ? r.f.motivos.join("; ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt-5 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Aplicativo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Convites, pedidos de acesso e o modo consultora ficam no próprio
            ROSAN LIFE. A cliente só aparece aqui com dados depois de permitir o
            seu acesso.
          </p>
        </div>
        {base ? (
          <div className="flex gap-2">
            <a
              href={`${base}/consultora`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Painel da Consultora
            </a>
            <a
              href={invites!}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Convites
            </a>
          </div>
        ) : (
          <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Falta configurar o endereço do app (variável ROSAN_LIFE_URL).
          </p>
        )}
      </div>
    </>
  );
}

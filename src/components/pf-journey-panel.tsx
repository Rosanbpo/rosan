import {
  inviteRosanLifeAction,
  savePfDatesAction,
  setPfContinuityAction,
  setPfStatusAction,
  togglePfItemAction,
} from "@/app/actions/pf-journey";
import {
  PF_CONTINUITY,
  PF_CONTINUITY_LABEL,
  PF_STAGES,
  PF_STATUSES,
  PF_STATUS_LABEL,
  itemKey,
  stageOfStatus,
  type PfContinuity,
  type PfStatus,
} from "@/domain/pf-journey";
import { cx } from "@/lib/ui";
import type { getPfJourney } from "@/server/services/pf-journey";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

type View = NonNullable<Awaited<ReturnType<typeof getPfJourney>>>;
const br = (iso: string | null) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";

/** Aba "Consultoria PF": etapas, checklist, datas dos 30 dias, reuniões, bônus do app e continuidade. */
export function PfJourneyPanel({
  clientId,
  j,
  canEdit,
}: {
  clientId: string;
  j: View;
  canEdit: boolean;
}) {
  const current = stageOfStatus(j.status);
  const done = new Set(j.doneItems);
  return (
    <div className="max-w-5xl space-y-5">
      <section className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-xs text-slate-500">Status atual</p>
          <p className="text-lg font-semibold text-brand-900">
            {PF_STATUS_LABEL[j.status]}
          </p>
        </div>
        <Info label="Início dos 30 dias" value={br(j.startDate)} />
        <Info label="Fim dos 30 dias" value={br(j.endDate)} />
        <Info
          label="Bônus do app (3 meses)"
          value={
            j.appBonusStart
              ? `${br(j.appBonusStart)} a ${br(j.appBonusEnd)}`
              : "—"
          }
        />
        <Info
          label="Pagamento"
          value={j.paidAt ? `Pago em ${br(j.paidAt)}` : "Não marcado"}
        />
        <Info label="Reunião 1 de 2" value={br(j.meeting1At)} />
        <Info label="Reunião 2 de 2" value={br(j.meeting2At)} />
        <Info
          label="Continuidade"
          value={
            j.continuity
              ? PF_CONTINUITY_LABEL[j.continuity]
              : "Ainda não definida"
          }
        />
        <Info
          label="Convite do ROSAN LIFE"
          value={
            j.appInvitedAt
              ? `Enviado em ${j.appInvitedAt.toLocaleDateString("pt-BR")}`
              : "Não enviado"
          }
        />
      </section>

      {canEdit && (
        <div className="grid gap-5 lg:grid-cols-2">
          <ActionForm
            action={savePfDatesAction.bind(null, clientId)}
            className="card grid gap-3 p-5 sm:grid-cols-2"
          >
            <h3 className="text-sm font-semibold sm:col-span-2">
              Datas e pagamento
            </h3>
            <Field label="Início dos 30 dias" name="startDate">
              <input
                id="startDate"
                type="date"
                name="startDate"
                className="input"
                defaultValue={j.startDate ?? ""}
              />
            </Field>
            <Field
              label="Início do bônus do app"
              name="appBonusStart"
              hint="Termina 3 meses depois."
            >
              <input
                id="appBonusStart"
                type="date"
                name="appBonusStart"
                className="input"
                defaultValue={j.appBonusStart ?? ""}
              />
            </Field>
            <Field label="Reunião 1" name="meeting1At">
              <input
                id="meeting1At"
                type="date"
                name="meeting1At"
                className="input"
                defaultValue={j.meeting1At ?? ""}
              />
            </Field>
            <Field label="Reunião 2" name="meeting2At">
              <input
                id="meeting2At"
                type="date"
                name="meeting2At"
                className="input"
                defaultValue={j.meeting2At ?? ""}
              />
            </Field>
            <Field
              label="Pago em"
              name="paidAt"
              hint="A cobrança é feita no Conta Azul. Aqui você só registra."
            >
              <input
                id="paidAt"
                type="date"
                name="paidAt"
                className="input"
                defaultValue={j.paidAt ?? ""}
              />
            </Field>
            <Field label="Observações" name="notes">
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="input"
                defaultValue={j.notes ?? ""}
              />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Salvar datas</SubmitButton>
            </div>
          </ActionForm>

          <div className="space-y-5">
            <ActionForm
              action={setPfStatusAction.bind(null, clientId)}
              className="card flex flex-wrap items-end gap-3 p-5"
              showSuccess={false}
              inlineFeedback
            >
              <Field label="Mudar status manualmente" name="status">
                <select
                  id="status"
                  name="status"
                  className="input"
                  defaultValue={j.status}
                >
                  {PF_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PF_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton>Atualizar</SubmitButton>
            </ActionForm>
            <ActionForm
              action={inviteRosanLifeAction.bind(null, clientId)}
              className="card p-5"
              confirm={
                j.appInvitedAt
                  ? "Já existe um convite enviado. Enviar outro substitui o anterior. Continuar?"
                  : undefined
              }
            >
              <h3 className="text-sm font-semibold">Acesso ao ROSAN LIFE</h3>
              <p className="mt-1 text-xs text-slate-500">
                Envia por e-mail o convite para o contato principal do cliente
                criar a conta no app.
              </p>
              <div className="mt-3">
                <SubmitButton>
                  {j.appInvitedAt
                    ? "Enviar novo convite"
                    : "Enviar convite do ROSAN LIFE"}
                </SubmitButton>
              </div>
            </ActionForm>
            <div className="card p-5">
              <h3 className="text-sm font-semibold">
                Continuidade após os 30 dias
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Ao escolher, o cliente passa a ativo na modalidade.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {PF_CONTINUITY.map((c: PfContinuity) => (
                  <ActionForm
                    key={c}
                    action={setPfContinuityAction.bind(null, clientId, c)}
                    inlineFeedback
                    showSuccess={false}
                  >
                    <SubmitButton
                      className={cx(
                        "btn w-full justify-start border text-left",
                        j.continuity === c
                          ? "border-brand-700 bg-brand-50 text-brand-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {PF_CONTINUITY_LABEL[c]}
                    </SubmitButton>
                  </ActionForm>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3" aria-label="Etapas da jornada">
        {PF_STAGES.map((s) => {
          const total = s.items.length;
          const n = s.items.filter((_, i) => done.has(itemKey(s.n, i))).length;
          const isCurrent = s.n === current;
          return (
            <details
              key={s.n}
              open={isCurrent}
              className={cx(
                "rounded-xl border bg-white",
                isCurrent ? "border-brand-300 shadow-sm" : "border-hair",
              )}
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-sm font-semibold text-brand-900">
                  {s.n}. {s.name}
                  {s.deliverable ? (
                    <span className="ml-2 font-normal text-slate-500">
                      entrega: {s.deliverable}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cx(
                    "rounded-full px-2.5 py-0.5 text-xs",
                    n === total
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {n} de {total}
                </span>
              </summary>
              <ul className="space-y-1 border-t border-hair p-3">
                {s.items.map((label, i) => {
                  const k = itemKey(s.n, i);
                  const on = done.has(k);
                  return (
                    <li key={k}>
                      {canEdit ? (
                        <ActionForm
                          action={togglePfItemAction.bind(null, clientId, k)}
                          inlineFeedback
                          showSuccess={false}
                        >
                          <SubmitButton className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                            <span
                              aria-hidden
                              className={cx(
                                "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                                on
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300",
                              )}
                            >
                              {on ? "✓" : ""}
                            </span>
                            <span
                              className={
                                on
                                  ? "text-slate-400 line-through"
                                  : "text-slate-700"
                              }
                            >
                              {label}
                            </span>
                          </SubmitButton>
                        </ActionForm>
                      ) : (
                        <p className="px-2 py-1.5 text-sm text-slate-700">
                          {on ? "✓ " : "○ "}
                          {label}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold">Histórico</h3>
        {j.history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nada registrado ainda. As mudanças de status, datas e itens aparecem
            aqui.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-hair text-sm">
            {j.history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3 py-1.5">
                <span>{h.summary}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {h.createdAt.toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
export type { PfStatus };

/** Cabeçalho do cliente de Consultoria PF, no lugar dos indicadores de BPO. */
export function PfHeaderStats({ j }: { j: View }) {
  return (
    <dl className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-hair pt-3 text-sm lg:order-last">
      <span>
        <dt className="inline text-slate-500">Status </dt>
        <dd className="inline text-base font-semibold text-brand-900">
          {PF_STATUS_LABEL[j.status]}
        </dd>
      </span>
      <span>
        <dt className="inline text-slate-500">30 dias </dt>
        <dd className="inline font-semibold text-brand-900">
          {j.startDate ? `${br(j.startDate)} a ${br(j.endDate)}` : "sem data"}
        </dd>
      </span>
      <span>
        <dt className="inline text-slate-500">Reuniões </dt>
        <dd className="inline font-semibold text-brand-900">
          {[j.meeting1At, j.meeting2At].map((m) => br(m)).join(" · ")}
        </dd>
      </span>
      <span>
        <dt className="inline text-slate-500">Pagamento </dt>
        <dd
          className={`inline font-semibold ${j.paidAt ? "text-emerald-700" : "text-amber-700"}`}
        >
          {j.paidAt ? "Pago" : "Pendente"}
        </dd>
      </span>
    </dl>
  );
}

/** Resumo da consultoria: onde a cliente está, o que falta fazer agora e os pontos de atenção. */
export function PfSummary({
  clientId,
  j,
  client,
}: {
  clientId: string;
  j: View;
  client: { name: string; email: string | null; phone: string | null };
}) {
  const stage = PF_STAGES.find((s) => s.n === stageOfStatus(j.status))!;
  const done = new Set(j.doneItems);
  const pending = stage.items
    .map((label, i) => ({ label, key: itemKey(stage.n, i) }))
    .filter((x) => !done.has(x.key));
  const total = PF_STAGES.slice(0, 8).reduce((n, s) => n + s.items.length, 0);
  const finished = PF_STAGES.slice(0, 8).reduce(
    (n, s) => n + s.items.filter((_, i) => done.has(itemKey(s.n, i))).length,
    0,
  );
  const pct = Math.round((finished / total) * 100);
  const alerts: string[] = [];
  if (
    !j.startDate &&
    j.status !== "NOVO_INTERESSADO" &&
    j.status !== "AGUARDANDO_CONTRATACAO"
  )
    alerts.push("Defina a data de início dos 30 dias.");
  if (
    !j.paidAt &&
    j.status !== "NOVO_INTERESSADO" &&
    j.status !== "AGUARDANDO_CONTRATACAO"
  )
    alerts.push("Pagamento ainda não marcado como pago.");
  if (!client.email)
    alerts.push(
      "Falta o e-mail da cliente para enviar o convite do ROSAN LIFE.",
    );
  if (
    !j.appInvitedAt &&
    [
      "AGUARDANDO_DIAGNOSTICO",
      "DIAGNOSTICO_EM_PREPARACAO",
      "PRIMEIRA_REUNIAO_AGENDADA",
    ].includes(j.status)
  )
    alerts.push("O convite do ROSAN LIFE ainda não foi enviado.");
  if (j.status === "AGUARDANDO_DECISAO" && !j.continuity)
    alerts.push("A cliente ainda não escolheu a continuidade.");
  return (
    <div className="max-w-5xl space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Etapa {stage.n} de 10</p>
            <h2 className="text-lg font-semibold text-brand-900">
              {stage.name}
            </h2>
            <p className="text-sm text-slate-600">
              {PF_STATUS_LABEL[j.status]}
            </p>
          </div>
          <Link
            href={`/clientes/${clientId}?aba=consultoria`}
            className="btn-primary"
          >
            Abrir a jornada
          </Link>
        </div>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {finished} de {total} passos concluídos até o encerramento
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-sm font-semibold">O que falta nesta etapa</h3>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-emerald-700">
              Etapa concluída. Siga para a próxima na jornada.
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {pending.map((x) => (
                <li key={x.key}>{x.label}</li>
              ))}
            </ul>
          )}
          {stage.deliverable && (
            <p className="mt-3 text-sm">
              <span className="text-slate-500">Entrega: </span>
              <b>{stage.deliverable}</b>
            </p>
          )}
        </section>
        <section className="card p-5">
          <h3 className="text-sm font-semibold">Pontos de atenção</h3>
          {alerts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Nada pendente por aqui.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {alerts.map((a) => (
                <li key={a} className="rounded-lg bg-amber-50 p-2">
                  {a}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Reunião 1 de 2" value={br(j.meeting1At)} />
        <Info label="Reunião 2 de 2" value={br(j.meeting2At)} />
        <Info
          label="Bônus do ROSAN LIFE"
          value={j.appBonusStart ? `até ${br(j.appBonusEnd)}` : "—"}
        />
        <Info
          label="Continuidade"
          value={j.continuity ? PF_CONTINUITY_LABEL[j.continuity] : "A definir"}
        />
        <Info label="Contato" value={client.email ?? "sem e-mail"} />
        <Info label="WhatsApp" value={client.phone ?? "—"} />
        <Info
          label="Acesso ao app"
          value={
            j.appInvitedAt
              ? `Convite enviado em ${j.appInvitedAt.toLocaleDateString("pt-BR")}`
              : "Convite não enviado"
          }
        />
        <Info
          label="Pagamento"
          value={j.paidAt ? `Pago em ${br(j.paidAt)}` : "Pendente"}
        />
      </section>
    </div>
  );
}

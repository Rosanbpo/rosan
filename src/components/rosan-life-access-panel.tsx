import {
  openRosanLifeAction,
  requestRosanLifeAccessAction,
} from "@/app/actions/rosan-life-access";
import { ActionForm, SubmitButton } from "./ui/action-form";
import type {
  AccessInfo,
  AccessState,
} from "@/server/services/rosan-life-access";

const LABEL: Record<AccessState, string> = {
  sem_conta: "Sem conta no aplicativo",
  nao_solicitada: "Não solicitada",
  aguardando: "Aguardando autorização",
  autorizada: "Autorizada",
  revogada: "Revogada pela cliente",
  recusada: "Recusada pela cliente",
};
const TONE: Record<AccessState, string> = {
  sem_conta: "bg-slate-100 text-slate-700 ring-slate-200",
  nao_solicitada: "bg-slate-100 text-slate-700 ring-slate-200",
  aguardando: "bg-amber-50 text-amber-800 ring-amber-200",
  autorizada: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  revogada: "bg-rose-50 text-rose-800 ring-rose-200",
  recusada: "bg-rose-50 text-rose-800 ring-rose-200",
};
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

/** Aba "Acesso ao ROSAN LIFE": situação da autorização, entrada no app da cliente e histórico de acessos. */
export function RosanLifeAccessPanel({
  clientId,
  info,
  hasEmail,
  flash,
}: {
  clientId: string;
  info: AccessInfo;
  hasEmail: boolean;
  flash?: string;
}) {
  const ok = !("erro" in info);
  const estado = ok ? info.estado : null;
  return (
    <div className="max-w-4xl space-y-5">
      {flash && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          {flash}
        </p>
      )}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Autorização da cliente</h2>
            {estado && (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONE[estado]}`}
              >
                {LABEL[estado]}
              </span>
            )}
          </div>
          {estado === "autorizada" && (
            <form action={openRosanLifeAction.bind(null, clientId)}>
              <button className="btn-primary">
                Acessar sistema do cliente
              </button>
            </form>
          )}
        </div>
        {!hasEmail && (
          <p className="mt-3 text-sm text-slate-600">
            Cadastre o e-mail da cliente (Contato principal) para usar o acesso
            ao ROSAN LIFE.
          </p>
        )}
        {!ok && hasEmail && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {info.erro}
          </p>
        )}
        {ok && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              {estado === "sem_conta" &&
                "A cliente ainda não criou a conta no aplicativo. Envie o convite pela aba Consultoria."}
              {estado === "nao_solicitada" &&
                "Peça a autorização: a cliente recebe o aviso dentro do aplicativo e decide se permite o seu acesso."}
              {estado === "aguardando" &&
                "O pedido foi enviado. A cliente precisa tocar em Permitir acesso no aplicativo."}
              {estado === "autorizada" &&
                "O botão abre o aplicativo real da cliente, em modo consultora, sem senha. O que você alterar fica registrado e a cliente pode encerrar o acesso quando quiser."}
              {estado === "revogada" &&
                "A cliente encerrou o seu acesso. Você pode pedir a autorização de novo."}
              {estado === "recusada" &&
                "A cliente recusou o pedido. Converse com ela antes de pedir de novo."}
            </p>
            {(estado === "nao_solicitada" ||
              estado === "aguardando" ||
              estado === "revogada" ||
              estado === "recusada") && (
              <ActionForm
                action={requestRosanLifeAccessAction.bind(null, clientId)}
                className="mt-3"
              >
                <SubmitButton className="btn-primary">
                  {estado === "aguardando"
                    ? "Reenviar pedido"
                    : "Solicitar autorização"}
                </SubmitButton>
              </ActionForm>
            )}
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
              <Item label="Pedido enviado em" value={when(info.solicitadaEm)} />
              <Item label="Autorizada em" value={when(info.autorizadaEm)} />
              <Item label="Último acesso" value={when(info.ultimoAcesso)} />
              <Item label="Revogada em" value={when(info.revogadaEm)} />
            </dl>
          </>
        )}
      </section>

      {ok && info.acessos.length > 0 && (
        <section className="card p-5">
          <h3 className="text-sm font-semibold">Registro de acessos</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-1">Quando</th>
                <th>Evento</th>
                <th>Por onde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {info.acessos.map((a, i) => (
                <tr key={i}>
                  <td className="py-1.5">{when(a.at)}</td>
                  <td>
                    {a.event === "entrada"
                      ? "Entrou no app da cliente"
                      : "Saiu"}
                  </td>
                  <td>{a.via === "central" ? "Central" : "Aplicativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
const Item = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="font-medium text-brand-900">{value}</dd>
  </div>
);

/** Acompanhamento das clientes no ROSAN LIFE: pergunta ao app (API protegida) e devolve o semáforo de cada uma. */
export type Semaforo = "novo" | "em_dia" | "atencao" | "pendencia";

export type FollowData = {
  conta: true;
  vinculo: true;
  clientId: string;
  semaforo: Semaforo;
  motivos: string[];
  diasSemRegistro: number;
  semRegistroDesde: number | null;
  ultimoRegistro: string | null;
  sequencia: number;
  mes: {
    mes: string;
    gastoCents: number;
    receitaCents: number;
    orcadoCents: number;
    usoPct: number | null;
  };
  contasAtrasadas: number;
  metasAtivas: number;
  ultimaReuniao: string | null;
  mesAnteriorFechado: boolean;
  ultimoAcesso: string | null;
};
/** Estados sem dados: sem conta no app (convite não aceito) ou conta sem o consentimento da cliente. */
export type FollowState =
  | FollowData
  | { conta: false; vinculo: false }
  | { conta: true; vinculo: false }
  | { erro: string };

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  novo: "Novo",
  em_dia: "Em dia",
  atencao: "Atenção",
  pendencia: "Pendência",
};
export const SEMAFORO_ORDER: Record<Semaforo, number> = {
  pendencia: 0,
  atencao: 1,
  novo: 2,
  em_dia: 3,
};

export const hasData = (s: FollowState | undefined): s is FollowData =>
  !!s && "semaforo" in s;

export const rosanLifeBase = () =>
  (process.env.ROSAN_LIFE_URL ?? "").replace(/\/$/, "");

/** E-mails sem retorno do app voltam com `erro`, para a tela dizer que não conseguiu consultar (e não que está tudo bem). */
export async function fetchFollowUp(
  emails: string[],
): Promise<Record<string, FollowState>> {
  const list = [
    ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  ].slice(0, 200);
  if (!list.length) return {};
  const base = rosanLifeBase(),
    secret = process.env.CENTRAL_API_SECRET;
  const fail = (erro: string) =>
    Object.fromEntries(list.map((e) => [e, { erro }])) as Record<
      string,
      FollowState
    >;
  if (!base || !secret)
    return fail("A ligação com o ROSAN LIFE não está configurada.");
  try {
    const res = await fetch(`${base}/api/central/acompanhamento`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ emails: list }),
    });
    if (!res.ok)
      return fail(`O ROSAN LIFE respondeu com erro (${res.status}).`);
    const json = (await res.json()) as {
      clientes?: Record<string, FollowState>;
    };
    return Object.fromEntries(
      list.map((e) => [
        e,
        json.clientes?.[e] ?? {
          erro: "Sem resposta do ROSAN LIFE para este e-mail.",
        },
      ]),
    );
  } catch {
    return fail("Não foi possível falar com o ROSAN LIFE agora.");
  }
}

export const followFor = (
  map: Record<string, FollowState>,
  email: string | null | undefined,
) => (email ? map[email.trim().toLowerCase()] : undefined);

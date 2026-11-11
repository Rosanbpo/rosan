import Image from "next/image";
import { Check, X } from "lucide-react";
import { findPlan } from "@/domain/plans";
import { splitPair } from "@/domain/proposal";
import { fmtLocalDate, fmtMoney } from "@/lib/format";

export interface ProposalDocData {
  number: string;
  planName: string;
  companyName: string;
  contactName: string | null;
  intro: string | null;
  services: string[];
  volumes: string[];
  exclusions: string[];
  monthlyFee: number;
  billingDay: number;
  termMonths: number;
  validUntilLocal: string;
  notes: string | null;
  issuedOn: string; // AAAA-MM-DD
}

export interface IssuerData {
  name: string;
  legalName: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
}

function longDate(local: string) {
  const [y, m, d] = local.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function cnpjMask(v: string | null) {
  if (!v || v.length !== 14) return v ?? "";
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

const TOTAL_PAGES = 4;

function Header({ number }: { number: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <span className="doc-serif text-[11pt] tracking-[0.35em] text-[#0c1633]">ROSAN</span>
      <span className="text-[8pt] tracking-[0.2em] text-[#7a5a30] uppercase">Proposta nº {number}</span>
    </header>
  );
}

function Footer({ issuer, page }: { issuer: IssuerData; page: number }) {
  const contact = [issuer.email, issuer.phone, issuer.website].filter(Boolean).join("  ·  ");
  return (
    <footer className="doc-footer">
      <span>{contact || issuer.name}</span>
      <span>
        {page} / {TOTAL_PAGES}
      </span>
    </footer>
  );
}

export function ProposalDocument({ proposal: p, issuer }: { proposal: ProposalDocData; issuer: IssuerData }) {
  const plan = findPlan(p.planName);
  const services = p.services.map(splitPair);
  const volumes = p.volumes.map(splitPair);
  const hasMeeting = services.some((s) => /reuni/i.test(s.left));
  const intro =
    p.intro ??
    `Agradecemos a oportunidade. Esta proposta apresenta como a ${issuer.name} assume a rotina financeira da ${p.companyName}, para que você tenha números organizados e confiáveis e mais tempo para cuidar do que faz o negócio crescer.`;
  const steps = [
    { title: "Até o dia 5", text: "Você nos envia os documentos e acessos do mês." },
    { title: "Ao longo do mês", text: "Lançamos, conciliamos e controlamos pagamentos e recebimentos, com atendimento remoto de segunda a sexta, das 9h às 17h." },
    { title: "Até o 10º dia útil", text: "Entregamos o DRE gerencial e o fluxo de caixa do mês anterior." },
    ...(hasMeeting ? [{ title: "Reunião de resultados", text: "Analisamos os números juntos e definimos os próximos passos." }] : []),
  ];

  const conditions = [
    { label: "Pagamento", text: `Todo dia ${p.billingDay} de cada mês, por boleto ou PIX. O primeiro honorário é pago na assinatura do contrato.` },
    { label: "Vigência", text: `${p.termMonths} meses, com renovação automática por iguais períodos.` },
    { label: "Reajuste", text: `Anual, pela variação do IPCA, a partir do ${p.termMonths + 1}º mês de vigência.` },
    { label: "Volumes", text: "Os serviços respeitam os limites mensais do plano. Volumes acima deles são orçados à parte, como horas adicionais." },
    { label: "Cancelamento", text: "Qualquer das partes pode encerrar o contrato com aviso prévio de 30 dias." },
    { label: "Sigilo e LGPD", text: "Sigilo absoluto das informações e tratamento dos dados conforme a Lei nº 13.709/2018." },
  ];

  return (
    <>
      {/* PÁGINA 1 — CAPA */}
      <section className="doc-sheet doc-cover" aria-label="Capa">
        <div className="doc-frame" />
        <div className="flex w-full flex-1 flex-col items-center justify-center pt-[34mm]">
          <Image src="/logo.png" alt={issuer.name} width={620} height={530} priority unoptimized className="h-auto w-[104mm]" />
        </div>
        <div className="w-full px-[30mm] pb-[16mm] text-center">
          <div className="mx-auto mb-[9mm] h-[0.3mm] w-[40mm] bg-[#b08d57]" />
          <p className="doc-serif text-[20pt] tracking-[0.32em] text-[#f3e7cc]">PROPOSTA COMERCIAL</p>
          <p className="mt-[2mm] text-[9pt] tracking-[0.26em] text-[#b08d57] uppercase">Apoio administrativo financeiro · BPO</p>

          <p className="mt-[16mm] text-[8pt] tracking-[0.3em] text-[#b08d57] uppercase">Preparada para</p>
          <p className="doc-serif mt-[2mm] text-[22pt] leading-tight text-[#f3e7cc]">{p.companyName}</p>
          {p.contactName && <p className="mt-[1mm] text-[10pt] text-[#e6d1a5]">A/C {p.contactName}</p>}

          <div className="mt-[18mm] grid grid-cols-3 gap-[6mm] border-t border-[#b08d57]/40 pt-[5mm] text-[8.5pt]">
            <div>
              <p className="tracking-[0.2em] text-[#b08d57] uppercase">Proposta</p>
              <p className="mt-0.5 text-[#f3e7cc]">nº {p.number}</p>
            </div>
            <div>
              <p className="tracking-[0.2em] text-[#b08d57] uppercase">Emitida em</p>
              <p className="mt-0.5 text-[#f3e7cc]">{longDate(p.issuedOn)}</p>
            </div>
            <div>
              <p className="tracking-[0.2em] text-[#b08d57] uppercase">Válida até</p>
              <p className="mt-0.5 text-[#f3e7cc]">{fmtLocalDate(p.validUntilLocal)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PÁGINA 2 — NOSSA PROPOSTA */}
      <section className="doc-sheet" aria-label="Nossa proposta">
        <div className="doc-body">
          <Header number={p.number} />
          <p className="doc-eyebrow">01 · Nossa proposta</p>
          <h2 className="doc-h2">Finanças em ordem,<br />decisões com segurança</h2>
          <div className="doc-rule mt-4 w-[60mm]" />

          <p className="doc-serif mt-6 border-l-[1mm] border-[#b08d57] pl-5 text-[12.5pt] leading-relaxed text-[#0c1633]">{intro}</p>

          {plan && (
            <div className="doc-card mt-8">
              <p className="text-[8pt] font-semibold tracking-[0.2em] text-[#7a5a30] uppercase">{p.planName}</p>
              <p className="mt-1 text-[10pt]">{plan.audience}</p>
            </div>
          )}

          <p className="doc-eyebrow mt-10">02 · Seu mês com a {issuer.name}</p>
          <h2 className="doc-h2 !text-[17pt]">Uma rotina simples e previsível</h2>
          <ol className="mt-6 space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4" style={{ breakInside: "avoid" }}>
                <span className="doc-step-num">{i + 1}</span>
                <div>
                  <p className="text-[10.5pt] font-semibold text-[#0c1633]">{s.title}</p>
                  <p className="text-[9.5pt] text-[#4a5272]">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Footer issuer={issuer} page={2} />
      </section>

      {/* PÁGINA 3 — ESCOPO */}
      <section className="doc-sheet" aria-label="Escopo">
        <div className="doc-body">
          <Header number={p.number} />
          <p className="doc-eyebrow">03 · Escopo</p>
          <h2 className="doc-h2">O que está incluído</h2>
          <div className="doc-rule mt-4 w-[60mm]" />

          <ul className="mt-6 grid grid-cols-2 gap-[3mm]">
            {services.map((s) => (
              <li key={s.left} className="doc-card flex gap-3">
                <span className="mt-0.5 flex h-[5mm] w-[5mm] shrink-0 items-center justify-center rounded-full bg-[#0c1633] text-[#e6d1a5]">
                  <Check aria-hidden className="h-[3mm] w-[3mm]" strokeWidth={3} />
                </span>
                <div>
                  <p className="text-[9.5pt] font-semibold leading-snug text-[#0c1633]">{s.left}</p>
                  {s.right && <p className="mt-0.5 text-[8.5pt] leading-snug text-[#4a5272]">{s.right}</p>}
                </div>
              </li>
            ))}
          </ul>

          {volumes.length > 0 && (
            <div className="mt-7" style={{ breakInside: "avoid" }}>
              <p className="doc-eyebrow">Limites mensais do plano</p>
              <div className="mt-2 grid grid-cols-2 gap-x-6">
                {[volumes.slice(0, Math.ceil(volumes.length / 2)), volumes.slice(Math.ceil(volumes.length / 2))].map((col, c) => (
                  <ul key={c}>
                    {col.map((v, i) => (
                      <li key={v.left} className={`flex justify-between gap-3 px-3 py-1.5 text-[8.8pt] ${i % 2 === 0 ? "bg-[#faf4e8]" : ""}`}>
                        <span className="text-[#2b3350]">{v.left}</span>
                        <span className="shrink-0 font-semibold text-[#0c1633]">{v.right}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
              <p className="mt-2 text-[8pt] text-[#7a5a30]">Volumes acima dos limites são orçados separadamente.</p>
            </div>
          )}

        </div>
        <Footer issuer={issuer} page={3} />
      </section>

      {/* PÁGINA 4 — INVESTIMENTO */}
      <section className="doc-sheet" aria-label="Investimento">
        <div className="doc-body">
          <Header number={p.number} />
          <p className="doc-eyebrow">04 · Investimento</p>
          <h2 className="doc-h2">Seu plano e condições</h2>
          <div className="doc-rule mt-4 w-[60mm]" />

          <div className="mt-6 flex items-end justify-between rounded-[2mm] bg-[#0c1633] px-[9mm] py-[8mm] text-[#f3e7cc]">
            <div>
              <p className="text-[8pt] tracking-[0.3em] text-[#b08d57] uppercase">Investimento mensal</p>
              <p className="doc-serif mt-1 text-[34pt] leading-none">{fmtMoney(p.monthlyFee)}</p>
              <p className="mt-2 text-[9pt] text-[#e6d1a5]">
                {p.planName} · vigência de {p.termMonths} meses
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8pt] tracking-[0.2em] text-[#b08d57] uppercase">Proposta válida até</p>
              <p className="doc-serif mt-0.5 text-[13pt]">{fmtLocalDate(p.validUntilLocal)}</p>
            </div>
          </div>

          <p className="doc-eyebrow mt-8">Condições comerciais</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
            {conditions.map((c) => (
              <div key={c.label} style={{ breakInside: "avoid" }}>
                <dt className="text-[9pt] font-semibold text-[#0c1633]">{c.label}</dt>
                <dd className="text-[8.8pt] leading-snug text-[#4a5272]">{c.text}</dd>
              </div>
            ))}
          </dl>

          {p.exclusions.length > 0 && (
            <div className="mt-8" style={{ breakInside: "avoid" }}>
              <p className="doc-eyebrow">Fora do escopo</p>
              <ul className="mt-2 space-y-1">
                {p.exclusions.map((e) => (
                  <li key={e} className="flex gap-2 text-[9pt] text-[#4a5272]">
                    <X aria-hidden className="mt-[1.2mm] h-[3mm] w-[3mm] shrink-0 text-[#b08d57]" strokeWidth={3} />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.notes && (
            <div className="doc-card mt-6">
              <p className="text-[8pt] font-semibold tracking-[0.2em] text-[#7a5a30] uppercase">Observações</p>
              <p className="mt-1 text-[9pt] whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}

          <p className="doc-eyebrow mt-8">Próximos passos</p>
          <ol className="mt-3 flex gap-4">
            {["Aceite desta proposta", "Assinatura do contrato", "Início da rotina com a nossa equipe"].map((t, i) => (
              <li key={t} className="flex flex-1 items-start gap-3">
                <span className="doc-step-num">{i + 1}</span>
                <span className="pt-0.5 text-[9.3pt] leading-snug text-[#2b3350]">{t}</span>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid grid-cols-2 gap-14" style={{ breakInside: "avoid" }}>
            <div>
              <div className="h-[0.3mm] bg-[#0c1633]" />
              <p className="mt-1 text-[9pt] font-semibold text-[#0c1633]">De acordo — {p.companyName}</p>
              <p className="text-[8pt] text-[#7a5a30]">Nome, cargo e data</p>
            </div>
            <div>
              <div className="h-[0.3mm] bg-[#0c1633]" />
              <p className="mt-1 text-[9pt] font-semibold text-[#0c1633]">{issuer.legalName ?? issuer.name}</p>
              <p className="text-[8pt] text-[#7a5a30]">
                {[issuer.cnpj && `CNPJ ${cnpjMask(issuer.cnpj)}`, issuer.city].filter(Boolean).join(" · ") || "Contratada"}
              </p>
            </div>
          </div>
        </div>
        <Footer issuer={issuer} page={4} />
      </section>
    </>
  );
}

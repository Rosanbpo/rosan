import Image from "next/image";
import {
  fillTokens,
  longDate,
  settlementBalance,
  type Clause,
  type TokenVars,
} from "@/domain/contract";
import { splitPair } from "@/domain/proposal";
import { fmtMoney } from "@/lib/format";
import type { IssuerData } from "./proposal-document";

export interface ContractDocData {
  number: string;
  partyName: string;
  partyDocument: string | null;
  partyAddress: string | null;
  repName: string | null;
  repCpf: string | null;
  issuerRepName: string | null;
  issuerRepRole: string | null;
  issuerRepCpf: string | null;
  monthlyFee: number;
  billingDay: number;
  termMonths: number;
  startDate: string | null;
  signDate: string | null;
  signCity: string | null;
  services: string[];
  volumes: string[];
  clauses: Clause[];
  endDate: string | null;
  pendingMonthly: number | null;
  unbilled: number | null;
  credits: number | null;
  settleDays: number | null;
  distratoClauses: Clause[] | null;
}

function cnpjMask(v: string | null) {
  if (!v || v.length !== 14) return v ?? "";
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

const blank = (v: string | null | undefined, fill = "______________________________") => (v && v.trim() ? v : fill);

function Paragraphs({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- "));
        if (isList) {
          return (
            <ul key={i} className="mt-1 list-disc space-y-0.5 pl-6">
              {lines.map((l) => (
                <li key={l}>{l.trim().slice(2)}</li>
              ))}
            </ul>
          );
        }
        // Mistura de texto e itens na mesma linha de bloco.
        return (
          <div key={i} className={i > 0 ? "mt-2" : ""}>
            {lines.map((l, k) =>
              l.trim().startsWith("- ") ? (
                <p key={k} className="pl-6">
                  • {l.trim().slice(2)}
                </p>
              ) : (
                <p key={k}>{l}</p>
              ),
            )}
          </div>
        );
      })}
    </>
  );
}

function Letterhead({ issuer, title, subtitle, number }: { issuer: IssuerData; title: string; subtitle: string; number: string }) {
  return (
    <header className="mb-6 overflow-hidden rounded-[1.5mm]">
      <div className="flex items-center gap-5 bg-[#0c1633] px-6 py-4">
        <Image src="/logo.png" alt={issuer.name} width={620} height={530} unoptimized className="h-auto w-[30mm] shrink-0" />
        <div className="h-[22mm] w-px shrink-0 bg-gradient-to-b from-transparent via-[#b08d57] to-transparent" />
        <div className="min-w-0 flex-1">
          <p className="text-[7pt] tracking-[0.3em] text-[#b08d57] uppercase">{subtitle}</p>
          <h1 className="doc-serif mt-1 text-[14.5pt] leading-snug text-[#f3e7cc]">{title}</h1>
          <p className="mt-1.5 text-[7.5pt] tracking-[0.2em] text-[#b08d57] uppercase">Instrumento nº {number}</p>
        </div>
      </div>
      <div className="h-[0.9mm] bg-gradient-to-r from-[#b08d57] via-[#e6d1a5] to-[#b08d57]" />
    </header>
  );
}

function Parties({ c, issuer }: { c: ContractDocData; issuer: IssuerData }) {
  return (
    <section className="doc-clause">
      <h2 className="doc-keep mt-2 text-[9.6pt] font-bold tracking-wide text-[#0c1633]">I — DAS PARTES</h2>
      <p className="mt-2">
        <strong>CONTRATANTE:</strong> <strong>{c.partyName}</strong>, inscrita no CNPJ/CPF sob o nº {blank(c.partyDocument, "____________________")}, com endereço em {blank(c.partyAddress, "______________________________________")}, neste ato representada por {blank(c.repName, "______________________")}, CPF nº {blank(c.repCpf, "______________")}.
      </p>
      <p className="mt-2">
        <strong>CONTRATADA:</strong> <strong>{issuer.legalName ?? issuer.name}</strong>
        {issuer.cnpj ? `, inscrita no CNPJ sob o nº ${cnpjMask(issuer.cnpj)}` : ""}
        {issuer.email ? `, e-mail ${issuer.email}` : ""}, neste ato representada por {blank(c.issuerRepName, "______________________")}, {blank(c.issuerRepRole, "sócio(a) administrador(a)")}, CPF nº {blank(c.issuerRepCpf, "______________")}.
      </p>
    </section>
  );
}

function Table({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="mt-2 w-full border-collapse text-[9pt]">
      <thead>
        <tr className="bg-[#0c1633] text-[#f3e7cc]">
          <th className="px-2 py-1 text-left font-semibold">{head[0]}</th>
          <th className="px-2 py-1 text-left font-semibold">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={`${a}-${i}`} className={i % 2 === 0 ? "bg-[#faf4e8]" : ""}>
            <td className="px-2 py-1">{a}</td>
            <td className="px-2 py-1">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Block({ kind, c }: { kind: NonNullable<Clause["block"]>; c: ContractDocData }) {
  if (kind === "services") {
    return (
      <Table
        head={["Serviço", "Descrição / escopo"]}
        rows={c.services.map((s) => {
          const { left, right } = splitPair(s);
          return [left, right ?? ""];
        })}
      />
    );
  }
  if (kind === "fee") {
    return (
      <div className="mt-2 rounded bg-[#0c1633] px-4 py-3 text-[#f3e7cc]">
        <p className="text-[7.5pt] tracking-[0.2em] text-[#b08d57] uppercase">Mensalidade contratada</p>
        <p className="doc-serif text-[17pt] leading-tight">{fmtMoney(c.monthlyFee)}</p>
        <p className="text-[8.5pt] text-[#e6d1a5]">Pagamento até o dia {c.billingDay} de cada mês, por boleto ou PIX.</p>
      </div>
    );
  }
  if (kind === "volumes") {
    if (!c.volumes.length) return null;
    return (
      <Table
        head={["Serviço", "Limite mensal"]}
        rows={c.volumes.map((v) => {
          const { left, right } = splitPair(v);
          return [left, right ?? ""];
        })}
      />
    );
  }
  const money = (n: number | null) => (n === null ? "R$ ____________" : fmtMoney(n));
  const balance = c.pendingMonthly === null && c.unbilled === null && c.credits === null ? null : settlementBalance(c);
  return (
    <Table
      head={["Item", "Valor / situação"]}
      rows={[
        ["Mensalidades em aberto até a data de encerramento", money(c.pendingMonthly)],
        ["Serviços já executados e não faturados", money(c.unbilled)],
        ["Eventuais créditos ou valores a devolver à CONTRATANTE", money(c.credits)],
        ["Saldo final de quitação", money(balance)],
      ]}
    />
  );
}

function Clauses({ clauses, c, vars }: { clauses: Clause[]; c: ContractDocData; vars: TokenVars }) {
  return (
    <>
      {clauses.map((cl, i) => (
        <section key={i} className="doc-clause">
          {cl.section && <h2 className="doc-keep mt-5 text-[9.6pt] font-bold tracking-wide text-[#0c1633]">{cl.section}</h2>}
          <h3 className="mt-3 font-semibold text-[#7a5a30]">
            CLÁUSULA {i + 1}ª — {cl.title}
          </h3>
          <div className="mt-0.5 text-justify">
            <Paragraphs text={fillTokens(cl.text, vars)} />
          </div>
          {cl.block && <Block kind={cl.block} c={c} />}
          {cl.footnote && (
            <div className="mt-2 text-justify">
              <Paragraphs text={fillTokens(cl.footnote, vars)} />
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function Signatures({ c, issuer }: { c: ContractDocData; issuer: IssuerData }) {
  return (
    <section className="doc-sign mt-8">
      <p className="doc-keep text-justify">
        E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma.
      </p>
      <p className="doc-keep mt-4">
        {blank(c.signCity, "____________________")}, {longDate(c.signDate)}.
      </p>
      <div className="mt-14 grid grid-cols-2 gap-12">
        <div>
          <div className="h-px bg-[#0c1633]" />
          <p className="mt-1 text-[9pt] font-semibold">{issuer.legalName ?? issuer.name}</p>
          <p className="text-[8.5pt] text-[#4a5272]">
            {blank(c.issuerRepName, "Representante")} · {blank(c.issuerRepRole, "Representante legal")}
          </p>
          <p className="text-[8.5pt] text-[#7a5a30]">CONTRATADA</p>
        </div>
        <div>
          <div className="h-px bg-[#0c1633]" />
          <p className="mt-1 text-[9pt] font-semibold">{c.partyName}</p>
          <p className="text-[8.5pt] text-[#4a5272]">{blank(c.repName, "Representante legal")}</p>
          <p className="text-[8.5pt] text-[#7a5a30]">CONTRATANTE</p>
        </div>
      </div>
    </section>
  );
}

export function ContractDocument({ contract: c, issuer }: { contract: ContractDocData; issuer: IssuerData }) {
  const vars: TokenVars = {
    inicio: c.startDate,
    vigenciaMeses: c.termMonths,
    diaPagamento: c.billingDay,
    cidade: c.signCity,
  };
  return (
    <article className="doc-flow" aria-label="Contrato de prestação de serviços">
      <Letterhead issuer={issuer} number={c.number} title="Contrato de Prestação de Serviços de Apoio Administrativo Financeiro" subtitle="Instrumento particular" />
      <Parties c={c} issuer={issuer} />
      <Clauses clauses={c.clauses} c={c} vars={vars} />
      <Signatures c={c} issuer={issuer} />
    </article>
  );
}

export function DistratoDocument({ contract: c, issuer }: { contract: ContractDocData; issuer: IssuerData }) {
  const vars: TokenVars = {
    cidade: c.signCity,
    dataContrato: c.startDate ?? c.signDate,
    encerramento: c.endDate,
    prazoQuitacao: c.settleDays,
  };
  return (
    <article className="doc-flow" aria-label="Distrato">
      <Letterhead issuer={issuer} number={c.number} title="Distrato de Contrato de Prestação de Serviços de Apoio Administrativo Financeiro" subtitle="Rescisão amigável — instrumento particular" />
      <Parties c={c} issuer={issuer} />
      <Clauses clauses={c.distratoClauses ?? []} c={c} vars={vars} />
      <section className="doc-sign mt-8">
        <p className="doc-keep text-justify">
          E, por estarem assim justas e distratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma.
        </p>
        <p className="doc-keep mt-4">{blank(c.signCity, "____________________")}, ___ de ____________ de 20___.</p>
        <div className="mt-14 grid grid-cols-2 gap-12">
          <div>
            <div className="h-px bg-[#0c1633]" />
            <p className="mt-1 text-[9pt] font-semibold">{issuer.legalName ?? issuer.name}</p>
            <p className="text-[8.5pt] text-[#7a5a30]">CONTRATADA</p>
          </div>
          <div>
            <div className="h-px bg-[#0c1633]" />
            <p className="mt-1 text-[9pt] font-semibold">{c.partyName}</p>
            <p className="text-[8.5pt] text-[#7a5a30]">CONTRATANTE</p>
          </div>
        </div>
      </section>
    </article>
  );
}

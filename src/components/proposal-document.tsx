import Image from "next/image";
import { Check, X } from "lucide-react";
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

function cnpjMask(v: string | null) {
  if (!v || v.length !== 14) return v ?? "";
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

/** Proposta comercial em uma única folha A4, com a identidade da Rosan Finanças. */
export function ProposalDocument({ proposal: p, issuer }: { proposal: ProposalDocData; issuer: IssuerData }) {
  const services = p.services.map(splitPair);
  const volumes = p.volumes.map(splitPair);
  // Conteúdo extenso usa tipografia um pouco menor para continuar cabendo em uma folha.
  const dense = services.length > 10 || services.length + volumes.length > 18;
  const intro =
    p.intro ??
    `Agradecemos a oportunidade. Apresentamos como a ${issuer.name} assume a rotina financeira da ${p.companyName}, com números organizados e confiáveis para você decidir com segurança.`;

  const conditions = [
    { label: "Pagamento", text: `Todo dia ${p.billingDay}, por boleto ou PIX. O primeiro honorário é pago na assinatura do contrato.` },
    { label: "Vigência", text: `Contrato inicial de ${p.termMonths} meses, com renovação automática. Aviso prévio de 30 dias para encerrar.` },
    { label: "Revisão do plano", text: "Após 3 meses, analisamos juntos os limites do plano e os ajustamos, se necessário." },
    { label: "Reajuste", text: `Anual, pelo IPCA, a partir do 13º mês de contrato.` },
    { label: "Atendimento", text: "Remoto, de segunda a sexta, das 9h às 17h." },
    { label: "Sigilo e LGPD", text: "Sigilo das informações e tratamento de dados conforme a Lei nº 13.709/2018." },
  ];

  const contact = [issuer.email, issuer.phone, issuer.website].filter(Boolean).join("  ·  ");

  return (
    <section className="doc-sheet doc-one" aria-label="Proposta comercial">
      {/* Faixa de topo */}
      <header className="flex h-[40mm] items-center justify-between bg-[#0c1633] px-[14mm] text-[#f3e7cc]">
        <Image src="/logo.png" alt={issuer.name} width={620} height={530} priority unoptimized className="h-auto w-[38mm]" />
        <div className="text-right">
          <p className="text-[7.5pt] tracking-[0.3em] text-[#b08d57] uppercase">Proposta comercial · nº {p.number}</p>
          <p className="doc-serif mt-[1.5mm] text-[19pt] leading-tight">{p.companyName}</p>
          {p.contactName && <p className="mt-[0.5mm] text-[9pt] text-[#e6d1a5]">A/C {p.contactName}</p>}
          <p className="mt-[2.5mm] text-[7.5pt] tracking-[0.12em] text-[#b08d57] uppercase">
            Emitida em {fmtLocalDate(p.issuedOn)} · válida até {fmtLocalDate(p.validUntilLocal)}
          </p>
        </div>
      </header>
      <div className="h-[0.8mm] bg-gradient-to-r from-[#b08d57] via-[#e6d1a5] to-[#b08d57]" />

      <div className="px-[14mm] pt-[5mm]">
        {/* Abertura + investimento */}
        <div className="grid grid-cols-[1fr_64mm] gap-[6mm]">
          <div>
            <p className="doc-eyebrow">Nossa proposta</p>
            <p className="doc-serif mt-[1.5mm] border-l-[1mm] border-[#b08d57] pl-[4mm] text-[10.5pt] leading-snug text-[#0c1633]">{intro}</p>
          </div>
          <div className="rounded-[1.5mm] bg-[#0c1633] px-[5mm] py-[4.5mm] text-[#f3e7cc]">
            <p className="text-[7pt] tracking-[0.28em] text-[#b08d57] uppercase">Investimento mensal</p>
            <p className="doc-serif mt-[1mm] text-[25pt] leading-none">{fmtMoney(p.monthlyFee)}</p>
            <p className="mt-[1.8mm] text-[8pt] text-[#e6d1a5]">
              Contrato inicial de {p.termMonths} meses
            </p>
          </div>
        </div>

        {/* Serviços */}
        <p className="doc-eyebrow mt-[5mm]">O que está incluído</p>
        <ul className={`mt-[2mm] grid grid-cols-2 ${dense ? "gap-[1.6mm]" : "gap-[2.2mm]"}`}>
          {services.map((s) => (
            <li key={s.left} className={`doc-card flex items-start gap-[2.5mm] ${dense ? "!px-[3mm] !py-[1.3mm]" : "!px-[3mm] !py-[1.9mm]"}`}>
              <span className="mt-[0.4mm] flex h-[4mm] w-[4mm] shrink-0 items-center justify-center rounded-full bg-[#0c1633] text-[#e6d1a5]">
                <Check aria-hidden className="h-[2.5mm] w-[2.5mm]" strokeWidth={3.2} />
              </span>
              <div>
                <p className={`${dense ? "text-[8.3pt]" : "text-[8.8pt]"} font-semibold leading-tight text-[#0c1633]`}>{s.left}</p>
                {s.right && <p className={`${dense ? "text-[7.3pt]" : "text-[7.8pt]"} leading-tight text-[#4a5272]`}>{s.right}</p>}
              </div>
            </li>
          ))}
        </ul>

        {/* Limites + condições */}
        <div className="mt-[5mm] grid grid-cols-2 gap-[7mm]">
          <div>
            <p className="doc-eyebrow">Limites mensais do plano</p>
            {volumes.length > 0 ? (
              <ul className="mt-[2mm]">
                {volumes.map((v, i) => (
                  <li key={v.left} className={`flex justify-between gap-3 px-[2.5mm] ${dense ? "py-[0.7mm] text-[7.8pt]" : "py-[1mm] text-[8.3pt]"} ${i % 2 === 0 ? "bg-[#faf4e8]" : ""}`}>
                    <span className="text-[#2b3350]">{v.left}</span>
                    <span className="shrink-0 font-semibold text-[#0c1633]">{v.right}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-[2mm] text-[8.3pt] text-[#4a5272]">Definidos em contrato.</p>
            )}
            <p className="mt-[1.5mm] text-[7.3pt] text-[#7a5a30]">Volumes acima dos limites são orçados à parte.</p>
          </div>
          <div>
            <p className="doc-eyebrow">Condições comerciais</p>
            <dl className="mt-[2mm] space-y-[1.8mm]">
              {conditions.map((c) => (
                <div key={c.label}>
                  <dt className={`${dense ? "text-[7.8pt]" : "text-[8.3pt]"} font-semibold leading-tight text-[#0c1633]`}>{c.label}</dt>
                  <dd className={`${dense ? "text-[7.3pt]" : "text-[7.8pt]"} leading-tight text-[#4a5272]`}>{c.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Fora do escopo + observações */}
        {p.exclusions.length > 0 && (
          <div className="mt-[3.5mm]">
            <p className="doc-eyebrow">Fora do escopo</p>
            <ul className="mt-[1.5mm] grid grid-cols-2 gap-x-[7mm] gap-y-[0.6mm]">
              {p.exclusions.map((e) => (
                <li key={e} className="flex gap-[1.5mm] text-[7.6pt] leading-tight text-[#4a5272]">
                  <X aria-hidden className="mt-[0.5mm] h-[2.6mm] w-[2.6mm] shrink-0 text-[#b08d57]" strokeWidth={3.2} />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.notes && <p className="mt-[3mm] border-l-[1mm] border-[#e6d1a5] pl-[3mm] text-[7.8pt] whitespace-pre-wrap text-[#4a5272]">{p.notes}</p>}

        {/* Aceite */}
        <div className="mt-[6mm] grid grid-cols-2 gap-[14mm]">
          <div>
            <div className="h-[0.3mm] bg-[#0c1633]" />
            <p className="mt-[1mm] text-[8.3pt] font-semibold text-[#0c1633]">De acordo — {p.companyName}</p>
            <p className="text-[7.3pt] text-[#7a5a30]">Nome, cargo e data</p>
          </div>
          <div>
            <div className="h-[0.3mm] bg-[#0c1633]" />
            <p className="mt-[1mm] text-[8.3pt] font-semibold text-[#0c1633]">{issuer.legalName ?? issuer.name}</p>
            <p className="text-[7.3pt] text-[#7a5a30]">
              {[issuer.cnpj && `CNPJ ${cnpjMask(issuer.cnpj)}`, issuer.city].filter(Boolean).join(" · ") || "Contratada"}
            </p>
          </div>
        </div>
      </div>

      <footer className="doc-footer !right-[14mm] !left-[14mm] !bottom-[7mm]">
        <span>{contact || issuer.name}</span>
        <span>Proposta nº {p.number}</span>
      </footer>
    </section>
  );
}

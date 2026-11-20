export type DiagData = {
  regime?: string; revenue?: unknown; bankAccounts?: number; statementLines?: number; entries?: number; employees?: number;
  inventory?: boolean; multiCnpj?: boolean; cardsAndMarketplaces?: boolean; wantsReports?: boolean; books?: string; catchUpMonths?: number;
  banks?: string | null; platforms?: string | null; cards?: string | null; notes?: string | null;
} | null;

const field = "block text-sm";
const lbl = "font-medium text-slate-700";

/** Campos do diagnóstico, usados no lançamento manual e no formulário público do cliente. */
export function DiagnosisFields({ d, simple = false }: { d: DiagData; simple?: boolean }) {
  const num = (name: string, label: string, v: number | undefined, hint?: string) => (
    <label className={field}><span className={lbl}>{label}</span><input name={name} type="number" min={0} defaultValue={v ?? 0} className="input mt-1" />{hint && <span className="text-xs text-slate-500">{hint}</span>}</label>
  );
  const chk = (name: string, label: string, v: boolean | undefined) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={v ?? false} /> {label}</label>
  );
  const area = (name: string, label: string, v: string | null | undefined, ph: string) => (
    <label className={field}><span className={lbl}>{label}</span><textarea name={name} rows={2} defaultValue={v ?? ""} placeholder={ph} className="input mt-1" /></label>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className={field}><span className={lbl}>Regime tributário</span>
          <select name="regime" defaultValue={d?.regime ?? "SIMPLES"} className="input mt-1">
            <option value="MEI">MEI</option><option value="SIMPLES">Simples Nacional</option><option value="PRESUMIDO">Lucro Presumido</option><option value="REAL">Lucro Real</option>
          </select></label>
        <label className={field}><span className={lbl}>Faturamento mensal (R$)</span><input name="revenue" inputMode="decimal" defaultValue={d?.revenue ? String(Number(d.revenue)).replace(".", ",") : ""} className="input mt-1" placeholder="50.000,00" /></label>
        <label className={field}><span className={lbl}>Como está o financeiro hoje</span>
          <select name="books" defaultValue={d?.books ?? "ORGANIZADA"} className="input mt-1">
            <option value="ORGANIZADA">Organizado</option><option value="PARCIAL">Parcialmente organizado</option><option value="DESORGANIZADA">Desorganizado</option>
          </select></label>
        {num("bankAccounts", "Contas bancárias e cartões", d?.bankAccounts)}
        {num("statementLines", "Linhas de extrato por mês", d?.statementLines, "Soma de todas as contas.")}
        {num("entries", "Contas a pagar/receber por mês", d?.entries)}
        {num("employees", "Funcionários", d?.employees)}
        {num("catchUpMonths", "Meses atrasados para colocar em dia", d?.catchUpMonths)}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {chk("inventory", "Tem estoque", d?.inventory)}
        {chk("multiCnpj", "Mais de um CNPJ", d?.multiCnpj)}
        {chk("cardsAndMarketplaces", "Cartões, marketplaces ou maquininhas", d?.cardsAndMarketplaces)}
        {chk("wantsReports", "Quer relatórios (DRE e fluxo de caixa)", d?.wantsReports ?? true)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {area("banks", "Bancos", d?.banks, "Ex.: Itaú PJ, Santander, Inter")}
        {area("platforms", "Plataformas e sistemas", d?.platforms, "Ex.: Mercado Livre, Shopee, Conta Azul")}
        {area("cards", "Cartões e maquininhas", d?.cards, "Ex.: Visa final 1234, Stone, Cielo")}
      </div>
      {!simple && area("notes", "Observações", d?.notes, "Qualquer detalhe que afete o trabalho")}
      {simple && area("notes", "Algo mais que a gente deva saber?", d?.notes, "Opcional")}
    </div>
  );
}

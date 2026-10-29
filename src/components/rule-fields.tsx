"use client";

import { useState } from "react";
import {
  FREQUENCIES,
  FREQUENCY_LABEL,
  NON_BUSINESS_RULES,
  NON_BUSINESS_RULE_LABEL,
  WEEKDAY_LABEL,
  type Frequency,
} from "@/domain/enums";
import { Field, FieldError } from "./ui/action-form";

export interface RuleValues {
  frequency: Frequency;
  weekdays: number[];
  monthDays: number[];
  nthBusinessDay: number | null;
  dueTime: string;
  leadDays: number;
  startOffsetDays: number;
  nonBusinessDayRule: "ANTICIPATE" | "POSTPONE";
}

export const DEFAULT_RULE: RuleValues = {
  frequency: "MONTHLY_DAY",
  weekdays: [1],
  monthDays: [5],
  nthBusinessDay: 5,
  dueTime: "18:00",
  leadDays: 3,
  startOffsetDays: 0,
  nonBusinessDayRule: "POSTPONE",
};

/** Campos de regra de recorrência (frequência, prazo e antecedência). */
export function RuleFields({ values, keyPrefix = "" }: { values: RuleValues; keyPrefix?: string }) {
  const [frequency, setFrequency] = useState<Frequency>(values.frequency);
  const id = (n: string) => `${keyPrefix}${n}`;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Frequência" name="frequency" required>
        <select
          id={id("frequency")}
          name="frequency"
          className="input"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABEL[f]}
            </option>
          ))}
        </select>
      </Field>

      <div className="md:col-span-2">
        {frequency === "WEEKLY" && (
          <fieldset>
            <legend className="label">Dias da semana</legend>
            <div className="flex flex-wrap gap-3">
              {WEEKDAY_LABEL.map((label, i) => (
                <label key={i} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="weekdays" value={i} defaultChecked={values.weekdays.includes(i)} />
                  {label}
                </label>
              ))}
            </div>
            <FieldError name="weekdays" />
          </fieldset>
        )}
        {frequency === "BIWEEKLY" && (
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="label">Duas datas do mês</legend>
            {[0, 1].map((i) => (
              <div key={i}>
                <label className="sr-only" htmlFor={id(`md${i}`)}>
                  {i === 0 ? "Primeira data" : "Segunda data"}
                </label>
                <input
                  id={id(`md${i}`)}
                  type="number"
                  name="monthDays"
                  min={1}
                  max={31}
                  required
                  className="input"
                  defaultValue={values.monthDays[i] ?? (i === 0 ? 15 : 30)}
                />
              </div>
            ))}
          </fieldset>
        )}
        {frequency === "MONTHLY_DAY" && (
          <Field label="Dia do mês" name="monthDays" hint="Em meses mais curtos, usa o último dia do mês antes de aplicar a regra de dia útil.">
            <input id="monthDays" type="number" name="monthDays" min={1} max={31} required className="input" defaultValue={values.monthDays[0] ?? 5} />
          </Field>
        )}
        {frequency === "MONTHLY_NTH_BUSINESS_DAY" && (
          <Field label="Enésimo dia útil" name="nthBusinessDay" hint="Considera fins de semana e o calendário de feriados cadastrado.">
            <input id="nthBusinessDay" type="number" name="nthBusinessDay" min={1} max={23} required className="input" defaultValue={values.nthBusinessDay ?? 5} />
          </Field>
        )}
        {frequency === "DAILY_BUSINESS" && (
          <p className="pt-7 text-sm text-slate-600">Uma tarefa por dia útil (segunda a sexta, exceto feriados cadastrados).</p>
        )}
      </div>

      <Field label="Horário do prazo" name="dueTime" required hint="Fuso America/Sao_Paulo">
        <input id={id("dueTime")} type="time" name="dueTime" required className="input" defaultValue={values.dueTime} />
      </Field>
      <Field label="Antecedência de geração (dias)" name="leadDays" hint="Quantos dias antes do prazo a tarefa é criada.">
        <input id={id("leadDays")} type="number" name="leadDays" min={0} max={60} required className="input" defaultValue={values.leadDays} />
      </Field>
      <Field label="Início da execução (dias antes do prazo)" name="startOffsetDays">
        <input id={id("startOffsetDays")} type="number" name="startOffsetDays" min={0} max={60} required className="input" defaultValue={values.startOffsetDays} />
      </Field>
      {frequency !== "DAILY_BUSINESS" && frequency !== "MONTHLY_NTH_BUSINESS_DAY" ? (
        <Field label="Se cair em fim de semana ou feriado" name="nonBusinessDayRule" className="md:col-span-3">
          <select id={id("nbd")} name="nonBusinessDayRule" className="input" defaultValue={values.nonBusinessDayRule}>
            {NON_BUSINESS_RULES.map((r) => (
              <option key={r} value={r}>
                {NON_BUSINESS_RULE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="nonBusinessDayRule" value={values.nonBusinessDayRule} />
      )}
    </div>
  );
}

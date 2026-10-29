import { CATEGORY_LABEL, PRIORITY_LABEL, TASK_CATEGORIES, PRIORITIES } from "@/domain/enums";

export function Select({
  name,
  label,
  value,
  options,
  placeholder = "Todos",
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label text-xs">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="input">
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const categoryOptions = TASK_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));
export const priorityOptions = [...PRIORITIES].reverse().map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));

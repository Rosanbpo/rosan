import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { deleteAppointmentAction, saveAppointmentAction } from "@/app/actions/agenda";

export function AppointmentForm({
  id,
  values,
  clients,
}: {
  id: string | null;
  values: { title: string; date: string; startTime: string; endTime: string; notes: string; clientId: string };
  clients: { id: string; tradeName: string }[];
}) {
  return (
    <div className="max-w-xl">
      <ActionForm action={saveAppointmentAction.bind(null, id)} className="card space-y-4 p-5" showSuccess={false}>
        <label className="block text-sm">
          <span className="label">Título</span>
          <input name="title" required maxLength={200} defaultValue={values.title} className="input mt-1" placeholder="Ex.: Reunião com a Amanda" autoFocus />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm">
            <span className="label">Dia</span>
            <input name="date" type="date" required defaultValue={values.date} className="input mt-1" />
          </label>
          <label className="block text-sm">
            <span className="label">Início</span>
            <input name="startTime" type="time" defaultValue={values.startTime} className="input mt-1" />
          </label>
          <label className="block text-sm">
            <span className="label">Fim</span>
            <input name="endTime" type="time" defaultValue={values.endTime} className="input mt-1" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="label">Cliente (opcional)</span>
          <select name="clientId" defaultValue={values.clientId} className="input mt-1">
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.tradeName}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label">Observações</span>
          <textarea name="notes" rows={3} maxLength={2000} defaultValue={values.notes} className="input mt-1" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Salvar</button>
          <Link href="/agenda" className="btn-secondary">Cancelar</Link>
        </div>
      </ActionForm>
      {id && (
        <form action={deleteAppointmentAction.bind(null, id)} className="mt-3">
          <button type="submit" className="btn border border-red-200 bg-white text-red-700 hover:bg-red-50">Excluir compromisso</button>
        </form>
      )}
    </div>
  );
}

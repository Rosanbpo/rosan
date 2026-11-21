import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout";
import { CopyButton } from "@/components/copy-button";
import {
  deleteMaterialAction, deleteSharedMessageAction, moveTrainingItemAction, removeTrainingItemAction, resetSystemMessageAction,
  saveAccessAction, saveMaterialAction, saveSharedMessageAction, saveSystemMessageAction, toggleTrainingAction, updateTrainingItemAction, addTrainingItemAction,
} from "@/app/actions/biblioteca";
import { LEAD_STAGES, LEAD_STAGE_LABEL, STAGE_LABEL, type JourneyStage } from "@/domain/enums";
import { LIBRARY_SECTIONS, TRAINING_PHASES } from "@/domain/library";
import { can } from "@/domain/permissions";
import { MESSAGE_VARS } from "@/domain/crm-messages";
import { STAGE_TONE } from "@/lib/ui";
import { cx, TONE } from "@/lib/ui";
import { requireActor } from "@/server/context";
import { structureOverview } from "@/server/services/structure";
import { setReviewAction } from "@/app/actions/biblioteca";
import {
  accessMatrix, allowedSections, journeyOverview, listMaterials, listSharedMessages, MATERIAL_CATEGORIES, systemMessagesFor, templatesWithoutStage,
} from "@/server/services/library";
import { listProcedures } from "@/server/services/procedures";
import { journeyTaskOptions, listAssets } from "@/server/services/journey";
import { deleteAssetAction, saveAssetAction } from "@/app/actions/journey";
import { ASSET_EMOJI, ASSET_KINDS, ASSET_LABEL, ASSET_VARS, type AssetKind } from "@/domain/journey-assets";
import { JOURNEY_STAGES } from "@/domain/enums";
import { trainingItems, trainingTeam } from "@/server/services/training";
import { getCulture } from "@/server/services/culture";

export const metadata = { title: "Estrutura Rosan" };

type SP = Record<string, string | undefined>;
const EMOJI: Record<string, string> = { "Contratos e propostas": "📑", "E-mails e mensagens": "✉️", "Roteiros de reunião": "🎙️", "Planilhas e modelos": "📊", "Documentos e checklists": "✅", "Políticas e regras": "⚖️", "Links úteis": "🔗", Outros: "📎" };
const label = "text-sm font-medium text-slate-700";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const allowed = await allowedSections(actor);
  const admin = can(actor, "templates.manage");
  const tabs: Array<{ key: string; label: string; emoji: string }> = [
    ...(admin ? [{ key: "visao", label: "Visão geral", emoji: "✅" }] : []),
    ...LIBRARY_SECTIONS.filter((s) => allowed.includes(s.key)),
    ...(can(actor, "users.manage") ? [{ key: "acessos", label: "Quem vê o quê", emoji: "🔐" }] : []),
  ];
  if (tabs.length === 0) {
    return (<><PageHeader title="Estrutura Rosan" /><p className="card p-5 text-sm text-slate-600">Ainda não há nada liberado para você. Peça à administradora para liberar as áreas da biblioteca.</p></>);
  }
  const current = tabs.find((t) => t.key === sp.secao) ?? tabs[0];
  if (sp.secao && sp.secao !== current.key) redirect(`/biblioteca?secao=${current.key}`);
  const section = LIBRARY_SECTIONS.find((s) => s.key === current.key);

  return (
    <>
      <PageHeader title="Estrutura Rosan" description="Toda a estrutura da Rosan num lugar só: jornada, mensagens, e-mails, documentos, processos, trilha e o que falta validar." />
      <nav aria-label="Áreas da biblioteca" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.key} href={`/biblioteca?secao=${t.key}`} className={cx("rounded-full border px-4 py-1.5 text-sm font-medium transition", t.key === current.key ? "border-brand-700 bg-brand-700 text-white" : "border-hair bg-white text-slate-700 hover:border-brand-300")}>
            {t.emoji} {t.label}
          </Link>
        ))}
      </nav>
      {section && <p className="mb-4 text-sm text-slate-500">{section.desc}{admin ? "" : " Somente leitura."}</p>}
      {sp.ok && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Salvo.</p>}
      {sp.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}

      {current.key === "visao" && <Overview actor={actor} filtro={sp.filtro} />}
      {current.key === "jornada" && <Journey actor={actor} admin={admin} />}
      {current.key === "padroes" && <Patterns actor={actor} admin={admin} />}
      {current.key === "mensagens" && <Messages actor={actor} admin={admin} />}
      {current.key === "materiais" && <Materials actor={actor} admin={admin} q={sp.q} />}
      {current.key === "pops" && <Pops actor={actor} />}
      {current.key === "trilha" && <Trail actor={actor} />}
      {current.key === "cultura" && <Culture actor={actor} admin={admin} />}
      {current.key === "acessos" && <Access actor={actor} />}
    </>
  );
}

type Actor = Awaited<ReturnType<typeof requireActor>>;

/* ------------------------------------------------------------------ Jornada */
async function Journey({ actor, admin }: { actor: Actor; admin: boolean }) {
  const [stages, loose] = await Promise.all([journeyOverview(actor), templatesWithoutStage(actor)]);
  const canSee = can(actor, "projects.manage");
  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">
        🧭 A jornada vai da venda ao encerramento. Em cada etapa você vê as <b>esteiras</b> (passo a passo com prazo em dias a partir da data de início) e os <b>modelos de rotina</b> (com a regra de prazo de cada um). Em caso de dúvida, consulte aqui.
      </p>
      {stages.map((st, i) => {
        const tone = TONE[STAGE_TONE[st.stage as JourneyStage] as keyof typeof TONE];
        return (
          <section key={st.stage} className={cx("rounded-2xl border bg-white", tone.border)}>
            <header className={cx("flex items-center gap-3 rounded-t-2xl px-4 py-2.5", tone.soft)}>
              <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white", tone.solid)}>{i + 1}</span>
              <h2 className={cx("text-base font-semibold", tone.text)}>{STAGE_LABEL[st.stage as JourneyStage]}</h2>
            </header>
            <div className="space-y-3 p-4">
              {st.esteiras.length === 0 && st.templates.length === 0 && <p className="text-sm text-slate-400">Nada cadastrado nesta etapa ainda.</p>}
              {st.esteiras.map((e) => (
                <article key={e.slug} className="rounded-xl border border-hair p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-brand-900">🛤️ {e.name}</h3>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">⏱️ prazo total: {e.totalDays} dias</span>
                    {e.custom && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">personalizada</span>}
                    <span className="ml-auto flex gap-3 text-xs">
                      {canSee && <Link href={`/esteiras/${e.slug}`} className="text-brand-700 hover:underline">Abrir</Link>}
                      {admin && <Link href={`/esteiras/${e.slug}/editar`} className="text-brand-700 hover:underline">✏️ Editar</Link>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{e.summary}</p>
                  <ol className="mt-2 space-y-1.5">
                    {e.stages.map((s, k) => (
                      <li key={k}>
                        <details className="rounded-lg bg-slate-50 px-3 py-1.5">
                          <summary className="cursor-pointer text-sm font-medium text-slate-800">
                            {s.name} <span className="ml-1 rounded bg-white px-1.5 py-0.5 text-xs text-slate-600">{s.from === s.to ? `dia ${s.from}` : `dia ${s.from} a ${s.to}`}</span> <span className="text-xs text-slate-400">· {s.tasks.length} tarefas</span>
                          </summary>
                          <ul className="mt-1.5 space-y-1 pb-1 text-sm">
                            {s.tasks.map((t, n) => (
                              <li key={n} className="flex items-baseline gap-2">
                                <span className="w-14 shrink-0 text-xs font-semibold text-amber-800">dia {t.day}</span>
                                <span className="flex-1 text-slate-700">{t.title}</span>
                                <span className="shrink-0 text-xs text-slate-400">{t.minutes} min · {t.items} itens</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
              {st.templates.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-slate-700">🔁 Modelos de rotina desta etapa</h3>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {st.templates.map((t) => (
                      <li key={t.id} className="rounded-lg border border-hair p-2.5 text-sm">
                        <p className="font-medium text-brand-900">{t.name}</p>
                        <p className="text-xs text-amber-800">⏱️ {t.rule}</p>
                        <p className="text-xs text-slate-500">{t.items} itens de checklist{t.minutes ? ` · ${t.minutes} min` : ""}</p>
                        {admin && <Link href={`/rotinas/modelos/${t.id}`} className="text-xs text-brand-700 hover:underline">✏️ Editar modelo</Link>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        );
      })}
      {loose.length > 0 && (
        <section className="rounded-2xl border border-hair bg-white p-4">
          <h2 className="text-base font-semibold text-brand-900">🔁 Modelos de rotina sem etapa definida</h2>
          <p className="mb-2 text-xs text-slate-500">{admin ? "Edite o modelo e escolha a etapa da jornada para ele aparecer acima." : ""}</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {loose.map((t) => (
              <li key={t.id} className="rounded-lg border border-hair p-2.5 text-sm">
                <p className="font-medium text-brand-900">{t.name}</p>
                <p className="text-xs text-amber-800">⏱️ {t.rule}</p>
                <p className="text-xs text-slate-500">{t.items} itens de checklist</p>
                {admin && <Link href={`/rotinas/modelos/${t.id}`} className="text-xs text-brand-700 hover:underline">✏️ Editar modelo</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Mensagens */
async function Messages({ actor, admin }: { actor: Actor; admin: boolean }) {
  const [system, shared] = await Promise.all([systemMessagesFor(actor.organizationId), listSharedMessages(actor)]);
  const groups = Array.from(new Set(system.map((m) => m.group)));
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">
        💬 Estes textos aparecem no botão <b>Mensagem</b> de cada lead no CRM. Variáveis: {MESSAGE_VARS.join("  ")} (são trocadas pelos dados do lead).
      </p>
      {admin && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-900">➕ Nova mensagem da Rosan (WhatsApp, e-mail…)</summary>
          <form action={saveSharedMessageAction.bind(null, null)} className="mt-3 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="secao" value="mensagens" />
            <label className="text-sm"><span className={label}>Título</span><input name="title" required className="input mt-1" /></label>
            <label className="text-sm"><span className={label}>Aparece primeiro na etapa</span><select name="stage" className="input mt-1"><option value="">Todas</option>{LEAD_STAGES.map((s) => <option key={s} value={s}>{LEAD_STAGE_LABEL[s]}</option>)}</select></label>
            <label className="text-sm md:col-span-2"><span className={label}>Texto</span><textarea name="body" rows={6} required className="input mt-1" /></label>
            <div><button className="btn-primary" type="submit">Salvar mensagem</button></div>
          </form>
        </details>
      )}
      {shared.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-900">⭐ Mensagens da Rosan</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {shared.map((m) => (
              <MessageCard key={m.id} title={m.title} body={m.body} stage={m.stage}>
                {admin && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-brand-700">✏️ Editar</summary>
                    <form action={saveSharedMessageAction.bind(null, m.id)} className="mt-2 space-y-2">
                      <input type="hidden" name="secao" value="mensagens" />
                      <input name="title" defaultValue={m.title} required className="input" />
                      <select name="stage" defaultValue={m.stage ?? ""} className="input"><option value="">Todas</option>{LEAD_STAGES.map((s) => <option key={s} value={s}>{LEAD_STAGE_LABEL[s]}</option>)}</select>
                      <textarea name="body" defaultValue={m.body} rows={6} required className="input" />
                      <div className="flex items-center gap-3"><button className="btn-primary btn-sm" type="submit">Salvar</button></div>
                    </form>
                    <form action={deleteSharedMessageAction.bind(null, m.id)} className="mt-1"><button className="text-xs text-slate-400 hover:text-red-600" type="submit">remover mensagem</button></form>
                  </details>
                )}
              </MessageCard>
            ))}
          </div>
        </section>
      )}
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 text-sm font-semibold text-brand-900">{g}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {system.filter((m) => m.group === g).map((m) => (
              <MessageCard key={m.id} title={m.title} body={m.body} stage={m.stages[0] ?? null} edited={m.edited}>
                {admin && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-brand-700">✏️ Editar texto</summary>
                    <form action={saveSystemMessageAction.bind(null, m.id)} className="mt-2 space-y-2">
                      <input type="hidden" name="secao" value="mensagens" />
                      <input name="title" defaultValue={m.title} required className="input" />
                      <textarea name="body" defaultValue={m.body} rows={8} required className="input" />
                      <button className="btn-primary btn-sm" type="submit">Salvar</button>
                    </form>
                    {m.edited && <form action={resetSystemMessageAction.bind(null, m.id)} className="mt-1"><button className="text-xs text-slate-500 hover:text-brand-700" type="submit">↩ voltar ao texto original</button></form>}
                  </details>
                )}
              </MessageCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MessageCard({ title, body, stage, edited, children }: { title: string; body: string; stage: string | null; edited?: boolean; children?: React.ReactNode }) {
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-brand-900">{title}</h3>
        {stage && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">{LEAD_STAGE_LABEL[stage as keyof typeof LEAD_STAGE_LABEL] ?? stage}</span>}
        {edited && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">editada</span>}
      </div>
      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap font-sans text-sm text-slate-600">{body}</pre>
      <div className="mt-2"><CopyButton text={body} label="Copiar texto" /></div>
      {children}
    </article>
  );
}

/* ---------------------------------------------------------------- Materiais */
async function Materials({ actor, admin, q }: { actor: Actor; admin: boolean; q?: string }) {
  const items = await listMaterials(actor, q?.trim() || undefined);
  return (
    <>
      <form className="card mb-5 flex gap-2 p-3"><input type="hidden" name="secao" value="materiais" /><input name="q" defaultValue={q ?? ""} placeholder="Buscar por título ou conteúdo" className="input flex-1" /><button className="btn-secondary" type="submit">Buscar</button></form>
      {admin && (
        <details className="card mb-5 p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-900">➕ Novo material</summary>
          <MaterialForm action={saveMaterialAction.bind(null, null)} />
        </details>
      )}
      {items.length === 0 ? <p className="card p-5 text-sm text-slate-600">Nenhum material ainda. {admin ? "Crie o primeiro acima: e-mails, contratos, roteiros, planilhas, políticas, links do Drive…" : ""}</p> : (
        MATERIAL_CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
          <section key={c} className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-brand-900">{EMOJI[c]} {c}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.filter((i) => i.category === c).map((i) => (
                <article key={i.id} className="card p-4">
                  <h3 className="font-medium text-brand-900">{i.title}</h3>
                  {i.body && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-sm text-slate-600">{i.body}</pre>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {i.body && <CopyButton text={i.body} label="Copiar texto" />}
                    {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">Abrir link ↗</a>}
                    {admin && <form action={deleteMaterialAction.bind(null, i.id)} className="ml-auto"><button type="submit" className="text-xs text-slate-400 hover:text-red-600">remover</button></form>}
                  </div>
                  {admin && (
                    <details className="mt-2"><summary className="cursor-pointer text-xs text-brand-700">✏️ Editar</summary><MaterialForm action={saveMaterialAction.bind(null, i.id)} item={i} /></details>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function MaterialForm({ action, item }: { action: (fd: FormData) => Promise<void>; item?: { title: string; category: string; body: string | null; url: string | null } }) {
  return (
    <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="secao" value="materiais" />
      <label className="text-sm"><span className={label}>Título</span><input name="title" required defaultValue={item?.title} className="input mt-1" /></label>
      <label className="text-sm"><span className={label}>Categoria</span><select name="category" defaultValue={item?.category} className="input mt-1">{MATERIAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-sm md:col-span-2"><span className={label}>Texto (modelo para copiar)</span><textarea name="body" rows={6} defaultValue={item?.body ?? ""} className="input mt-1" /></label>
      <label className="text-sm md:col-span-2"><span className={label}>Link (Google Drive, Canva, vídeo…)</span><input name="url" defaultValue={item?.url ?? ""} placeholder="https://" className="input mt-1" /></label>
      <div><button type="submit" className="btn-primary">Salvar material</button></div>
    </form>
  );
}

/* --------------------------------------------------------------------- POPs */
async function Pops({ actor }: { actor: Actor }) {
  const pops = await listProcedures(actor, {});
  return (
    <>
      <p className="mb-3 text-sm"><Link href="/pops" className="text-brand-700 hover:underline">Abrir a página completa de Processos →</Link></p>
      {pops.length === 0 ? <p className="card p-5 text-sm text-slate-600">Nenhum processo cadastrado ainda.</p> : (
        <ul className="grid gap-2 md:grid-cols-2">
          {pops.map((p) => (
            <li key={p.id}><Link href={`/pops/${p.id}`} className="card block p-3 text-sm hover:border-brand-300"><span className="font-medium text-brand-900">📄 {p.title}</span></Link></li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- Trilha */
async function Trail({ actor }: { actor: Actor }) {
  const items = await trainingItems(actor);
  const manage = can(actor, "users.manage");
  const team = manage ? await trainingTeam(actor) : [];
  const mine = items.filter((i) => i.progress.some((p) => p.userId === actor.userId)).length;
  const pct = items.length ? Math.round((mine / items.length) * 100) : 0;
  const phases = Array.from(new Set(items.map((i) => i.phase ?? "Geral")));
  return (
    <>
      <div className="card mb-5 p-4"><p className="text-sm font-medium text-brand-900">🎓 Seu progresso: {mine} de {items.length} ({pct}%)</p><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div></div>
      {phases.map((ph) => (
        <section key={ph} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-brand-900">📍 {ph}</h2>
          <ul className="card divide-y divide-hair">
            {items.filter((i) => (i.phase ?? "Geral") === ph).map((i) => {
              const done = i.progress.some((p) => p.userId === actor.userId);
              return (
                <li key={i.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <form action={toggleTrainingAction.bind(null, i.id, !done)}>
                      <button type="submit" aria-label={done ? "Desmarcar" : "Marcar como feito"} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-500"}`}>{done ? "✓" : ""}</button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${done ? "text-slate-400 line-through" : "text-brand-900"}`}>{i.title}</p>
                      {i.description && <p className="text-xs text-slate-500">{i.description}</p>}
                      {i.url && (i.url.startsWith("/") ? <Link href={i.url} className="text-xs text-brand-700 hover:underline">Abrir →</Link> : <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 hover:underline">Abrir ↗</a>)}
                      {manage && <p className="mt-1 text-xs text-slate-400">Concluído por: {team.filter((u) => i.progress.some((p) => p.userId === u.id)).map((u) => u.name).join(", ") || "ninguém ainda"}</p>}
                    </div>
                    {manage && (
                      <div className="flex shrink-0 gap-1 text-xs text-slate-400">
                        <form action={moveTrainingItemAction.bind(null, i.id, -1)}><button type="submit" aria-label="Subir" className="px-1 hover:text-brand-700">▲</button></form>
                        <form action={moveTrainingItemAction.bind(null, i.id, 1)}><button type="submit" aria-label="Descer" className="px-1 hover:text-brand-700">▼</button></form>
                      </div>
                    )}
                  </div>
                  {manage && (
                    <details className="ml-8 mt-1">
                      <summary className="cursor-pointer text-xs text-brand-700">✏️ Editar</summary>
                      <form action={updateTrainingItemAction.bind(null, i.id)} className="mt-2 grid gap-2 md:grid-cols-2">
                        <input name="title" defaultValue={i.title} required className="input md:col-span-2" />
                        <input name="description" defaultValue={i.description ?? ""} placeholder="Descrição" className="input md:col-span-2" />
                        <input name="phase" list="fases" defaultValue={i.phase ?? ""} placeholder="Fase (ex.: Semana 1)" className="input" />
                        <input name="url" defaultValue={i.url ?? ""} placeholder="Link (https://… ou /pops/…)" className="input" />
                        <div><button className="btn-primary btn-sm" type="submit">Salvar</button></div>
                      </form>
                      <form action={removeTrainingItemAction.bind(null, i.id)} className="mt-1"><button type="submit" className="text-xs text-slate-400 hover:text-red-600">remover item</button></form>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {manage && (
        <form action={addTrainingItemAction} className="card mt-5 grid gap-3 p-4 md:grid-cols-2">
          <datalist id="fases">{TRAINING_PHASES.map((p) => <option key={p} value={p} />)}</datalist>
          <label className="text-sm md:col-span-2"><span className={label}>Novo item da trilha</span><input name="title" required className="input mt-1" /></label>
          <label className="text-sm md:col-span-2"><span className={label}>Descrição (opcional)</span><input name="description" className="input mt-1" /></label>
          <label className="text-sm"><span className={label}>Fase</span><input name="phase" list="fases" placeholder="Semana 1" className="input mt-1" /></label>
          <label className="text-sm"><span className={label}>Link (opcional)</span><input name="url" placeholder="https:// ou /pops/…" className="input mt-1" /></label>
          <div><button type="submit" className="btn-primary">Adicionar à trilha</button></div>
        </form>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Cultura */
async function Culture({ actor, admin }: { actor: Actor; admin: boolean }) {
  const c = await getCulture(actor);
  return (
    <div className="card space-y-3 p-5 text-sm">
      {c ? (
        <>
          {c.mission && <div><h3 className="font-semibold text-brand-900">🎯 Missão</h3><p className="text-slate-600">{c.mission}</p></div>}
          {c.vision && <div><h3 className="font-semibold text-brand-900">🔭 Visão</h3><p className="text-slate-600">{c.vision}</p></div>}
        </>
      ) : <p className="text-slate-500">Ainda não preenchida.</p>}
      <p><Link href="/cultura" className="text-brand-700 hover:underline">Abrir página completa →</Link>{admin && <> · <Link href="/cultura/editar" className="text-brand-700 hover:underline">✏️ Editar</Link></>}</p>
    </div>
  );
}

/* ------------------------------------------------------------------- Acesso */
async function Access({ actor }: { actor: Actor }) {
  const rows = await accessMatrix(actor);
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">
        🔐 Marque o que cada pessoa pode ver. Só você (administradora) edita a biblioteca. Quem ainda não foi configurado vê apenas a trilha de conhecimento, a missão e valores e os processos (POPs). Essas escolhas também escondem os menus “Processos e POPs” e “Missão e valores”.
      </p>
      {rows.map((r) => (
        <form key={r.userId} action={saveAccessAction.bind(null, r.userId)} className="card p-4">
          <p className="mb-2 text-sm font-semibold text-brand-900">{r.name} <span className="text-xs font-normal text-slate-500">· {r.role === "ADMIN" ? "Administradora (vê tudo)" : r.role === "GESTOR" ? "Gestor" : "Operador"}</span></p>
          {r.role === "ADMIN" ? <p className="text-xs text-slate-500">Acesso total.</p> : (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {LIBRARY_SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" name="sections" value={s.key} defaultChecked={r.sections.includes(s.key)} /> {s.emoji} {s.label}</label>
                ))}
              </div>
              <button type="submit" className="btn-secondary btn-sm mt-3">Salvar acesso</button>
            </>
          )}
        </form>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Padrões da jornada */
async function Patterns({ actor, admin }: { actor: Actor; admin: boolean }) {
  const [assets, options] = await Promise.all([listAssets(actor), admin ? journeyTaskOptions(actor.organizationId) : Promise.resolve([])]);
  const form = (a?: (typeof assets)[number]) => (
    <form action={saveAssetAction.bind(null, a?.id ?? null)} className="mt-3 grid gap-3 md:grid-cols-2">
      <label className="text-sm"><span className={label}>Tipo</span><select name="kind" defaultValue={a?.kind ?? "MENSAGEM"} className="input mt-1">{ASSET_KINDS.map((k) => <option key={k} value={k}>{ASSET_LABEL[k]}</option>)}</select></label>
      <label className="text-sm"><span className={label}>Etapa da jornada</span><select name="stage" defaultValue={a?.stage ?? "COMERCIAL"} className="input mt-1">{JOURNEY_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></label>
      <label className="text-sm md:col-span-2"><span className={label}>Título</span><input name="title" required defaultValue={a?.title} className="input mt-1" /></label>
      <label className="text-sm md:col-span-2"><span className={label}>Assunto (só para e-mail)</span><input name="subject" defaultValue={a?.subject ?? ""} className="input mt-1" /></label>
      <label className="text-sm md:col-span-2"><span className={label}>Texto</span><textarea name="body" rows={8} defaultValue={a?.body ?? ""} className="input mt-1" /></label>
      <label className="text-sm md:col-span-2"><span className={label}>Link (Drive, Canva, vídeo…)</span><input name="url" defaultValue={a?.url ?? ""} placeholder="https://" className="input mt-1" /></label>
      <div className="md:col-span-2">
        <p className={label}>Aparece nas tarefas:</p>
        <div className="mt-1 max-h-56 space-y-1 overflow-auto rounded-lg border border-hair p-2">
          {options.map((o) => (
            <details key={o.slug} open={!!a?.taskRefs.some((r) => r.startsWith(o.slug + "|"))}>
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">{o.name}</summary>
              <div className="ml-3 mt-1 grid gap-0.5">
                {o.tasks.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" name="taskRefs" value={`${o.slug}|${t}`} defaultChecked={a?.taskRefs.includes(`${o.slug}|${t}`)} /> {t}</label>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
      <div><button type="submit" className="btn-primary">Salvar</button></div>
    </form>
  );
  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">
        🗂️ Aqui ficam as mensagens, e-mails e documentos padrão. Cada um é ligado às tarefas da jornada onde deve aparecer, então quem abre a tarefa (ou a aba Jornada do cliente e do lead) já encontra o texto certo, sem procurar em outra janela. Variáveis: {ASSET_VARS.join("  ")}.
      </p>
      {admin && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-900">➕ Novo item padrão</summary>
          {form()}
        </details>
      )}
      {JOURNEY_STAGES.filter((st) => assets.some((a) => a.stage === st)).map((st) => (
        <section key={st}>
          <h2 className="mb-2 text-sm font-semibold text-brand-900">{STAGE_LABEL[st]}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {assets.filter((a) => a.stage === st).map((a) => (
              <article key={a.id} className="card p-4">
                <h3 className="font-medium text-brand-900">{ASSET_EMOJI[a.kind as AssetKind]} {a.title} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">{ASSET_LABEL[a.kind as AssetKind]}</span></h3>
                {a.subject && <p className="mt-1 text-xs text-slate-500">Assunto: {a.subject}</p>}
                {a.body && <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-sans text-sm text-slate-600">{a.body}</pre>}
                <p className="mt-2 text-xs text-slate-500">Usado em {a.taskRefs.length} tarefa(s): {a.taskRefs.map((r) => r.split("|")[1]).slice(0, 3).join(", ")}{a.taskRefs.length > 3 ? "…" : ""}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {a.body && <CopyButton text={a.body} label="Copiar" />}
                  {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">Abrir link ↗</a>}
                  {admin && <form action={deleteAssetAction.bind(null, a.id)} className="ml-auto"><button type="submit" className="text-xs text-slate-400 hover:text-red-600">remover</button></form>}
                </div>
                {admin && <details className="mt-2"><summary className="cursor-pointer text-xs text-brand-700">✏️ Editar</summary>{form(a)}</details>}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Visão geral */
async function Overview({ actor, filtro }: { actor: Actor; filtro?: string }) {
  const areas = await structureOverview(actor);
  const total = areas.reduce((n, a) => n + a.items.length, 0);
  const done = areas.reduce((n, a) => n + a.validated, 0);
  const adjust = areas.reduce((n, a) => n + a.items.filter((i) => i.status === "AJUSTAR").length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const chip = (k: string | undefined, text: string) => (
    <Link href={k ? `/biblioteca?secao=visao&filtro=${k}` : "/biblioteca?secao=visao"} className={cx("rounded-full border px-3 py-1 text-xs font-medium", (filtro ?? "") === (k ?? "") ? "border-brand-700 bg-brand-700 text-white" : "border-hair bg-white text-slate-700 hover:border-brand-300")}>{text}</Link>
  );
  return (
    <div className="space-y-5">
      <div className="card p-4">
        <p className="text-sm font-medium text-brand-900">✅ Estrutura validada: {done} de {total} itens ({pct}%){adjust > 0 ? ` · ${adjust} para ajustar` : ""}</p>
        <div className="mt-2 h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-xs text-slate-500">Revise cada item (abra, edite se quiser) e marque como <b>Validado</b>. Se algo precisa mudar, marque <b>Ajustar</b> e anote o que falta. Tudo o que está aqui alimenta as tarefas, a jornada do cliente e do lead e o CRM.</p>
        <div className="mt-3 flex flex-wrap gap-2">{chip(undefined, "Todos")}{chip("falta", "Falta validar")}{chip("ajustar", "Para ajustar")}{chip("ok", "Validados")}</div>
      </div>
      {areas.map((a) => {
        const items = a.items.filter((i) => !filtro || (filtro === "falta" ? i.status !== "VALIDADO" : filtro === "ajustar" ? i.status === "AJUSTAR" : i.status === "VALIDADO"));
        const p = a.items.length ? Math.round((a.validated / a.items.length) * 100) : 0;
        return (
          <section key={a.id} id={a.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold text-brand-900">{a.emoji} {a.title}</h2>
              <span className="text-xs text-slate-500">{a.validated} de {a.items.length} validados</span>
              <div className="ml-auto h-2 w-40 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${p}%` }} /></div>
            </div>
            <p className="mb-2 text-xs text-slate-500">{a.hint}</p>
            {items.length === 0 ? <p className="text-sm text-slate-400">Nada neste filtro.</p> : (
              <ul className="divide-y divide-hair">
                {items.map((i) => (
                  <li key={i.key} className="py-2">
                    <form action={setReviewAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="key" value={i.key} />
                      <input type="hidden" name="area" value={a.id} />
                      <input type="hidden" name="filtro" value={filtro ?? ""} />
                      <span className={cx("w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium", i.status === "VALIDADO" ? "bg-emerald-100 text-emerald-800" : i.status === "AJUSTAR" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600")}>
                        {i.status === "VALIDADO" ? "✅ Validado" : i.status === "AJUSTAR" ? "✏️ Ajustar" : "⏳ Pendente"}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">{i.href ? <Link href={i.href} className="text-brand-800 hover:underline">{i.title}</Link> : <span className="text-slate-800">{i.title}</span>}</span>
                      <input name="note" defaultValue={i.note ?? ""} placeholder="Anotação (o que ajustar)" className="input w-56 text-xs" />
                      <button name="status" value="VALIDADO" type="submit" className="btn-secondary btn-sm">✅</button>
                      <button name="status" value="AJUSTAR" type="submit" className="btn-secondary btn-sm">✏️</button>
                      {i.status !== "PENDENTE" && <button name="status" value="PENDENTE" type="submit" className="text-xs text-slate-400 hover:text-brand-700">limpar</button>}
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

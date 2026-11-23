"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { deletePhotoAction, setIdeaPhotoAction, uploadPhotoAction } from "@/app/actions/marketing";

/** Reduz a foto no navegador (lado maior 1600 px, JPEG) para o envio ser leve. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function PhotoUploader({ kind = "FOTO" }: { kind?: "FOTO" | "REFERENCIA" }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; msg?: string; err?: boolean }>({ busy: false });
  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setState({ busy: true });
    const fd = new FormData();
    fd.append("kind", kind);
    for (const f of Array.from(files)) fd.append("photos", await shrink(f));
    const res = await uploadPhotoAction({ ok: false, at: 0 } as never, fd);
    setState({ busy: false, msg: (res?.ok ? res.message : res?.error) ?? "Não foi possível enviar.", err: !res?.ok });
    if (input.current) input.current.value = "";
    router.refresh();
  }
  return (
    <div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" id={`photo-input-${kind}`} onChange={(e) => onPick(e.target.files)} />
      <label htmlFor={`photo-input-${kind}`} className="btn-primary cursor-pointer">
        <ImagePlus aria-hidden className="h-4 w-4" /> {state.busy ? "Enviando…" : kind === "REFERENCIA" ? "Adicionar exemplos" : "Adicionar fotos"}
      </label>
      {state.msg && (
        <p role="status" className={state.err ? "mt-2 text-sm text-red-700" : "mt-2 text-sm text-emerald-700"}>
          {state.msg}
        </p>
      )}
    </div>
  );
}

export function DeletePhoto({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Apagar foto"
      className="rounded-md bg-white/90 p-1.5 text-red-700 shadow hover:bg-white"
      onClick={async () => {
        if (!confirm("Apagar esta foto? Conteúdos que a usam voltam para a capa lisa.")) return;
        await deletePhotoAction(id);
        router.refresh();
      }}
    >
      <Trash2 aria-hidden className="h-4 w-4" />
    </button>
  );
}

/** Escolha da foto de fundo da capa de um conteúdo. */
export function CoverPhotoPicker({ ideaId, photos, current }: { ideaId: string; photos: { id: string; name: string }[]; current: string | null }) {
  const router = useRouter();
  const pick = async (id: string) => {
    await setIdeaPhotoAction(ideaId, id);
    router.refresh();
  };
  if (photos.length === 0) {
    return <p className="text-sm text-slate-600">Nenhuma foto enviada ainda. Adicione em Identidade visual.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => pick("")} aria-pressed={!current} className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 text-xs font-medium ${!current ? "border-brand-900 bg-slate-50" : "border-slate-200 bg-white text-slate-600"}`}>
        Sem foto
      </button>
      {photos.map((p) => (
        <button key={p.id} type="button" onClick={() => pick(p.id)} aria-pressed={current === p.id} aria-label={`Usar ${p.name}`} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${current === p.id ? "border-brand-900" : "border-transparent"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/marketing/identidade/foto/${p.id}`} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

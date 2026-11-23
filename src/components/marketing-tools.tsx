"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Trash2 } from "lucide-react";
import { deleteIdeaAction } from "@/app/actions/marketing";

/** Baixa todos os slides, um por vez (cada um vira um arquivo PNG). */
export function DownloadAll({ id, count }: { id: string; count: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-primary btn-sm"
      disabled={busy || count === 0}
      onClick={async () => {
        setBusy(true);
        for (let n = 1; n <= count; n++) {
          const a = document.createElement("a");
          a.href = `/marketing/${id}/slide/${n}?baixar=1`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          await new Promise((r) => setTimeout(r, 900));
        }
        setBusy(false);
      }}
    >
      <Download aria-hidden className="h-4 w-4" /> {busy ? "Baixando…" : `Baixar os ${count} slides`}
    </button>
  );
}

export function CopyCaption({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />} {ok ? "Copiado" : "Copiar legenda e hashtags"}
    </button>
  );
}

export function DeleteIdea({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-ghost btn-sm text-red-700"
      onClick={async () => {
        if (!window.confirm("Excluir este conteúdo? Não dá para desfazer.")) return;
        const res = await deleteIdeaAction(id);
        if (res && !res.ok) window.alert(res.error);
        router.refresh();
      }}
    >
      <Trash2 aria-hidden className="h-4 w-4" /> Excluir
    </button>
  );
}

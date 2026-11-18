"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

/** Mostra a senha só depois do clique (a visualização é registrada) e esconde sozinha em 30 segundos. */
export function VaultReveal({ clientId, itemId }: { clientId: string; itemId: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!secret) return;
    const t = setTimeout(() => setSecret(null), 30_000);
    return () => clearTimeout(t);
  }, [secret]);

  async function reveal() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/clientes/${clientId}/cofre/${itemId}`, { method: "POST" });
      const data = (await res.json()) as { secret?: string; error?: string };
      if (!res.ok || !data.secret) setMsg(data.error ?? "Não foi possível abrir.");
      else setSecret(data.secret);
    } catch {
      setMsg("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setMsg("Copiado.");
    } catch {
      setMsg("Não foi possível copiar.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {secret ? (
        <>
          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-900 select-all">{secret}</code>
          <button type="button" onClick={copy} className="icon-btn" aria-label="Copiar senha">
            <Copy aria-hidden className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setSecret(null)} className="icon-btn" aria-label="Esconder senha">
            <EyeOff aria-hidden className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button type="button" onClick={reveal} disabled={busy} className="btn-secondary btn-sm">
          <Eye aria-hidden className="h-3.5 w-3.5" /> {busy ? "Abrindo…" : "Ver senha"}
        </button>
      )}
      {msg && (
        <span role="status" className="text-xs text-slate-500">
          {msg}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { unzipSync, strFromU8 } from "fflate";
import { importPopPackageAction } from "@/app/actions/procedures";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Lê um .zip (pop.json + imagens), envia as imagens e cria o POP como rascunho. */
export function PopZipImport() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const say = (m: string) => setLog((l) => [...l, m]);

  async function run(file: File) {
    setBusy(true);
    setLog([]);
    try {
      const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const pkgRaw = files["pop.json"];
      if (!pkgRaw) throw new Error("O pacote não tem o arquivo pop.json.");
      const pkg = JSON.parse(strFromU8(pkgRaw)) as Parameters<typeof importPopPackageAction>[0];
      const names = [...new Set([...pkg.content.matchAll(/\(img:([^)]+)\)/g)].map((m) => m[1]!))];
      const ids: Record<string, string> = {};
      let n = 0;
      for (const name of names) {
        const bytes = files[name];
        const ext = name.split(".").pop()?.toLowerCase() ?? "";
        if (!bytes || !MIME[ext]) throw new Error(`Imagem ${name} ausente ou em formato não aceito.`);
        const fd = new FormData();
        fd.set("file", new File([new Uint8Array(bytes)], name, { type: MIME[ext] }));
        const r = await fetch("/pops/imagem", { method: "POST", body: fd });
        const j = (await r.json()) as { id?: string; error?: string };
        if (!r.ok || !j.id) throw new Error(`${name}: ${j.error ?? "falha no envio"}`);
        ids[name] = j.id;
        say(`Imagem ${++n} de ${names.length} enviada`);
      }
      const content = pkg.content.replace(/\(img:([^)]+)\)/g, (_, name: string) => `(img:${ids[name]})`);
      const res = await importPopPackageAction({ ...pkg, content });
      if (!res?.ok) throw new Error(res?.error ?? "Não foi possível criar o POP.");
      say("Pronto! POP criado como rascunho.");
      window.location.href = `/pops/${res.message}`;
    } catch (e) {
      say(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".zip" disabled={busy} onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} className="input" />
      {log.length > 0 && <div className="card space-y-1 p-3 text-sm">{log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}</div>}
    </div>
  );
}

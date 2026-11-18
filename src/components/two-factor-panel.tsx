"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { beginTwoFactorAction, confirmTwoFactorAction, disableTwoFactorAction } from "@/app/actions/two-factor";

interface Props {
  enabled: boolean;
  recoveryLeft: number;
  available: boolean;
}

/** Ativar, usar e desativar a verificação em duas etapas, passo a passo. */
export function TwoFactorPanel({ enabled: initial, recoveryLeft, available }: Props) {
  const [enabled, setEnabled] = useState(initial);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);

  function begin() {
    setError(null);
    start(async () => {
      const r = await beginTwoFactorAction();
      if (r.ok) setSetup(r.data);
      else setError(r.error);
    });
  }
  function confirm() {
    setError(null);
    start(async () => {
      const r = await confirmTwoFactorAction(code);
      if (r.ok) {
        setCodes(r.data);
        setSetup(null);
        setEnabled(true);
        setCode("");
      } else setError(r.error);
    });
  }
  function disable() {
    setError(null);
    start(async () => {
      const r = await disableTwoFactorAction(password, code);
      if (r.ok) {
        setEnabled(false);
        setDisabling(false);
        setCode("");
        setPassword("");
      } else setError(r.error);
    });
  }

  return (
    <div className="space-y-4 text-sm">
      {!available && <p className="rounded-md bg-amber-50 p-3 text-amber-900">Indisponível: falta a chave de criptografia do servidor (VAULT_ENCRYPTION_KEY).</p>}
      {codes && (
        <div role="status" className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-emerald-900">
            <ShieldCheck aria-hidden className="h-4 w-4" /> Duas etapas ativadas. Guarde estes códigos de recuperação.
          </p>
          <p className="text-emerald-900">Cada código vale uma vez e só aparece agora. Use um deles se perder o celular.</p>
          <ul className="grid grid-cols-2 gap-1 font-mono text-slate-900">
            {codes.map((c) => (
              <li key={c} className="rounded bg-white px-2 py-1 select-all">
                {c}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setCodes(null)}>
            Já guardei
          </button>
        </div>
      )}
      {enabled && !codes && (
        <>
          <p className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck aria-hidden className="h-4 w-4" /> Ativa. Códigos de recuperação restantes: {recoveryLeft}.
          </p>
          {!disabling ? (
            <button type="button" className="btn-secondary" onClick={() => setDisabling(true)}>
              Desativar
            </button>
          ) : (
            <div className="max-w-xs space-y-2">
              <label className="label" htmlFor="tf-pass">
                Senha
              </label>
              <input id="tf-pass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <label className="label" htmlFor="tf-code">
                Código do aplicativo
              </label>
              <input id="tf-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
              <div className="flex gap-2">
                <button type="button" className="btn-danger" disabled={pending} onClick={disable}>
                  Confirmar desativação
                </button>
                <button type="button" className="btn-secondary" onClick={() => setDisabling(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {!enabled && !setup && (
        <>
          <p className="text-slate-600">Peça um código do celular além da senha ao entrar. Protege o sistema e os acessos dos seus clientes.</p>
          <button type="button" className="btn-primary" disabled={pending || !available} onClick={begin}>
            Ativar verificação em duas etapas
          </button>
        </>
      )}
      {setup && (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-slate-700">
            <li>Abra um aplicativo autenticador (Google Authenticator, Authy, 1Password).</li>
            <li>Leia o QR Code abaixo ou digite a chave manualmente.</li>
            <li>Digite o código de 6 dígitos que o aplicativo mostrar.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR Code para o aplicativo autenticador" width={220} height={220} className="rounded-lg border border-slate-200" />
          <p className="text-xs text-slate-500">
            Chave manual: <code className="font-mono text-slate-800 select-all">{setup.secret}</code>
          </p>
          <div className="flex max-w-xs gap-2">
            <input aria-label="Código de 6 dígitos" className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            <button type="button" className="btn-primary" disabled={pending} onClick={confirm}>
              Confirmar
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

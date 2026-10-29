"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="card mx-auto mt-10 max-w-lg p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">
        Algo deu errado
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Não foi possível carregar esta página. Tente novamente.
        {error.digest && <span className="mt-1 block text-xs text-slate-400">Código: {error.digest}</span>}
      </p>
      <button className="btn-primary mt-4" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}

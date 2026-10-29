import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-md px-4 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-slate-600">O endereço não existe ou você não tem acesso a ele.</p>
      <Link className="btn-primary mt-4" href="/">
        Ir para o início
      </Link>
    </main>
  );
}

import { redirect } from "next/navigation";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cliente?: string }> }) {
  const { slug } = await params;
  const { cliente } = await searchParams;
  redirect(cliente ? `/clientes/${cliente}?aba=jornada#${slug}` : `/biblioteca?secao=jornada#${slug}`);
}

import { redirect } from "next/navigation";

/** A jornada agora vive na Estrutura Rosan e na aba Jornada de cada cliente. */
export default function Page() {
  redirect("/biblioteca?secao=jornada");
}

import { redirect } from "next/navigation";

/** A trilha agora vive na Biblioteca Rosan. */
export default function TrainingPage() {
  redirect("/biblioteca?secao=trilha");
}

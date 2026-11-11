"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      <Printer aria-hidden className="h-4 w-4" /> Imprimir / salvar PDF
    </button>
  );
}

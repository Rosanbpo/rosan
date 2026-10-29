import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/app-config";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Gestão operacional de tarefas para BPO Financeiro",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

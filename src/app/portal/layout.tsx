import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Portal do Cliente — Rosan Finanças", template: "%s — Portal Rosan" }, robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f6f3ee] text-[#1b2540]">{children}</div>;
}

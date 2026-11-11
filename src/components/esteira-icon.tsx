import { DoorOpen, Handshake, HeartHandshake, Inbox, Lightbulb, Repeat, Rocket, Settings2, Wallet } from "lucide-react";
import type { Esteira } from "@/domain/esteiras";

const ICONS = { handshake: Handshake, inbox: Inbox, rocket: Rocket, settings: Settings2, repeat: Repeat, lightbulb: Lightbulb, heart: HeartHandshake, door: DoorOpen, wallet: Wallet };

export function EsteiraIcon({ icon, className }: { icon: Esteira["icon"]; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden className={className} />;
}

import type { RiskLevel } from "@/types/betting";
import { Shield, ShieldAlert, ShieldX } from "lucide-react";

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cfg = {
    low: { label: "Risco Baixo", cls: "bg-gradient-green text-accent-foreground", Icon: Shield },
    medium: { label: "Risco Médio", cls: "bg-gradient-orange text-background", Icon: ShieldAlert },
    high: { label: "Risco Alto", cls: "bg-gradient-red text-foreground", Icon: ShieldX },
  }[risk];
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

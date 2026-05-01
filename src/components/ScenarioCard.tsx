import type { Scenario } from "@/types/betting";
import { Shield, Scale, Flame, Sparkles, ArrowRight } from "lucide-react";

interface Props {
  scenario: Scenario;
  onClick: () => void;
}

const CONFIG = {
  safe: {
    title: "Seguro",
    desc: "3 a 4 jogos | foco em proteção",
    Icon: Shield,
    accent: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    iconBg: "bg-gradient-green",
    iconColor: "text-accent-foreground",
  },
  conservative: {
    title: "Conservador",
    desc: "5 a 6 jogos | equilíbrio entre segurança e retorno",
    Icon: Scale,
    accent: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    iconBg: "bg-gradient-orange",
    iconColor: "text-background",
  },
  aggressive: {
    title: "Agressivo",
    desc: "6 a 8 jogos | odds maiores e risco elevado",
    Icon: Flame,
    accent: "from-red-500/20 to-red-500/5 border-red-500/30",
    iconBg: "bg-gradient-red",
    iconColor: "text-foreground",
  },
  daily: {
    title: "Bilhete do Dia",
    desc: "Combina os melhores sinais dos 3 cenários",
    Icon: Sparkles,
    accent: "from-yellow-500/30 to-yellow-500/10 border-yellow-500/40",
    iconBg: "bg-gradient-gold",
    iconColor: "text-primary-foreground",
  },
} as const;

export function ScenarioCard({ scenario, onClick }: Props) {
  const cfg = CONFIG[scenario];
  const { Icon } = cfg;
  const featured = scenario === "daily";

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left bg-gradient-to-br ${cfg.accent} border-2 rounded-3xl p-5 sm:p-6 transition-bounce hover:scale-[1.02] hover:shadow-card active:scale-[0.99] overflow-hidden ${featured ? "shadow-gold" : ""
        }`}
    >
      {featured && (
        <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-gradient-gold text-primary-foreground px-2 py-0.5 rounded-full">
          Destaque
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className={`shrink-0 w-14 h-14 rounded-2xl ${cfg.iconBg} flex items-center justify-center shadow-lg`}>
          <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl sm:text-2xl font-bold">{cfg.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{cfg.desc}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-smooth shrink-0" />
      </div>
    </button>
  );
}

import { useState } from "react";
import type { DailyTicket } from "@/types/betting";
import { TicketCard } from "@/components/TicketCard";
import { Disclaimer } from "@/components/Disclaimer";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { ArrowLeft, RotateCw, Copy } from "lucide-react";
import { formatTicketForCopy } from "@/utils/formatters";
import { toast } from "sonner";

type Tab = "safe" | "conservative" | "aggressive";

const TABS: { key: Tab; label: string }[] = [
  { key: "safe", label: "Seguro" },
  { key: "conservative", label: "Conservador" },
  { key: "aggressive", label: "Agressivo" },
];

export function DailyResultScreen({
  daily,
  meta,
  refreshing,
  onRefresh,
  onBack,
  onRegenerate,
}: {
  daily: DailyTicket;
  meta: { source: "real" | "mock"; fetchedAt: string };
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack: () => void;
  onRegenerate: () => void;
}) {
  const [tab, setTab] = useState<Tab>("safe");
  const ticket = daily[tab];

  const copyAll = async () => {
    const all = [
      formatTicketForCopy(daily.safe),
      "",
      "----------",
      "",
      formatTicketForCopy(daily.conservative),
      "",
      "----------",
      "",
      formatTicketForCopy(daily.aggressive),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(all);
      toast.success("Todos os bilhetes copiados!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-hero">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth"
          >
            <ArrowLeft className="w-4 h-4" /> Início
          </button>
          <div className="flex gap-3">
            <button
              onClick={copyAll}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-gold transition-smooth"
            >
              <Copy className="w-4 h-4" /> Copiar todos
            </button>
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold/80 transition-smooth"
            >
              <RotateCw className="w-4 h-4" /> Gerar
            </button>
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Bilhete do <span className="text-gold">Dia</span>
          </h1>
          <p className="text-muted-foreground mt-1">Os melhores sinais distribuídos em 3 estratégias.</p>
        </header>

        <div className="flex gap-2 p-1 bg-secondary rounded-2xl border border-border mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-smooth ${
                tab === t.key
                  ? "bg-gradient-gold text-primary-foreground shadow-gold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <DataSourceBadge
          source={meta.source}
          fetchedAt={meta.fetchedAt}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
        <TicketCard ticket={ticket} />
        <Disclaimer />
      </div>
    </div>
  );
}

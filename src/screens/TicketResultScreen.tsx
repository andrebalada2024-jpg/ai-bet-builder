import type { Ticket } from "@/types/betting";
import { TicketCard } from "@/components/TicketCard";
import { Disclaimer } from "@/components/Disclaimer";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { ArrowLeft, RotateCw } from "lucide-react";

export function TicketResultScreen({
  ticket,
  meta,
  refreshing,
  onRefresh,
  onBack,
  onRegenerate,
}: {
  ticket: Ticket;
  meta: { source: "real" | "mock"; fetchedAt: string };
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="min-h-screen w-full bg-gradient-hero">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth"
          >
            <ArrowLeft className="w-4 h-4" /> Início
          </button>
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold/80 transition-smooth"
          >
            <RotateCw className="w-4 h-4" /> Gerar novamente
          </button>
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

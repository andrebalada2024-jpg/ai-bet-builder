import type { Ticket } from "@/types/betting";
import { SelectionCard } from "./SelectionCard";
import { RiskBadge } from "./RiskBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { CopyButton } from "./CopyButton";
import { StakeInput } from "./StakeInput";
import { formatTicketForCopy } from "@/utils/formatters";

const SCENARIO_LABELS = {
  safe: "Bilhete Seguro",
  conservative: "Bilhete Conservador",
  aggressive: "Bilhete Agressivo",
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="bg-gradient-card border border-border rounded-3xl p-5 sm:p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold">{SCENARIO_LABELS[ticket.scenario]}</h3>
          <p className="text-sm text-muted-foreground mt-1">{ticket.summary}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Odd estimada</p>
          <p className="text-3xl font-extrabold text-gold tabular-nums">{ticket.estimatedOdd.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <RiskBadge risk={ticket.risk} />
        <ConfidenceBadge confidence={ticket.overallConfidence} />
        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary border border-border">
          {ticket.selections.length} seleções
        </span>
      </div>

      <div className="space-y-3 mb-5">
        {ticket.selections.map((s, i) => (
          <SelectionCard key={`${s.matchId}-${i}`} selection={s} index={i} />
        ))}
      </div>

      <StakeInput estimatedOdd={ticket.estimatedOdd} />

      <div className="flex justify-end">
        <CopyButton text={formatTicketForCopy(ticket)} />
      </div>
    </div>
  );
}

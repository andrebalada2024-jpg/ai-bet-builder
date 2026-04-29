import type { Selection } from "@/types/betting";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { formatKickoff } from "@/utils/formatters";
import { CalendarClock } from "lucide-react";

export function SelectionCard({ selection, index }: { selection: Selection; index: number }) {
  const kickoff = formatKickoff(selection.kickoff);
  return (
    <div
      className="bg-gradient-card border border-border rounded-2xl p-4 animate-float-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{selection.league}</p>
          <h4 className="font-semibold text-foreground truncate">{selection.matchLabel}</h4>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Odd</p>
          <p className="text-lg font-bold text-gold tabular-nums">{selection.odd.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="px-2.5 py-1 bg-secondary rounded-lg text-xs font-medium border border-border">
          {selection.market}
        </span>
        <ConfidenceBadge confidence={selection.confidence} size="xs" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{selection.reason}</p>
    </div>
  );
}

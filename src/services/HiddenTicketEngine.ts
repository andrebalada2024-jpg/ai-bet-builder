import type { Scenario, Ticket, DailyTicket } from "@/types/betting";
import { fetchTodayMatches } from "./DataProvider";
import { normalizeMatches } from "./OddsNormalizer";
import { buildTicket } from "./TicketBuilder";

export interface EngineOutput {
  ticket?: Ticket;
  daily?: DailyTicket;
}

/**
 * Hidden engine. UI must never inspect internals.
 */
export async function generate(scenario: Scenario): Promise<EngineOutput> {
  const raw = await fetchTodayMatches();
  const matches = normalizeMatches(raw);

  if (matches.length === 0) {
    throw new Error("NO_MATCHES");
  }

  if (scenario === "daily") {
    const safe = buildTicket(matches, "safe");
    const usedSafe = new Set(safe.selections.map((s) => s.matchId));
    const conservative = buildTicket(matches, "conservative", usedSafe);
    const usedAll = new Set([
      ...safe.selections.map((s) => s.matchId),
      ...conservative.selections.map((s) => s.matchId),
    ]);
    let aggressive = buildTicket(matches, "aggressive", usedAll);
    // If aggressive lacks selections (used set too restrictive), retry without exclusion
    if (aggressive.selections.length < 7) {
      aggressive = buildTicket(matches, "aggressive");
    }
    return { daily: { safe, conservative, aggressive } };
  }

  return { ticket: buildTicket(matches, scenario) };
}

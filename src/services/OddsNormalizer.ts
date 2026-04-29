import type { RawMatch } from "@/types/betting";
import { isTodayInSaoPaulo } from "@/utils/formatters";

export function normalizeMatches(matches: RawMatch[]): RawMatch[] {
  const now = Date.now();
  return matches
    .filter((m) => m.odds && m.odds.home && m.odds.away && m.odds.draw)
    .filter((m) => m.odds.home < 15 && m.odds.away < 15)
    .filter((m) => {
      const t = new Date(m.kickoff).getTime();
      if (!Number.isFinite(t)) return false;
      if (t < now) return false; // não começou ainda
      return isTodayInSaoPaulo(m.kickoff); // só hoje (fuso BR)
    })
    .map((m) => ({
      ...m,
      homeTeam: m.homeTeam.trim(),
      awayTeam: m.awayTeam.trim(),
    }));
}

export function impliedProb(odd: number): number {
  return odd > 0 ? 1 / odd : 0;
}

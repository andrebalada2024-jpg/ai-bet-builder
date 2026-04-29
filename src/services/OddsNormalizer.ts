import type { RawMatch } from "@/types/betting";

export function normalizeMatches(matches: RawMatch[]): RawMatch[] {
  return matches
    .filter((m) => m.odds && m.odds.home && m.odds.away && m.odds.draw)
    .filter((m) => m.odds.home < 15 && m.odds.away < 15)
    .map((m) => ({
      ...m,
      homeTeam: m.homeTeam.trim(),
      awayTeam: m.awayTeam.trim(),
    }));
}

export function impliedProb(odd: number): number {
  return odd > 0 ? 1 / odd : 0;
}

import type { RawMatch } from "@/types/betting";

export type FavoriteTier = "strong" | "medium" | "balanced";

export interface ProcessedMatch {
  match: RawMatch;
  probHome: number;
  probDraw: number;
  probAway: number;
  favorite: "home" | "away" | "none";
  favoriteTier: FavoriteTier;
  oddDiff: number;
}

export function impliedProb(odd: number): number {
  return odd > 0 ? 1 / odd : 0;
}

export function processOdds(matches: RawMatch[]): ProcessedMatch[] {
  return matches.map((m) => {
    const ph = impliedProb(m.odds.home);
    const pd = impliedProb(m.odds.draw);
    const pa = impliedProb(m.odds.away);
    const sum = ph + pd + pa || 1;

    const isHomeFav = m.odds.home <= m.odds.away;
    const favOdd = isHomeFav ? m.odds.home : m.odds.away;
    const oddDiff = Math.abs(m.odds.home - m.odds.away);

    let tier: FavoriteTier;
    if (favOdd <= 1.6) tier = "strong";
    else if (favOdd <= 2.2) tier = "medium";
    else tier = "balanced";

    if (oddDiff < 0.4 && favOdd > 1.6) tier = "balanced";

    return {
      match: m,
      probHome: ph / sum,
      probDraw: pd / sum,
      probAway: pa / sum,
      favorite: tier === "balanced" ? "none" : isHomeFav ? "home" : "away",
      favoriteTier: tier,
      oddDiff,
    };
  });
}

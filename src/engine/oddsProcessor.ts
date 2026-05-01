import type { RawMatch } from "@/types/betting";

export type FavoriteTier = "strong" | "clear" | "medium" | "none";

export interface MarketRead {
  balanced: boolean;
  veryBalanced: boolean;
  open: boolean;
  locked: boolean;
}

export interface ProcessedMatch {
  match: RawMatch;
  probHome: number;
  probDraw: number;
  probAway: number;
  favorite: "home" | "away" | "none";
  favoriteTier: FavoriteTier;
  oddDiff: number;
  read: MarketRead;
}

export function impliedProb(odd: number): number {
  return odd > 0 ? 1 / odd : 0;
}

function tierOf(favOdd: number, oddDiff: number): FavoriteTier {
  if (favOdd <= 1.55) return "strong";
  if (favOdd <= 1.6) return "clear";
  if (favOdd <= 2.2) {
    if (oddDiff < 0.4) return "none";
    return "medium";
  }
  return "none";
}

function readMarket(m: RawMatch, oddDiff: number): MarketRead {
  const o = m.odds;
  const balanced = oddDiff <= 0.85;
  const veryBalanced = oddDiff <= 0.55 && (!o.draw || o.draw <= 3.95);

  const open =
    (o.over25 !== undefined && o.over25 <= 1.85) ||
    (o.over15 !== undefined && o.over15 <= 1.35);

  const locked =
    (o.under35 !== undefined && o.under35 <= 1.55) ||
    // proxy under 2.5 baixo: derivado de over25 alto
    (o.over25 !== undefined && o.over25 >= 2.05) ||
    veryBalanced;

  return { balanced, veryBalanced, open, locked };
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

    const tier = tierOf(favOdd, oddDiff);
    const read = readMarket(m, oddDiff);

    return {
      match: m,
      probHome: ph / sum,
      probDraw: pd / sum,
      probAway: pa / sum,
      favorite: tier === "none" ? "none" : isHomeFav ? "home" : "away",
      favoriteTier: tier,
      oddDiff,
      read,
    };
  });
}

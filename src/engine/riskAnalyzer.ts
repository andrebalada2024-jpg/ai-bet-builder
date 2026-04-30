import type { ProcessedMatch } from "./oddsProcessor";
import { isSouthAmerican } from "./antiTrapEngine";

export type RiskTier = "safe" | "medium" | "high";

export interface ScoredMatch extends ProcessedMatch {
  score: number; // 0-100
  tier: RiskTier;
}

export function scoreMatch(p: ProcessedMatch): ScoredMatch {
  let score = 70; // base

  // +15 favorito claro
  if (p.favoriteTier === "strong") score += 15;

  // +10 odds equilibradas com proteção possível (DC disponível)
  if (
    p.favoriteTier === "balanced" &&
    p.match.odds.doubleChance1X &&
    p.match.odds.doubleChanceX2
  ) {
    score += 10;
  }

  // +10 under alto disponível
  if (p.match.odds.under35 && p.match.odds.under35 <= 1.6) score += 10;

  // -20 jogo equilibrado sem proteção
  if (p.favoriteTier === "balanced" && !p.match.odds.doubleChance1X && !p.match.odds.doubleChanceX2) {
    score -= 20;
  }

  // -25 sul-americano imprevisível
  if (isSouthAmerican(p.match.league) && p.favoriteTier !== "strong") score -= 25;

  // -30 odds inconsistentes (favorito teórico mas mercado contraria)
  if (p.favoriteTier === "strong") {
    const favOdd = p.favorite === "home" ? p.match.odds.home : p.match.odds.away;
    const otherOdd = p.favorite === "home" ? p.match.odds.away : p.match.odds.home;
    if (otherOdd / favOdd < 1.4) score -= 30;
  }

  // -20 alta variância (pace alto + favorito médio)
  const pace = p.match._stats?.paceExpectancy ?? 0.5;
  if (pace > 0.8 && p.favoriteTier !== "strong") score -= 20;

  score = Math.max(0, Math.min(100, score));

  let tier: RiskTier;
  if (score >= 80) tier = "safe";
  else if (score >= 65) tier = "medium";
  else tier = "high";

  return { ...p, score, tier };
}

export function analyzeRisk(matches: ProcessedMatch[]): ScoredMatch[] {
  return matches.map(scoreMatch);
}

import type { ProcessedMatch } from "./oddsProcessor";
import { isSouthAmerican } from "./antiTrapEngine";
import { getLiveInfo } from "./liveGameFilter";

export type RiskTier = "safe" | "medium" | "high";

export interface ScoredMatch extends ProcessedMatch {
  score: number; // 0-100
  tier: RiskTier;
}

export function scoreMatch(p: ProcessedMatch): ScoredMatch {
  let score = 60; // base
  const o = p.match.odds;

  // Bônus
  if (p.favoriteTier === "strong" || p.favoriteTier === "clear") score += 15;
  if ((p.favorite === "home" && o.doubleChance1X) || (p.favorite === "away" && o.doubleChanceX2)) {
    score += 12;
  }
  if (o.under35 && o.under35 <= 1.85 && p.read.balanced) score += 12;
  if (o.under35 && o.under35 <= 1.45) score += 10;
  if (p.read.locked) score += 10;
  if (o.under35 && o.under35 <= 1.7) score += 8;

  const live = getLiveInfo(p.match.kickoff);
  if (!live.isLive) score += 5;

  // Penalidades
  if (live.isLive) score -= 15;
  if (live.blocked) score -= 20;
  if (o.home < 1.2 && o.away < 1.2) score -= 20;

  if (p.read.balanced && p.favoriteTier === "none") score -= 20;
  if (p.read.locked && o.over15 && o.over15 <= 1.35) score -= 28;

  if (isSouthAmerican(p.match.league)) {
    if (p.read.balanced && !p.read.open) score -= 25;
    if (p.read.balanced && p.favorite === "away") score -= 20;
  }

  // Conflito declarado: favorito teórico mas DC contrária quase igual
  if (p.favoriteTier !== "none" && o.doubleChance1X && o.doubleChanceX2) {
    if (Math.abs(o.doubleChance1X - o.doubleChanceX2) < 0.05) score -= 30;
  }

  // Sem leitura clara
  if (p.favoriteTier === "none" && !p.read.locked && !p.read.open) score -= 30;

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

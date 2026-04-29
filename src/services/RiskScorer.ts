import type { RawMatch } from "@/types/betting";
import { impliedProb } from "./OddsNormalizer";

export type GameProfile =
  | "favorite_dominant"
  | "balanced"
  | "open"
  | "low_scoring"
  | "unpredictable";

export interface MarketCandidate {
  market: string; // user label
  internalKey: string;
  odd: number;
  baseRisk: number; // 0-1
  probability: number; // 0-1
  score: number; // composite, hidden
  reason: string;
}

export function detectGameProfile(m: RawMatch): GameProfile {
  const ph = impliedProb(m.odds.home);
  const pa = impliedProb(m.odds.away);
  const diff = Math.abs(ph - pa);
  const pace = m._stats?.paceExpectancy ?? 0.5;

  if (diff > 0.35) return "favorite_dominant";
  if (pace < 0.4) return "low_scoring";
  if (pace > 0.75 && diff < 0.2) return "open";
  if (diff < 0.1 && pace > 0.5) return "balanced";
  return "unpredictable";
}

export function evaluateMarkets(m: RawMatch): MarketCandidate[] {
  const profile = detectGameProfile(m);
  const stats = m._stats!;
  const candidates: MarketCandidate[] = [];

  const ph = impliedProb(m.odds.home);
  const pa = impliedProb(m.odds.away);
  const isHomeFav = ph > pa;
  const favTeam = isHomeFav ? m.homeTeam : m.awayTeam;

  // Double chance favorite
  if (m.odds.doubleChance1X && isHomeFav) {
    candidates.push({
      market: `Dupla chance: ${m.homeTeam} ou Empate`,
      internalKey: "dc_1x",
      odd: m.odds.doubleChance1X,
      baseRisk: 0.2,
      probability: impliedProb(m.odds.doubleChance1X) * 1.05,
      score: 0,
      reason: `protege o resultado do mandante.`,
    });
  }
  if (m.odds.doubleChanceX2 && !isHomeFav) {
    candidates.push({
      market: `Dupla chance: Empate ou ${m.awayTeam}`,
      internalKey: "dc_x2",
      odd: m.odds.doubleChanceX2,
      baseRisk: 0.25,
      probability: impliedProb(m.odds.doubleChanceX2) * 1.05,
      score: 0,
      reason: `protege o empate em jogo fora de casa.`,
    });
  }

  // Over 1.5
  if (m.odds.over15 && stats.paceExpectancy > 0.45) {
    candidates.push({
      market: "Mais de 1.5 gols",
      internalKey: "ov15",
      odd: m.odds.over15,
      baseRisk: 0.22,
      probability: 0.78,
      score: 0,
      reason: "linha baixa e jogo com boa expectativa de gols.",
    });
  }

  // Over 2.5
  if (m.odds.over25 && stats.paceExpectancy > 0.65 && profile !== "low_scoring") {
    candidates.push({
      market: "Mais de 2.5 gols",
      internalKey: "ov25",
      odd: m.odds.over25,
      baseRisk: 0.5,
      probability: 0.55,
      score: 0,
      reason: "ambas equipes mostram volume ofensivo consistente.",
    });
  }

  // Under 3.5
  if (m.odds.under35 && stats.paceExpectancy < 0.7) {
    candidates.push({
      market: "Menos de 3.5 gols",
      internalKey: "un35",
      odd: m.odds.under35,
      baseRisk: 0.25,
      probability: 0.8,
      score: 0,
      reason: "linha segura para cenário de controle.",
    });
  }

  // BTTS
  if (m.odds.btts && Math.abs(ph - pa) < 0.25 && stats.paceExpectancy > 0.55) {
    candidates.push({
      market: "Ambas marcam: Sim",
      internalKey: "btts_yes",
      odd: m.odds.btts,
      baseRisk: 0.45,
      probability: 0.58,
      score: 0,
      reason: "equilíbrio ofensivo entre as equipes.",
    });
  }

  // BTTS No (favorite dominant + weak away attack)
  if (m.odds.bttsNo && profile === "favorite_dominant" && stats.awayAttack < 0.5) {
    candidates.push({
      market: "Ambas marcam: Não",
      internalKey: "btts_no",
      odd: m.odds.bttsNo,
      baseRisk: 0.4,
      probability: 0.6,
      score: 0,
      reason: "favorito dominante contra ataque limitado.",
    });
  }

  // Resultado final favorito
  if (profile === "favorite_dominant") {
    const odd = isHomeFav ? m.odds.home : m.odds.away;
    candidates.push({
      market: `Vitória ${favTeam}`,
      internalKey: "res_fav",
      odd,
      baseRisk: 0.55,
      probability: impliedProb(odd) * 1.05,
      score: 0,
      reason: "favoritismo bem definido pelo mercado.",
    });
  }

  // Compute composite score (hidden weights)
  for (const c of candidates) {
    const oddQuality = 1 / (1 + Math.abs(c.odd - 1.7));
    const liquidity = c.odd > 1.15 && c.odd < 6 ? 1 : 0.5;
    c.score =
      c.probability * 0.45 +
      (1 - c.baseRisk) * 0.25 +
      oddQuality * 0.15 +
      liquidity * 0.15;
  }

  return candidates.sort((a, b) => b.score - a.score);
}

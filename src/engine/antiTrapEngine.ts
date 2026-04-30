import type { ProcessedMatch } from "./oddsProcessor";

const SOUTH_AMERICAN_KEYWORDS = [
  "libertadores",
  "sul-americana",
  "sudamericana",
  "copa america",
  "conmebol",
  "brasileirão",
  "brasileirao",
  "argentina",
  "paraguai",
  "uruguai",
  "chile",
  "colombia",
  "ecuador",
  "bolivia",
  "peru",
];

const FORBIDDEN_MARKETS = ["escanteios", "cartoes", "cartões", "jogador", "corner", "card", "player"];

export function isSouthAmerican(league: string): boolean {
  const l = league.toLowerCase();
  return SOUTH_AMERICAN_KEYWORDS.some((k) => l.includes(k));
}

/** Bloqueia jogos completos por armadilha */
export function shouldBlockMatch(p: ProcessedMatch): boolean {
  const o = p.match.odds;

  // Odds muito baixas
  if (o.home < 1.2 && o.away < 1.2) return true;

  // Sul-americano equilibrado = imprevisível
  if (isSouthAmerican(p.match.league) && p.favoriteTier === "balanced") {
    return true;
  }

  // Inconsistência: favorito declarado mas dupla chance contrária próxima
  if (o.doubleChance1X && o.doubleChanceX2) {
    if (Math.abs(o.doubleChance1X - o.doubleChanceX2) < 0.05 && p.favoriteTier === "strong") {
      return true; // mercado inconsistente
    }
  }

  return false;
}

/** Bloqueia mercados específicos */
export function isMarketAllowed(market: string, p: ProcessedMatch): boolean {
  const m = market.toLowerCase();

  // Mercados sempre proibidos
  if (FORBIDDEN_MARKETS.some((f) => m.includes(f))) return false;

  // Odds muito baixas
  // (verificado externamente com odd >= 1.2)

  // Libertadores / Sul-Americana específico
  if (isSouthAmerican(p.match.league)) {
    if (p.favoriteTier === "balanced" && m.includes("mais de 1.5")) return false;
    if (p.favoriteTier === "balanced" && m.startsWith("vitória") && p.favorite === "away") return false;
  }

  return true;
}

import type { ProcessedMatch } from "./oddsProcessor";
import { getLiveInfo } from "./liveGameFilter";

const SOUTH_AMERICAN_KEYWORDS = [
  "libertadores", "sul-americana", "sudamericana", "copa america", "conmebol",
  "brasileirão", "brasileirao", "brazil", "argentina", "paraguai", "uruguai",
  "chile", "colombia", "colômbia", "ecuador", "bolivia", "peru", "mexico", "méxico",
];

const FORBIDDEN_KEYWORDS = [
  "escanteio", "corner", "cartão", "cartao", "card",
  "jogador", "player", "shot", "chute",
  "placar exato", "exact score", "próximo gol", "next goal", "handicap",
];

export function isSouthAmerican(league: string): boolean {
  const l = league.toLowerCase();
  return SOUTH_AMERICAN_KEYWORDS.some((k) => l.includes(k));
}

/** Bloqueia jogos completos por armadilha. */
export function shouldBlockMatch(p: ProcessedMatch): boolean {
  const o = p.match.odds;

  // Jogo encerrado / muito avançado
  if (getLiveInfo(p.match.kickoff).blocked) return true;

  // Odds extremamente baixas individualmente (odd < 1.15 = mercado anômalo)
  if (o.home < 1.15 || o.away < 1.15) return true;

  // Odds muito baixas dos dois lados (mercado morto)
  if (o.home < 1.2 && o.away < 1.2) return true;

  // Sem mercado de proteção
  if (!o.under35 && !o.doubleChance1X && !o.doubleChanceX2) return true;

  // Sem leitura clara (equilibrado, sem favorito, sem under nem aberto)
  if (p.favoriteTier === "none" && !p.read.locked && !p.read.open) return true;

  // Sul-americano equilibrado sem leitura aberta clara → imprevisível
  if (isSouthAmerican(p.match.league) && p.read.veryBalanced && !p.read.open) {
    return true;
  }

  // Inconsistência: favorito declarado mas DC opostas quase iguais
  if (o.doubleChance1X && o.doubleChanceX2) {
    if (Math.abs(o.doubleChance1X - o.doubleChanceX2) < 0.05 &&
      (p.favoriteTier === "strong" || p.favoriteTier === "clear")) {
      return true;
    }
  }

  return false;
}

/** Bloqueia mercados específicos. */
export function isMarketAllowed(market: string, p: ProcessedMatch): boolean {
  const m = market.toLowerCase();

  if (FORBIDDEN_KEYWORDS.some((f) => m.includes(f))) return false;

  // Sul-americano: regras específicas
  if (isSouthAmerican(p.match.league)) {
    if (p.read.balanced && m.includes("mais de 1.5")) return false;
    if (p.read.balanced && m.includes("mais de 2.5")) return false;
    if (p.read.balanced && m.startsWith("vitória") && p.favorite === "away") return false;
  }

  // Jogo travado: nada de over
  if (p.read.locked) {
    if (m.includes("mais de 1.5") || m.includes("mais de 2.5")) return false;
  }

  // Vitória seca em jogo muito equilibrado
  if (p.read.veryBalanced && m.startsWith("vitória")) return false;

  return true;
}

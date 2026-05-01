import type { Selection } from "@/types/betting";
import type { ScoredMatch } from "./riskAnalyzer";
import type { Strategy } from "./strategyEngine";
import { isMarketAllowed } from "./antiTrapEngine";
import { classifyMarket, type MarketRisk } from "./marketClassifier";
import { getLiveInfo, isProtectedMarket } from "./liveGameFilter";

interface MarketOption {
  internalKey: string;
  market: string;
  odd: number | undefined;
  baseRisk: MarketRisk;
  reason: string;
  priority: number; // menor = preferido
}

function listMarketOptions(p: ScoredMatch): MarketOption[] {
  const m = p.match;
  const o = m.odds;
  const opts: MarketOption[] = [];

  // Vitória de favorito
  if (p.favorite === "home" && (p.favoriteTier === "strong" || p.favoriteTier === "clear")) {
    opts.push({
      internalKey: "res_fav_strong",
      market: `Vitória ${m.homeTeam}`,
      odd: o.home,
      baseRisk: "low",
      reason: "Favorito claro com odd coerente.",
      priority: 3,
    });
  } else if (p.favorite === "home" && p.favoriteTier === "medium") {
    opts.push({
      internalKey: "res_fav_medium",
      market: `Vitória ${m.homeTeam}`,
      odd: o.home,
      baseRisk: "medium",
      reason: "Favorito mandante com retorno equilibrado.",
      priority: 5,
    });
  }
  if (p.favorite === "away" && (p.favoriteTier === "strong" || p.favoriteTier === "clear")) {
    opts.push({
      internalKey: "res_fav_strong",
      market: `Vitória ${m.awayTeam}`,
      odd: o.away,
      baseRisk: "low",
      reason: "Favorito claro com odd coerente.",
      priority: 4,
    });
  }

  // Dupla chance
  if (o.doubleChance1X && (p.favorite === "home" || p.favoriteTier !== "none")) {
    opts.push({
      internalKey: "dc_1x",
      market: `Dupla chance: ${m.homeTeam} ou Empate`,
      odd: o.doubleChance1X,
      baseRisk: "low",
      reason: "Proteção contra empate.",
      priority: 2,
    });
  }
  if (o.doubleChanceX2 && p.favorite === "away") {
    opts.push({
      internalKey: "dc_x2",
      market: `Dupla chance: Empate ou ${m.awayTeam}`,
      odd: o.doubleChanceX2,
      baseRisk: "low",
      reason: "Proteção contra empate.",
      priority: 2,
    });
  }

  // Unders — anti-zebra principal
  if (o.under35) {
    opts.push({
      internalKey: "un35",
      market: "Menos de 3.5 gols",
      odd: o.under35,
      baseRisk: "low",
      reason: "Jogo equilibrado, under 3.5 reduz risco.",
      priority: 1,
    });
    if (o.under35 <= 1.45) {
      opts.push({
        internalKey: "un45",
        market: "Menos de 4.5 gols",
        odd: +(o.under35 * 0.85 + 0.15).toFixed(2),
        baseRisk: "low",
        reason: "Linha protegida para jogo travado.",
        priority: 2,
      });
    }
    if (o.under35 <= 1.3) {
      opts.push({
        internalKey: "un55",
        market: "Menos de 5.5 gols",
        odd: +(o.under35 * 0.78 + 0.22).toFixed(2),
        baseRisk: "low",
        reason: "Linha alta de proteção.",
        priority: 3,
      });
    }
  }
  // Under 2.5 sintético quando jogo claramente travado e over 2.5 alto
  if (o.over25 && o.over25 >= 2.05 && p.read.locked) {
    const synthUn25 = +(1 / (1 - 1 / o.over25) * 0.95).toFixed(2);
    if (synthUn25 >= 1.2 && synthUn25 <= 2.0) {
      opts.push({
        internalKey: "un25",
        market: "Menos de 2.5 gols",
        odd: synthUn25,
        baseRisk: "medium",
        reason: "Linha protegida para jogo travado.",
        priority: 4,
      });
    }
  }

  // Overs — só com leitura aberta clara
  if (o.over15 && p.read.open && !p.read.locked) {
    opts.push({
      internalKey: "ov15",
      market: "Mais de 1.5 gols",
      odd: o.over15,
      baseRisk: "medium",
      reason: "Jogo aberto detectado pelas odds.",
      priority: 5,
    });
  }
  if (o.over25 && p.read.open && o.over25 <= 1.85 && !p.read.locked) {
    opts.push({
      internalKey: "ov25_open",
      market: "Mais de 2.5 gols",
      odd: o.over25,
      baseRisk: "medium",
      reason: "Jogo muito aberto detectado pelas odds.",
      priority: 6,
    });
  }

  return opts;
}

interface PickedItem {
  selection: Selection;
  baseRisk: MarketRisk;
  score: number;
}

function conflicts(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.includes("mais de") && y.includes("menos de")) return true;
  if (x.includes("menos de") && y.includes("mais de")) return true;
  if (x.startsWith("vitória") && y.startsWith("dupla chance")) return true;
  if (y.startsWith("vitória") && x.startsWith("dupla chance")) return true;
  return false;
}

export function buildSelections(
  scored: ScoredMatch[],
  strategy: Strategy,
  excludeMatchIds: Set<string> = new Set()
): { picked: PickedItem[] } {
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const picked: PickedItem[] = [];
  const usedMatches = new Set<string>(excludeMatchIds);
  let mediumRiskUsed = 0;
  let highRiskUsed = 0;

  for (const p of sorted) {
    if (picked.length >= strategy.maxSelections) break;
    if (usedMatches.has(p.match.id)) continue;
    if (p.score < strategy.minScore) continue;

    const live = getLiveInfo(p.match.kickoff);
    if (live.blocked) continue;

    let options = listMarketOptions(p)
      .filter((o) => o.odd !== undefined && o.odd >= 1.2 && o.odd >= strategy.minOdd && o.odd <= strategy.maxOdd)
      .filter((o) => strategy.allowedMarkets.includes(o.internalKey))
      .filter((o) => isMarketAllowed(o.market, p))
      .filter((o) => classifyMarket(o.internalKey) === o.baseRisk || true);

    // Ao vivo avançado: apenas mercados protegidos
    if (live.phase === "live_46_65" || live.phase === "halftime") {
      options = options.filter((o) => isProtectedMarket(o.internalKey));
    } else if (live.phase === "live_16_45") {
      options = options.filter((o) => isProtectedMarket(o.internalKey) || o.baseRisk === "low");
    }

    // Filtra risco respeitando limites do cenário
    options = options.filter((o) => {
      if (o.baseRisk === "high" && highRiskUsed >= strategy.maxHighRisk) return false;
      if (o.baseRisk === "medium" && mediumRiskUsed >= strategy.maxMediumRisk) return false;
      return true;
    });

    if (!options.length) continue;

    // Ordenar: menor risco > menor priority > odd mais próxima de 1.55
    options.sort((a, b) => {
      const ra = a.baseRisk === "low" ? 0 : a.baseRisk === "medium" ? 1 : 2;
      const rb = b.baseRisk === "low" ? 0 : b.baseRisk === "medium" ? 1 : 2;
      if (ra !== rb) return ra - rb;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return Math.abs((a.odd ?? 99) - 1.55) - Math.abs((b.odd ?? 99) - 1.55);
    });

    const chosen = options[0];

    const conflict = picked.some(
      (pk) => pk.selection.matchId === p.match.id && conflicts(pk.selection.market, chosen.market)
    );
    if (conflict) continue;

    picked.push({
      selection: {
        matchId: p.match.id,
        matchLabel: `${p.match.homeTeam} x ${p.match.awayTeam}`,
        league: p.match.league,
        kickoff: p.match.kickoff,
        market: chosen.market,
        odd: chosen.odd!,
        confidence: p.score >= 80 ? "high" : p.score >= 65 ? "medium" : "low",
        reason: chosen.reason,
      },
      baseRisk: chosen.baseRisk,
      score: p.score,
    });

    usedMatches.add(p.match.id);
    if (chosen.baseRisk === "medium") mediumRiskUsed++;
    if (chosen.baseRisk === "high") highRiskUsed++;
  }

  return { picked };
}

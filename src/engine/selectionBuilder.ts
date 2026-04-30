import type { Selection } from "@/types/betting";
import type { ScoredMatch } from "./riskAnalyzer";
import type { Strategy } from "./strategyEngine";
import { isMarketAllowed } from "./antiTrapEngine";

interface MarketOption {
  internalKey: string;
  market: string;
  odd: number | undefined;
  baseRisk: "low" | "medium" | "high";
  reason: string;
}

function listMarketOptions(p: ScoredMatch): MarketOption[] {
  const m = p.match;
  const o = m.odds;
  const opts: MarketOption[] = [];

  if (p.favorite === "home" && p.favoriteTier === "strong") {
    opts.push({
      internalKey: "res_fav",
      market: `Vitória ${m.homeTeam}`,
      odd: o.home,
      baseRisk: "low",
      reason: "favorito claro com odd consistente",
    });
  }
  if (p.favorite === "away" && p.favoriteTier === "strong") {
    opts.push({
      internalKey: "res_fav",
      market: `Vitória ${m.awayTeam}`,
      odd: o.away,
      baseRisk: "medium",
      reason: "favorito claro com odd consistente",
    });
  }

  if (o.doubleChance1X && (p.favorite === "home" || p.favoriteTier !== "balanced")) {
    opts.push({
      internalKey: "dc_1x",
      market: `Dupla chance: ${m.homeTeam} ou Empate`,
      odd: o.doubleChance1X,
      baseRisk: "low",
      reason: "proteção contra empate",
    });
  }
  if (o.doubleChanceX2 && p.favorite === "away") {
    opts.push({
      internalKey: "dc_x2",
      market: `Dupla chance: Empate ou ${m.awayTeam}`,
      odd: o.doubleChanceX2,
      baseRisk: "low",
      reason: "proteção contra empate",
    });
  }

  if (o.over15) {
    opts.push({
      internalKey: "ov15",
      market: "Mais de 1.5 gols",
      odd: o.over15,
      baseRisk: "low",
      reason: "linha baixa de gols",
    });
  }
  if (o.over25) {
    opts.push({
      internalKey: "ov25",
      market: "Mais de 2.5 gols",
      odd: o.over25,
      baseRisk: "medium",
      reason: "jogo aberto, tendência de gols",
    });
  }
  if (o.under35) {
    opts.push({
      internalKey: "un35",
      market: "Menos de 3.5 gols",
      odd: o.under35,
      baseRisk: "low",
      reason: "jogo travado, tendência under",
    });
  }
  // Sintético "menos de 4.5/5.5" usando under35 com ajuste — só se odd muito baixa
  if (o.under35 && o.under35 <= 1.45) {
    opts.push({
      internalKey: "un45",
      market: "Menos de 4.5 gols",
      odd: +(o.under35 * 0.85 + 0.15).toFixed(2),
      baseRisk: "low",
      reason: "linha alta de proteção",
    });
  }

  if (o.btts) {
    opts.push({
      internalKey: "btts_yes",
      market: "Ambas marcam: Sim",
      odd: o.btts,
      baseRisk: "medium",
      reason: "equilíbrio ofensivo",
    });
  }
  if (o.bttsNo) {
    opts.push({
      internalKey: "btts_no",
      market: "Ambas marcam: Não",
      odd: o.bttsNo,
      baseRisk: "medium",
      reason: "defesa do favorito sólida",
    });
  }

  return opts;
}

interface PickedItem {
  selection: Selection;
  baseRisk: "low" | "medium" | "high";
  score: number;
}

function conflicts(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.includes("mais de") && y.includes("menos de")) return true;
  if (x.includes("menos de") && y.includes("mais de")) return true;
  if (x.includes("ambas marcam: sim") && y.includes("ambas marcam: não")) return true;
  if (x.includes("ambas marcam: não") && y.includes("ambas marcam: sim")) return true;
  if (x.startsWith("vitória") && y.startsWith("dupla chance")) return true;
  if (y.startsWith("vitória") && x.startsWith("dupla chance")) return true;
  return false;
}

export function buildSelections(
  scored: ScoredMatch[],
  strategy: Strategy,
  excludeMatchIds: Set<string> = new Set()
): { picked: PickedItem[] } {
  // Ordenar jogos por score
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const picked: PickedItem[] = [];
  const usedMatches = new Set<string>(excludeMatchIds);
  let mediumRiskUsed = 0;

  for (const p of sorted) {
    if (picked.length >= strategy.maxSelections) break;
    if (usedMatches.has(p.match.id)) continue;
    if (p.score < strategy.minScore) continue;

    const options = listMarketOptions(p)
      .filter((o) => o.odd && o.odd >= strategy.minOdd && o.odd <= strategy.maxOdd)
      .filter((o) => strategy.allowedMarkets.includes(o.internalKey))
      .filter((o) => isMarketAllowed(o.market, p))
      .filter((o) => {
        if (o.baseRisk === "high") return false;
        if (o.baseRisk === "medium") {
          if (!strategy.allowMediumRiskMarket) return false;
          if (mediumRiskUsed >= 1) return false;
        }
        return true;
      });

    if (!options.length) continue;

    // Ordenar opções: menor risco > odd mais próxima de 1.6 (qualidade)
    options.sort((a, b) => {
      const ra = a.baseRisk === "low" ? 0 : 1;
      const rb = b.baseRisk === "low" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return Math.abs((a.odd ?? 99) - 1.6) - Math.abs((b.odd ?? 99) - 1.6);
    });

    const chosen = options[0];

    // Validar conflito com seleções já feitas (defensivo, mas como 1 por jogo já evita)
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
        confidence: p.score >= 85 ? "high" : p.score >= 72 ? "medium" : "low",
        reason: chosen.reason,
      },
      baseRisk: chosen.baseRisk,
      score: p.score,
    });

    usedMatches.add(p.match.id);
    if (chosen.baseRisk === "medium") mediumRiskUsed++;
  }

  return { picked };
}

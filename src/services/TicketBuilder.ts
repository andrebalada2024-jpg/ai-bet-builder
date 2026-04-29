import type { RawMatch, Ticket, Selection, Confidence, RiskLevel, Scenario } from "@/types/betting";
import { evaluateMarkets } from "./RiskScorer";
import { isCoherent } from "./CoherenceValidator";
import { getPlan } from "./StrategyPlanner";

function scoreToConfidence(score: number): Confidence {
  if (score >= 0.62) return "high";
  if (score >= 0.48) return "medium";
  return "low";
}

function scenarioRisk(s: Exclude<Scenario, "daily">): RiskLevel {
  return s === "safe" ? "low" : s === "conservative" ? "medium" : "high";
}

function summaryFor(s: Exclude<Scenario, "daily">): string {
  if (s === "safe") return "Bilhete focado em proteção e mercados de alta probabilidade.";
  if (s === "conservative") return "Equilíbrio entre segurança e retorno potencial.";
  return "Bilhete agressivo com odds maiores e maior variância.";
}

interface ScoredCandidate {
  selection: Selection;
  score: number;
}

export function buildTicket(
  matches: RawMatch[],
  scenario: Exclude<Scenario, "daily">,
  excludeMatchIds: Set<string> = new Set()
): Ticket {
  const plan = getPlan(scenario);

  // Generate all candidates
  const all: ScoredCandidate[] = [];
  for (const m of matches) {
    if (excludeMatchIds.has(m.id)) continue;
    const candidates = evaluateMarkets(m).filter(
      (c) => plan.allowedMarkets.includes(c.internalKey) && c.odd <= plan.oddCeiling
    );
    for (const c of candidates) {
      all.push({
        selection: {
          matchId: m.id,
          matchLabel: `${m.homeTeam} x ${m.awayTeam}`,
          league: m.league,
          kickoff: m.kickoff,
          market: c.market,
          odd: c.odd,
          confidence: scoreToConfidence(c.score),
          reason: c.reason,
        },
        score: c.score,
      });
    }
  }

  all.sort((a, b) => b.score - a.score);

  const picked: Selection[] = [];
  for (const cand of all) {
    if (picked.length >= plan.maxSelections) break;
    if (isCoherent(cand.selection, picked, scenario)) {
      picked.push(cand.selection);
    }
  }

  // Trim if over min but contains weakest if exceeds — keep top
  const final = picked.slice(0, plan.maxSelections);

  const estimatedOdd = +final.reduce((acc, s) => acc * s.odd, 1).toFixed(2);
  const avgConfScore = final.length
    ? final.reduce((acc, s) => acc + (s.confidence === "high" ? 1 : s.confidence === "medium" ? 0.6 : 0.3), 0) / final.length
    : 0;
  const overall: Confidence = avgConfScore >= 0.8 ? "high" : avgConfScore >= 0.55 ? "medium" : "low";

  return {
    scenario,
    selections: final,
    estimatedOdd,
    risk: scenarioRisk(scenario),
    overallConfidence: overall,
    summary: summaryFor(scenario),
  };
}

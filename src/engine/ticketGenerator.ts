import type { Ticket, DailyTicket, Confidence, RiskLevel, Scenario } from "@/types/betting";
import { fetchMatches } from "./dataFetcher";
import { processOdds } from "./oddsProcessor";
import { analyzeRisk } from "./riskAnalyzer";
import { shouldBlockMatch } from "./antiTrapEngine";
import { getStrategy, type StrategyScenario } from "./strategyEngine";
import { buildSelections } from "./selectionBuilder";

export interface EngineResult {
  ticket?: Ticket;
  daily?: DailyTicket;
  meta: {
    source: "real" | "mock";
    fetchedAt: string;
  };
}

function summaryFor(s: StrategyScenario): string {
  if (s === "safe") return "Bilhete focado em proteção e mercados de alta probabilidade.";
  if (s === "conservative") return "Equilíbrio entre segurança e retorno potencial.";
  return "Bilhete agressivo com odds maiores e maior variância.";
}

function risk(s: StrategyScenario): RiskLevel {
  return s === "safe" ? "low" : s === "conservative" ? "medium" : "high";
}

function makeTicket(
  scenario: StrategyScenario,
  scored: ReturnType<typeof analyzeRisk>,
  excludeIds: Set<string> = new Set()
): Ticket | null {
  const strat = getStrategy(scenario);
  const { picked } = buildSelections(scored, strat, excludeIds);

  if (picked.length < strat.minSelections) {
    // Fallback: relaxar score ligeiramente
    const relaxed = { ...strat, minScore: Math.max(50, strat.minScore - 10) };
    const retry = buildSelections(scored, relaxed, excludeIds).picked;
    if (retry.length < Math.min(3, strat.minSelections)) return null;
    return finalize(scenario, retry);
  }

  return finalize(scenario, picked);
}

function finalize(
  scenario: StrategyScenario,
  picked: ReturnType<typeof buildSelections>["picked"]
): Ticket {
  const selections = picked.map((p) => p.selection);
  const estimatedOdd = +selections.reduce((acc, s) => acc * s.odd, 1).toFixed(2);
  const avgScore = picked.reduce((a, p) => a + p.score, 0) / (picked.length || 1);
  const overall: Confidence = avgScore >= 82 ? "high" : avgScore >= 70 ? "medium" : "low";

  return {
    scenario,
    selections,
    estimatedOdd,
    risk: risk(scenario),
    overallConfidence: overall,
    summary: summaryFor(scenario),
  };
}

export async function generateTicket(scenario: Scenario): Promise<EngineResult> {
  // 1. Buscar jogos
  const fetched = await fetchMatches();
  if (fetched.matches.length === 0) {
    throw new Error("NO_MATCHES");
  }

  // 2. Processar odds | 3. Probabilidade
  const processed = processOdds(fetched.matches);

  // 4. Anti-trap (bloquear jogos)
  const safeMatches = processed.filter((p) => !shouldBlockMatch(p));
  if (safeMatches.length === 0) {
    throw new Error("NO_MATCHES");
  }

  // 5. Score de risco
  const scored = analyzeRisk(safeMatches);

  const meta = { source: fetched.source, fetchedAt: fetched.fetchedAt };

  if (scenario === "daily") {
    const safe = makeTicket("safe", scored);
    const usedSafe = new Set(safe?.selections.map((s) => s.matchId) ?? []);
    const conservative = makeTicket("conservative", scored, usedSafe);
    const usedAll = new Set([
      ...usedSafe,
      ...(conservative?.selections.map((s) => s.matchId) ?? []),
    ]);
    let aggressive = makeTicket("aggressive", scored, usedAll);
    if (!aggressive) aggressive = makeTicket("aggressive", scored);

    if (!safe || !conservative || !aggressive) {
      throw new Error("NO_MATCHES");
    }

    return { daily: { safe, conservative, aggressive }, meta };
  }

  const ticket = makeTicket(scenario, scored);
  if (!ticket) throw new Error("NO_MATCHES");
  return { ticket, meta };
}

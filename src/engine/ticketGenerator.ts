import type { Ticket, DailyTicket, Confidence, RiskLevel, Scenario } from "@/types/betting";
import { fetchMatches } from "./dataFetcher";
import { processOdds } from "./oddsProcessor";
import { analyzeRisk } from "./riskAnalyzer";
import { shouldBlockMatch } from "./antiTrapEngine";
import { getStrategy, type StrategyScenario } from "./strategyEngine";
import { buildSelections } from "./selectionBuilder";
import { filterPlayable } from "./liveGameFilter";

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
  let { picked } = buildSelections(scored, strat, excludeIds);

  if (picked.length < strat.minSelections) {
    // 1ª tentativa: relaxa score
    const r1 = { ...strat, minScore: Math.max(42, strat.minScore - 8) };
    picked = buildSelections(scored, r1, excludeIds).picked;
  }
  if (picked.length < 3) {
    // 2ª tentativa: relaxa score + maxOdd
    const r2 = { ...strat, minScore: 38, maxOdd: strat.maxOdd + 0.6 };
    picked = buildSelections(scored, r2, excludeIds).picked;
  }
  if (picked.length < 3) {
    // 3ª tentativa: ignora exclusão (libera matches já usados em outros bilhetes)
    const r3 = { ...strat, minScore: 38, maxOdd: strat.maxOdd + 0.6 };
    picked = buildSelections(scored, r3, new Set()).picked;
  }
  if (picked.length < 3) return null;

  return finalize(scenario, picked.slice(0, strat.maxSelections));
}

function finalize(
  scenario: StrategyScenario,
  picked: ReturnType<typeof buildSelections>["picked"]
): Ticket {
  const selections = picked.map((p) => p.selection);
  const estimatedOdd = +selections.reduce((acc, s) => acc * s.odd, 1).toFixed(2);
  const avgScore = picked.reduce((a, p) => a + p.score, 0) / (picked.length || 1);
  const overall: Confidence = avgScore >= 80 ? "high" : avgScore >= 65 ? "medium" : "low";

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
  // 1. Buscar jogos reais
  const fetched = await fetchMatches();
  if (fetched.matches.length === 0) {
    throw new Error("NO_MATCHES");
  }

  // 2. Live filter — remove jogos encerrados/avançados
  const playable = filterPlayable(fetched.matches);
  if (playable.length === 0) throw new Error("NO_MATCHES");

  // 3. Processar odds (leitura de mercado)
  const processed = processOdds(playable);

  // 4. Anti-trap (bloquear jogos)
  const safeMatches = processed.filter((p) => !shouldBlockMatch(p));
  if (safeMatches.length === 0) throw new Error("NO_MATCHES");

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

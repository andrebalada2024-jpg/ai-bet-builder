import type { Selection } from "@/types/betting";
import type { ScoredMatch } from "./riskAnalyzer";
import type { Strategy } from "./strategyEngine";
import { isMarketAllowed } from "./antiTrapEngine";
import { classifyMarket } from "./marketClassifier";
import { getLiveInfo, isProtectedMarket } from "./liveGameFilter";

interface MarketOption {
  internalKey: string;
  market: string;
  odd: number | undefined;
  baseRisk: "low" | "medium" | "high";
  reason: string;
  priority: number; // menor = preferido
  synthetic?: boolean; // odd calculada, não real da API
}

function listMarketOptions(p: ScoredMatch): MarketOption[] {
  const m = p.match;
  const o = m.odds;
  const opts: MarketOption[] = [];

  // === PRIORIDADE 1–2: Unders — proteção anti-zebra principal ===
  // Under 3.5 é sempre preferido em qualquer perfil de jogo
  if (o.under35) {
    opts.push({
      internalKey: "un35",
      market: "Menos de 3.5 gols",
      odd: o.under35,
      baseRisk: "low",
      reason: "Proteção anti-zebra: under 3.5 reduz risco independente do perfil.",
      priority: 1,
    });
    // Under 4.5 sintético — só se under35 muito baixo (jogo travado)
    if (o.under35 <= 1.45) {
      opts.push({
        internalKey: "un45",
        market: "Menos de 4.5 gols (estimada)",
        odd: +Math.min(o.under35 * 0.87 + 0.13, 1.99).toFixed(2),
        baseRisk: "low",
        reason: "Linha protegida para jogo travado (odd estimada).",
        priority: 2,
        synthetic: true,
      });
    }
    // Under 5.5 sintético — só se under35 muito baixo
    if (o.under35 <= 1.3) {
      opts.push({
        internalKey: "un55",
        market: "Menos de 5.5 gols (estimada)",
        odd: +Math.min(o.under35 * 0.80 + 0.20, 1.99).toFixed(2),
        baseRisk: "low",
        reason: "Linha alta de proteção para jogo muito fechado (odd estimada).",
        priority: 3,
        synthetic: true,
      });
    }
  }

  // Under 2.5 sintético — apenas em jogo claramente travado (over25 muito alto)
  if (o.over25 && o.over25 >= 2.20 && p.read.locked && !p.read.open) {
    const synthUn25 = +(1 / (1 - 1 / o.over25) * 0.93).toFixed(2);
    if (synthUn25 >= 1.15 && synthUn25 <= 2.2) {
      opts.push({
        internalKey: "un25",
        market: "Menos de 2.5 gols (estimada)",
        odd: synthUn25,
        baseRisk: "medium",
        reason: "Jogo travado, under 2.5 protege (odd estimada).",
        priority: 4,
        synthetic: true,
      });
    }
  }

  // === PRIORIDADE 2–3: Dupla chance — proteção com favorito ===
  // Favorito mandante: 1X
  if (o.doubleChance1X && p.favorite === "home" && p.favoriteTier !== "none") {
    opts.push({
      internalKey: "dc_1x",
      market: `Dupla chance: ${m.homeTeam} ou Empate`,
      odd: o.doubleChance1X,
      baseRisk: "low",
      reason: "Proteção contra empate para favorito mandante.",
      priority: 2,
    });
  }
  // Favorito visitante: X2
  if (o.doubleChanceX2 && p.favorite === "away" && p.favoriteTier !== "none") {
    opts.push({
      internalKey: "dc_x2",
      market: `Dupla chance: Empate ou ${m.awayTeam}`,
      odd: o.doubleChanceX2,
      baseRisk: "low",
      reason: "Proteção contra empate para favorito visitante.",
      priority: 2,
    });
  }

  // === PRIORIDADE 3–5: Vitória de favorito — somente favorito CLARO/FORTE ===
  // NUNCA em jogo equilibrado (balanced/veryBalanced)
  if (!p.read.balanced) {
    if (p.favorite === "home" && (p.favoriteTier === "strong" || p.favoriteTier === "clear")) {
      opts.push({
        internalKey: "res_fav_strong",
        market: `Vitória ${m.homeTeam}`,
        odd: o.home,
        baseRisk: "low",
        reason: "Favorito claro mandante — favoritismo bem definido.",
        priority: 3,
      });
    }
    if (p.favorite === "away" && (p.favoriteTier === "strong" || p.favoriteTier === "clear")) {
      opts.push({
        internalKey: "res_fav_strong",
        market: `Vitória ${m.awayTeam}`,
        odd: o.away,
        baseRisk: "low",
        reason: "Favorito claro visitante — favoritismo bem definido.",
        priority: 4,
      });
    }
    // Favorito médio — não em jogo equilibrado
    if (p.favorite === "home" && p.favoriteTier === "medium") {
      opts.push({
        internalKey: "res_fav_medium",
        market: `Vitória ${m.homeTeam}`,
        odd: o.home,
        baseRisk: "medium",
        reason: "Favorito mandante com retorno equilibrado.",
        priority: 5,
      });
    }
  }

  // === PRIORIDADE 5–6: Overs — apenas com leitura claramente aberta ===
  // ov15: só se jogo ABERTO e NÃO TRAVADO
  if (o.over15 && p.read.open && !p.read.locked && !p.read.balanced) {
    opts.push({
      internalKey: "ov15",
      market: "Mais de 1.5 gols",
      odd: o.over15,
      baseRisk: "medium",
      reason: "Jogo claramente aberto detectado pelas odds.",
      priority: 5,
    });
  }
  // ov25: exige jogo muito aberto e odd razoável
  if (o.over25 && p.read.open && o.over25 <= 1.85 && !p.read.locked && !p.read.balanced) {
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
  baseRisk: "low" | "medium" | "high";
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

    // Lista de opções de mercado
    let options = listMarketOptions(p)
      // Filtro de odd: mínima 1.15 (bloqueio explícito < 1.15) e dentro do range da estratégia
      .filter((o) => o.odd !== undefined && o.odd >= 1.15 && o.odd >= strategy.minOdd && o.odd <= strategy.maxOdd)
      // Mercados permitidos pelo cenário
      .filter((o) => strategy.allowedMarkets.includes(o.internalKey))
      // Anti-trap de mercado (proibidos por palavra-chave)
      .filter((o) => isMarketAllowed(o.market, p))
      // Classificação de risco deve bater com o declarado no MarketOption
      // (validação real — sem || true)
      .filter((o) => classifyMarket(o.internalKey) === o.baseRisk);

    // Ao vivo avançado (46–65 min / intervalo): apenas mercados protegidos
    if (live.phase === "live_46_65" || live.phase === "halftime") {
      options = options.filter((o) => isProtectedMarket(o.internalKey));
    } else if (live.phase === "live_16_45") {
      options = options.filter((o) => isProtectedMarket(o.internalKey) || o.baseRisk === "low");
    }

    // Limites de risco do cenário
    options = options.filter((o) => {
      if (o.baseRisk === "high" && highRiskUsed >= strategy.maxHighRisk) return false;
      if (o.baseRisk === "medium" && mediumRiskUsed >= strategy.maxMediumRisk) return false;
      return true;
    });

    if (!options.length) continue;

    // Ordenação: menor risco → menor priority → odd mais próxima de 1.55
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

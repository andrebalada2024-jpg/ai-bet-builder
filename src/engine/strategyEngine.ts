import type { Scenario } from "@/types/betting";

export type StrategyScenario = Exclude<Scenario, "daily">;

export interface Strategy {
  scenario: StrategyScenario;
  minSelections: number;
  maxSelections: number;
  minScore: number;
  allowedMarkets: string[];
  maxOdd: number;
  minOdd: number;
  targetOddMin: number;
  targetOddMax: number;
  maxMediumRisk: number;
  maxHighRisk: number;
}

export function getStrategy(scenario: StrategyScenario): Strategy {
  switch (scenario) {
    case "safe":
      return {
        scenario,
        minSelections: 3,
        maxSelections: 4,
        minScore: 58,
        // Seguro: apenas favorito forte, dupla chance e unders
        // SEM over, SEM BTTS, SEM jogador/escanteios/cartões
        allowedMarkets: ["res_fav_strong", "dc_1x", "dc_x2", "un35", "un45", "un55"],
        maxOdd: 2.0,
        minOdd: 1.15, // bloqueio explícito < 1.15
        targetOddMin: 1.8,
        targetOddMax: 4.0,
        maxMediumRisk: 0, // seguro: apenas mercados low risk
        maxHighRisk: 0,
      };
    case "conservative":
      return {
        scenario,
        minSelections: 5,
        maxSelections: 6,
        minScore: 54,
        // Conservador: favorito claro/médio, dupla chance, unders prioritários
        // under 2.5 apenas em jogo travado; over 1.5 apenas em jogo claramente aberto
        // SEM BTTS, SEM jogador/escanteios/cartões
        allowedMarkets: [
          "res_fav_strong", "res_fav_medium",
          "dc_1x", "dc_x2",
          "un35", "un45", "un55", "un25",
          "ov15",
        ],
        maxOdd: 2.2,
        minOdd: 1.15, // bloqueio explícito < 1.15
        targetOddMin: 3.0,
        targetOddMax: 8.0,
        maxMediumRisk: 3, // permite alguns médios (res_fav_medium, un25, ov15)
        maxHighRisk: 0,
      };
    case "aggressive":
      return {
        scenario,
        minSelections: 6,
        maxSelections: 8,
        minScore: 46,
        // Agressivo: mais mercados, inclui over 2.5 aberto
        // SEM jogador, escanteios, cartões, placar exato (bloqueados pelo antiTrap)
        allowedMarkets: [
          "res_fav_strong", "res_fav_medium",
          "dc_1x", "dc_x2",
          "un35", "un45", "un25",
          "ov15", "ov25_open",
        ],
        maxOdd: 3.8,
        minOdd: 1.15, // bloqueio explícito < 1.15
        targetOddMin: 7.0,
        targetOddMax: 18.0,
        maxMediumRisk: 5,
        maxHighRisk: 0, // BTTS e similares continuam bloqueados
      };
  }
}

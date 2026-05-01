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
        minScore: 62,
        allowedMarkets: ["res_fav_strong", "dc_1x", "dc_x2", "un35", "un45", "un55"],
        maxOdd: 1.85,
        minOdd: 1.2,
        targetOddMin: 1.8,
        targetOddMax: 3.8,
        maxMediumRisk: 0,
        maxHighRisk: 0,
      };
    case "conservative":
      return {
        scenario,
        minSelections: 5,
        maxSelections: 6,
        minScore: 58,
        allowedMarkets: [
          "res_fav_strong", "res_fav_medium",
          "dc_1x", "dc_x2",
          "un35", "un45", "un55", "un25",
          "ov15",
        ],
        maxOdd: 2.0,
        minOdd: 1.2,
        targetOddMin: 3.0,
        targetOddMax: 8.0,
        maxMediumRisk: 3,
        maxHighRisk: 0,
      };
    case "aggressive":
      return {
        scenario,
        minSelections: 6,
        maxSelections: 8,
        minScore: 50,
        allowedMarkets: [
          "res_fav_strong", "res_fav_medium",
          "dc_1x", "dc_x2",
          "un35", "un45", "un25",
          "ov15", "ov25_open",
        ],
        maxOdd: 3.5,
        minOdd: 1.2,
        targetOddMin: 7.0,
        targetOddMax: 18.0,
        maxMediumRisk: 5,
        maxHighRisk: 1,
      };
  }
}

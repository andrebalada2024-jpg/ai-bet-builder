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
        allowedMarkets: ["res_fav_strong", "res_fav_medium", "dc_1x", "dc_x2", "un35", "un45", "un55"],
        maxOdd: 2.0,
        minOdd: 1.2,
        targetOddMin: 1.8,
        targetOddMax: 4.0,
        maxMediumRisk: 1,
        maxHighRisk: 0,
      };
    case "conservative":
      return {
        scenario,
        minSelections: 4,
        maxSelections: 6,
        minScore: 54,
        allowedMarkets: [
          "res_fav_strong", "res_fav_medium",
          "dc_1x", "dc_x2",
          "un35", "un45", "un55", "un25",
          "ov15",
        ],
        maxOdd: 2.2,
        minOdd: 1.2,
        targetOddMin: 3.0,
        targetOddMax: 8.0,
        maxMediumRisk: 4,
        maxHighRisk: 0,
      };
    case "aggressive":
      return {
        scenario,
        minSelections: 5,
        maxSelections: 8,
        minScore: 46,
        allowedMarkets: [
          "res_fav_strong", "res_fav_medium",
          "dc_1x", "dc_x2",
          "un35", "un45", "un25",
          "ov15", "ov25_open",
        ],
        maxOdd: 3.8,
        minOdd: 1.2,
        targetOddMin: 7.0,
        targetOddMax: 18.0,
        maxMediumRisk: 6,
        maxHighRisk: 2,
      };
  }
}

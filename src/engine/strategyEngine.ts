import type { Scenario } from "@/types/betting";

export type StrategyScenario = Exclude<Scenario, "daily">;

export interface Strategy {
  minSelections: number;
  maxSelections: number;
  minScore: number;
  allowedMarkets: string[]; // internal keys
  maxOdd: number;
  minOdd: number;
  allowMediumRiskMarket: boolean;
}

export function getStrategy(scenario: StrategyScenario): Strategy {
  switch (scenario) {
    case "safe":
      return {
        minSelections: 3,
        maxSelections: 4,
        minScore: 80,
        allowedMarkets: ["res_fav", "dc_1x", "dc_x2", "un35", "un45"],
        maxOdd: 1.85,
        minOdd: 1.2,
        allowMediumRiskMarket: false,
      };
    case "conservative":
      return {
        minSelections: 5,
        maxSelections: 6,
        minScore: 70,
        allowedMarkets: ["dc_1x", "dc_x2", "res_fav", "un35", "un45", "ov15"],
        maxOdd: 1.8,
        minOdd: 1.2,
        allowMediumRiskMarket: false,
      };
    case "aggressive":
      return {
        minSelections: 6,
        maxSelections: 8,
        minScore: 65,
        allowedMarkets: [
          "dc_1x", "dc_x2", "res_fav", "ov15", "ov25",
          "un35", "btts_yes", "btts_no",
        ],
        maxOdd: 6,
        minOdd: 1.2,
        allowMediumRiskMarket: true,
      };
  }
}

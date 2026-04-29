import type { Scenario } from "@/types/betting";

export interface ScenarioPlan {
  minSelections: number;
  maxSelections: number;
  allowedMarkets: string[];
  oddCeiling: number;
}

export function getPlan(scenario: Exclude<Scenario, "daily">): ScenarioPlan {
  switch (scenario) {
    case "safe":
      return {
        minSelections: 3,
        maxSelections: 4,
        allowedMarkets: ["dc_1x", "dc_x2", "ov15", "un35"],
        oddCeiling: 1.85,
      };
    case "conservative":
      return {
        minSelections: 5,
        maxSelections: 6,
        allowedMarkets: ["dc_1x", "dc_x2", "ov15", "un35", "btts_yes", "btts_no"],
        oddCeiling: 2.5,
      };
    case "aggressive":
      return {
        minSelections: 7,
        maxSelections: 9,
        allowedMarkets: [
          "dc_1x", "dc_x2", "ov15", "ov25", "un35",
          "btts_yes", "btts_no", "res_fav",
        ],
        oddCeiling: 6,
      };
  }
}

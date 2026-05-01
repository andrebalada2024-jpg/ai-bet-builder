export type MarketRisk = "low" | "medium" | "high";

const LOW_RISK_KEYS = ["dc_1x", "dc_x2", "un35", "un45", "un55", "res_fav_strong"];
const MEDIUM_RISK_KEYS = ["un25", "ov15", "ov25_open", "res_fav_medium"];
const HIGH_RISK_KEYS = [
  "btts_yes", "btts_no", "corners", "cards", "player",
  "shots", "exact_score", "handicap", "next_goal",
];

const FORBIDDEN_AUTO = ["player", "corners", "cards", "exact_score", "shots", "next_goal"];

export function classifyMarket(internalKey: string): MarketRisk {
  if (LOW_RISK_KEYS.includes(internalKey)) return "low";
  if (MEDIUM_RISK_KEYS.includes(internalKey)) return "medium";
  return "high";
}

export function isForbiddenInAuto(internalKey: string): boolean {
  return FORBIDDEN_AUTO.includes(internalKey);
}

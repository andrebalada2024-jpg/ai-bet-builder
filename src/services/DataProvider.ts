import type { RawMatch } from "@/types/betting";
import { generateMockMatches } from "@/utils/mockData";

const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const PROVIDER = import.meta.env.VITE_DATA_PROVIDER || "mock";

export async function fetchTodayMatches(): Promise<RawMatch[]> {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 700));

  if (!API_KEY || PROVIDER === "mock") {
    return generateMockMatches(14);
  }

  // Real API integration would happen here. Fallback to mock on failure.
  try {
    // Placeholder for real fetch (The Odds API, API-Football, etc.)
    return generateMockMatches(14);
  } catch {
    return generateMockMatches(14);
  }
}

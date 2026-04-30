import type { RawMatch } from "@/types/betting";
import { fetchTodayMatches } from "@/services/DataProvider";

export interface FetchResult {
  matches: RawMatch[];
  source: "real";
  fetchedAt: string;
}

/**
 * dataFetcher
 * - Busca apenas dados REAIS via The Odds API
 * - Sem fallback fictício
 * - Filtra jogos com odds 1X2 + ao menos 1 mercado adicional
 */
export async function fetchMatches(): Promise<FetchResult> {
  const matches = await fetchTodayMatches(); // throws NO_API_KEY | API_FAILED

  const filtered = matches.filter((m) => {
    const o = m.odds;
    if (!o.home || !o.away || !o.draw) return false;
    let extras = 0;
    if (o.over15) extras++;
    if (o.over25) extras++;
    if (o.under35) extras++;
    if (o.doubleChance1X) extras++;
    if (o.doubleChanceX2) extras++;
    return extras >= 1;
  });

  return {
    matches: filtered,
    source: "real",
    fetchedAt: new Date().toISOString(),
  };
}

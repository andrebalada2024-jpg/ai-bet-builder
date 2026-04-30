import type { RawMatch } from "@/types/betting";
import { fetchTodayMatches, getApiKey } from "@/services/DataProvider";

export interface FetchResult {
  matches: RawMatch[];
  source: "real" | "mock";
  fetchedAt: string; // ISO
}

/**
 * dataFetcher
 * - Busca jogos do dia via The Odds API
 * - Filtra apenas jogos com odds 1X2 + pelo menos 2 mercados
 * - Fallback automático para mock se API falhar / sem chave
 */
export async function fetchMatches(): Promise<FetchResult> {
  const hasKey = !!getApiKey();
  const matches = await fetchTodayMatches();

  const filtered = matches.filter((m) => {
    const o = m.odds;
    if (!o.home || !o.away || !o.draw) return false;
    let extras = 0;
    if (o.over15) extras++;
    if (o.over25) extras++;
    if (o.under35) extras++;
    if (o.btts) extras++;
    if (o.bttsNo) extras++;
    if (o.doubleChance1X) extras++;
    if (o.doubleChanceX2) extras++;
    return extras >= 2;
  });

  const isReal =
    hasKey &&
    filtered.length > 0 &&
    filtered.some((m) => !m.id.startsWith("m_"));

  return {
    matches: filtered,
    source: isReal ? "real" : "mock",
    fetchedAt: new Date().toISOString(),
  };
}

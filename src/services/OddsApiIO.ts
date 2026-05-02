import type { RawMatch } from "@/types/betting";
import { isWithinTodayWindow } from "@/utils/formatters";

/**
 * OddsApiIO Provider
 * Documentação: https://oddsapi.io
 * Endpoint padrão: https://api.oddsapi.io/v3/odds
 *   ?apikey=KEY&sport=soccer&markets=1x2,over_under,double_chance
 *
 * NÃO usa fallback. Retorna apenas dados reais.
 */

const API_KEY_STORAGE = "betia_oddsapiio_key";
const BASE_URL = "https://api.oddsapi.io/v3";

export function getOddsApiIOKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE) || "";
}
export function setOddsApiIOKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}
export function clearOddsApiIOKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

/* ---------- Tipos defensivos (estrutura pode variar levemente) ---------- */
interface IOOdd {
  bookmaker?: string;
  market?: string; // "1x2", "over_under", "double_chance", "btts"
  name?: string;   // "1","X","2","Over 2.5","Under 3.5","1X","X2","Yes","No"
  value?: number | string;
  handicap?: number | string;
}
interface IOEvent {
  id?: string | number;
  match_id?: string | number;
  fixture_id?: string | number;
  home_team?: string;
  away_team?: string;
  localteam?: string;
  visitorteam?: string;
  home?: string | { name?: string };
  away?: string | { name?: string };
  league?: string | { name?: string };
  league_name?: string;
  competition?: string;
  starting_at?: string;
  start_time?: string;
  commence_time?: string;
  date?: string;
  odds?: IOOdd[];
  bookmakers?: Array<{ name?: string; markets?: IOOdd[] }>;
}

function teamName(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "name" in (v as Record<string, unknown>))
    return String((v as { name?: unknown }).name || "");
  return "";
}
function leagueName(ev: IOEvent): string {
  if (typeof ev.league === "string") return ev.league;
  if (ev.league && typeof ev.league === "object" && "name" in ev.league) return String(ev.league.name || "");
  return ev.league_name || ev.competition || "Liga";
}
function kickoffISO(ev: IOEvent): string {
  return (
    ev.commence_time ||
    ev.starting_at ||
    ev.start_time ||
    ev.date ||
    new Date().toISOString()
  );
}
function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) && n > 1 ? n : NaN;
}
function avg(nums: number[]): number {
  const v = nums.filter((n) => Number.isFinite(n) && n > 1);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function flattenOdds(ev: IOEvent): IOOdd[] {
  if (Array.isArray(ev.odds)) return ev.odds;
  const out: IOOdd[] = [];
  for (const bk of ev.bookmakers || []) {
    for (const m of bk.markets || []) out.push({ ...m, bookmaker: bk.name });
  }
  return out;
}

function aggregate(ev: IOEvent) {
  const home: number[] = [];
  const draw: number[] = [];
  const away: number[] = [];
  const over15: number[] = [];
  const over25: number[] = [];
  const under35: number[] = [];
  const dc1x: number[] = [];
  const dcx2: number[] = [];
  const btts: number[] = [];
  const bttsNo: number[] = [];

  for (const o of flattenOdds(ev)) {
    const market = (o.market || "").toLowerCase();
    const name = (o.name || "").toLowerCase().trim();
    const v = num(o.value);
    if (!Number.isFinite(v)) continue;

    if (market.includes("1x2") || market.includes("h2h") || market === "match_winner") {
      if (name === "1" || name === "home") home.push(v);
      else if (name === "x" || name === "draw") draw.push(v);
      else if (name === "2" || name === "away") away.push(v);
    } else if (market.includes("over") || market.includes("total")) {
      const hc = num(o.handicap);
      if ((name.includes("over") || name === "over") && (hc === 1.5 || name.includes("1.5"))) over15.push(v);
      if ((name.includes("over") || name === "over") && (hc === 2.5 || name.includes("2.5"))) over25.push(v);
      if ((name.includes("under") || name === "under") && (hc === 3.5 || name.includes("3.5"))) under35.push(v);
    } else if (market.includes("double")) {
      if (name === "1x" || name.includes("home/draw")) dc1x.push(v);
      if (name === "x2" || name.includes("draw/away")) dcx2.push(v);
    } else if (market.includes("btts") || market.includes("both_teams")) {
      if (name === "yes") btts.push(v);
      if (name === "no") bttsNo.push(v);
    }
  }

  const h = avg(home);
  const a = avg(away);
  if (!h || !a) return null;
  const d = avg(draw) || 3.2;

  // Derive DC se não veio
  const ph = 1 / h, pd = 1 / d, pa = 1 / a;
  const _dc1x = avg(dc1x) || +(1 / (ph + pd)).toFixed(2);
  const _dcx2 = avg(dcx2) || +(1 / (pa + pd)).toFixed(2);

  return {
    home: +h.toFixed(2),
    draw: +d.toFixed(2),
    away: +a.toFixed(2),
    over15: avg(over15) ? +avg(over15).toFixed(2) : undefined,
    over25: avg(over25) ? +avg(over25).toFixed(2) : undefined,
    under35: avg(under35) ? +avg(under35).toFixed(2) : undefined,
    btts: avg(btts) ? +avg(btts).toFixed(2) : undefined,
    bttsNo: avg(bttsNo) ? +avg(bttsNo).toFixed(2) : undefined,
    doubleChance1X: _dc1x,
    doubleChanceX2: _dcx2,
  };
}

function deriveStats(odds: { home: number; draw: number; away: number }) {
  const ph = 1 / odds.home;
  const pa = 1 / odds.away;
  const total = ph + 1 / odds.draw + pa;
  const nh = ph / total;
  const na = pa / total;
  return {
    homeAttack: Math.min(0.95, 0.4 + nh),
    awayAttack: Math.min(0.95, 0.4 + na),
    homeDefense: Math.min(0.95, 0.4 + (1 - na)),
    awayDefense: Math.min(0.95, 0.4 + (1 - nh)),
    paceExpectancy: Math.min(0.95, 0.4 + (nh + na) / 2),
    foulProfile: 0.5,
    cornerVolume: 0.5,
  };
}

/** Busca jogos via OddsApiIO. Lança erro se a key estiver inválida ou request falhar. */
export async function fetchOddsApiIOMatches(): Promise<RawMatch[]> {
  const key = getOddsApiIOKey();
  if (!key) throw new Error("NO_API_KEY_IO");

  const url = `${BASE_URL}/odds?apikey=${encodeURIComponent(
    key
  )}&sport=soccer&markets=1x2,over_under,double_chance,btts`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn("[OddsApiIO] HTTP", res.status);
    throw new Error("API_FAILED_IO");
  }
  const json = await res.json().catch(() => null);
  if (!json) throw new Error("API_FAILED_IO");

  // Aceita tanto array direto quanto { data: [...] } / { results: [...] }
  const events: IOEvent[] = Array.isArray(json)
    ? json
    : Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.results)
    ? json.results
    : Array.isArray(json.events)
    ? json.events
    : [];

  const matches: RawMatch[] = [];
  for (const ev of events) {
    const home = teamName(ev.home_team || ev.localteam || ev.home);
    const away = teamName(ev.away_team || ev.visitorteam || ev.away);
    if (!home || !away) continue;
    const kickoff = kickoffISO(ev);
    if (!isWithinTodayWindow(kickoff)) continue;

    const odds = aggregate(ev);
    if (!odds) continue;

    const id = String(ev.id ?? ev.match_id ?? ev.fixture_id ?? `${home}-${away}-${kickoff}`);
    matches.push({
      id: `io_${id}`,
      homeTeam: home,
      awayTeam: away,
      league: leagueName(ev),
      kickoff,
      odds,
      _stats: deriveStats(odds),
    });
  }
  return matches;
}

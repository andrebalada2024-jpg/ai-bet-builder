import type { RawMatch } from "@/types/betting";
import { generateMockMatches } from "@/utils/mockData";

const API_KEY_STORAGE = "betia_odds_api_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE) || import.meta.env.VITE_ODDS_API_KEY || "";
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

// Sport keys covered by The Odds API (focus on football)
const SPORTS = [
  "soccer_brazil_campeonato",
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_france_ligue_one",
  "soccer_uefa_champs_league",
  "soccer_conmebol_copa_libertadores",
];

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}
interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}
interface OddsApiBookmaker {
  key: string;
  markets: OddsApiMarket[];
}
interface OddsApiEvent {
  id: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

function avg(nums: number[]): number {
  const valid = nums.filter((n) => Number.isFinite(n) && n > 1);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function aggregateOdds(event: OddsApiEvent) {
  const home: number[] = [];
  const draw: number[] = [];
  const away: number[] = [];
  const over15: number[] = [];
  const over25: number[] = [];
  const under35: number[] = [];
  const btts: number[] = [];
  const bttsNo: number[] = [];

  for (const bk of event.bookmakers || []) {
    for (const m of bk.markets || []) {
      if (m.key === "h2h") {
        for (const o of m.outcomes) {
          if (o.name === event.home_team) home.push(o.price);
          else if (o.name === event.away_team) away.push(o.price);
          else if (o.name.toLowerCase() === "draw") draw.push(o.price);
        }
      } else if (m.key === "totals") {
        for (const o of m.outcomes) {
          if (o.point === 1.5 && o.name === "Over") over15.push(o.price);
          if (o.point === 2.5 && o.name === "Over") over25.push(o.price);
          if (o.point === 3.5 && o.name === "Under") under35.push(o.price);
        }
      } else if (m.key === "btts") {
        for (const o of m.outcomes) {
          if (o.name === "Yes") btts.push(o.price);
          if (o.name === "No") bttsNo.push(o.price);
        }
      }
    }
  }

  const h = avg(home);
  const d = avg(draw);
  const a = avg(away);
  if (!h || !a) return null;

  // Approx double chance from h2h implied probabilities
  const ph = 1 / h;
  const pd = d ? 1 / d : 0;
  const pa = 1 / a;
  const dc1x = ph + pd > 0 ? +(1 / (ph + pd)).toFixed(2) : undefined;
  const dcx2 = pa + pd > 0 ? +(1 / (pa + pd)).toFixed(2) : undefined;

  return {
    home: +h.toFixed(2),
    draw: d ? +d.toFixed(2) : 3.2,
    away: +a.toFixed(2),
    over15: avg(over15) ? +avg(over15).toFixed(2) : undefined,
    over25: avg(over25) ? +avg(over25).toFixed(2) : undefined,
    under35: avg(under35) ? +avg(under35).toFixed(2) : undefined,
    btts: avg(btts) ? +avg(btts).toFixed(2) : undefined,
    bttsNo: avg(bttsNo) ? +avg(bttsNo).toFixed(2) : undefined,
    doubleChance1X: dc1x,
    doubleChanceX2: dcx2,
  };
}

function deriveStats(odds: { home: number; draw: number; away: number }) {
  // Implied probabilities → infer attack/defense/pace
  const ph = 1 / odds.home;
  const pa = 1 / odds.away;
  const total = ph + (1 / odds.draw) + pa;
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

async function fetchSport(sport: string, apiKey: string): Promise<RawMatch[]> {
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=eu,uk&markets=h2h,totals,btts&oddsFormat=decimal&dateFormat=iso`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Odds API ${res.status}`);
  const events: OddsApiEvent[] = await res.json();

  const now = Date.now();

  const matches: RawMatch[] = [];
  for (const ev of events) {
    const t = new Date(ev.commence_time).getTime();
    if (!Number.isFinite(t)) continue;
    if (t < now) continue; // já começou
    if (!isTodayInSaoPaulo(ev.commence_time)) continue; // somente hoje (fuso BR)
    const odds = aggregateOdds(ev);
    if (!odds) continue;
    matches.push({
      id: ev.id,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      league: ev.sport_title,
      kickoff: ev.commence_time,
      odds,
      _stats: deriveStats(odds),
    });
  }
  return matches;
}
      id: ev.id,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      league: ev.sport_title,
      kickoff: ev.commence_time,
      odds,
      _stats: deriveStats(odds),
    });
  }
  return matches;
}

export async function fetchTodayMatches(): Promise<RawMatch[]> {
  const apiKey = getApiKey();

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 700));
    return generateMockMatches(14);
  }

  try {
    const results = await Promise.allSettled(SPORTS.map((s) => fetchSport(s, apiKey)));
    const all: RawMatch[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") all.push(...r.value);
    }
    if (all.length === 0) {
      console.warn("[BetIA] No real matches available, using mock");
      return generateMockMatches(14);
    }
    return all;
  } catch (e) {
    console.warn("[BetIA] Real API failed, falling back to mock:", e);
    return generateMockMatches(14);
  }
}

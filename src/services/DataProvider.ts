import type { RawMatch } from "@/types/betting";
import { isWithinTodayWindow } from "@/utils/formatters";

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

// Sport keys cobertos pela The Odds API — expandido para máximo volume de jogos
const SPORTS = [
  // ===== América do Sul =====
  "soccer_conmebol_copa_libertadores",
  "soccer_conmebol_copa_sudamericana",
  "soccer_brazil_campeonato",
  "soccer_brazil_serie_b",
  "soccer_argentina_primera_division",
  "soccer_chile_campeonato",
  "soccer_mexico_ligamx",
  "soccer_usa_mls",
  // ===== Europa — Top 5 + copas =====
  "soccer_uefa_champs_league",
  "soccer_uefa_europa_league",
  "soccer_uefa_europa_conference_league",
  "soccer_uefa_nations_league",
  "soccer_uefa_european_championship",
  "soccer_fifa_world_cup",
  "soccer_fifa_world_cup_qualifiers_europe",
  "soccer_fifa_world_cup_qualifiers_south_america",
  "soccer_epl",
  "soccer_efl_champ",
  "soccer_england_league1",
  "soccer_england_league2",
  "soccer_fa_cup",
  "soccer_england_efl_cup",
  "soccer_spain_la_liga",
  "soccer_spain_segunda_division",
  "soccer_italy_serie_a",
  "soccer_italy_serie_b",
  "soccer_germany_bundesliga",
  "soccer_germany_bundesliga2",
  "soccer_germany_liga3",
  "soccer_france_ligue_one",
  "soccer_france_ligue_two",
  "soccer_netherlands_eredivisie",
  "soccer_portugal_primeira_liga",
  "soccer_turkey_super_league",
  // ===== Europa — outras ligas =====
  "soccer_belgium_first_div",
  "soccer_switzerland_superleague",
  "soccer_austria_bundesliga",
  "soccer_greece_super_league",
  "soccer_poland_ekstraklasa",
  "soccer_norway_eliteserien",
  "soccer_sweden_allsvenskan",
  "soccer_sweden_superettan",
  "soccer_denmark_superliga",
  "soccer_finland_veikkausliiga",
  "soccer_spl", // Scottish Premiership
  "soccer_russia_premier_league",
  // ===== Resto do mundo =====
  "soccer_saudi_arabia_pro_league",
  "soccer_japan_j_league",
  "soccer_korea_kleague1",
  "soccer_china_superleague",
  "soccer_australia_aleague",
  "soccer_egypt_premier_league",
  "soccer_usa_mls", // já listado, ignora duplicado
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
  // Nota: o endpoint /odds só aceita h2h e totals. BTTS exige endpoint dedicado por evento.
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=eu,uk&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Odds API ${sport} ${res.status}`);
  const events: OddsApiEvent[] = await res.json();

  const now = Date.now();
  const MAX_LIVE_MS = 65 * 60_000; // jogos ao vivo até 65 min após início

  const matches: RawMatch[] = [];
  for (const ev of events) {
    const t = new Date(ev.commence_time).getTime();
    if (!Number.isFinite(t)) continue;
    // Permite pré-jogo e ao vivo até 65 min; bloqueia jogos provavelmente encerrados
    if (now - t > MAX_LIVE_MS) continue;
    if (!isWithinTodayWindow(ev.commence_time)) continue; // hoje (BR) + próximas 18h
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

export async function fetchTodayMatches(): Promise<RawMatch[]> {
  const apiKey = getApiKey();

  if (!apiKey) {
    // Sem chave configurada → não retornamos dados fictícios.
    throw new Error("NO_API_KEY");
  }

  const uniqueSports = Array.from(new Set(SPORTS));
  const results = await Promise.allSettled(uniqueSports.map((s) => fetchSport(s, apiKey)));
  const all: RawMatch[] = [];
  let anyFulfilled = false;
  for (const r of results) {
    if (r.status === "fulfilled") {
      anyFulfilled = true;
      all.push(...r.value);
    } else {
      console.warn("[BetIA] Falha em sport:", r.reason);
    }
  }
  if (!anyFulfilled) {
    throw new Error("API_FAILED");
  }
  return all;
}


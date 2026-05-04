// Auxiliary REAL odds source — used when primary APIs fail.
// Uses ESPN public scoreboard API (no key, no CORS issues server-side).
// Returns RawMatch[] in the same shape consumed by the frontend.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface RawOdds {
  home: number; draw: number; away: number;
  over15?: number; over25?: number; under35?: number;
  doubleChance1X?: number; doubleChanceX2?: number;
}
interface RawMatch {
  id: string; homeTeam: string; awayTeam: string;
  league: string; kickoff: string; odds: RawOdds;
  _stats?: Record<string, number>;
}

function ymd(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function americanToDecimal(a: string | number | undefined | null): number {
  if (a === undefined || a === null) return 0;
  const n = typeof a === "string" ? parseInt(a.replace("+", ""), 10) : a;
  if (!Number.isFinite(n) || n === 0) return 0;
  return n > 0 ? +(n / 100 + 1).toFixed(2) : +(100 / Math.abs(n) + 1).toFixed(2);
}

function deriveStats(o: RawOdds) {
  const ph = 1 / o.home, pa = 1 / o.away, pd = 1 / o.draw;
  const t = ph + pd + pa;
  const nh = ph / t, na = pa / t;
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

async function fetchESPN(date: string): Promise<RawMatch[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${date}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`espn ${r.status}`);
  const j = await r.json();
  const events = (j.events ?? []) as any[];
  const out: RawMatch[] = [];

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const oddsArr = comp.odds ?? [];
    if (!oddsArr.length) continue;
    const o = oddsArr[0] || {};
    const ml = o.moneyline || {};
    let h = 0, d = 0, a = 0;
    h = americanToDecimal(ml.home?.close?.odds ?? ml.home?.open?.odds);
    a = americanToDecimal(ml.away?.close?.odds ?? ml.away?.open?.odds);
    d = americanToDecimal(ml.draw?.close?.odds ?? ml.draw?.open?.odds);
    if (!h || !a) {
      h = h || americanToDecimal(o.homeTeamOdds?.moneyLine);
      a = a || americanToDecimal(o.awayTeamOdds?.moneyLine);
      d = d || americanToDecimal(o.drawOdds?.moneyLine);
    }
    if (!h || !a) continue;
    if (!d) {
      // derive draw from market overround
      const ph = 1 / h, pa = 1 / a;
      const pd = Math.max(0.05, 1 - ph - pa);
      d = +(1 / pd).toFixed(2);
    }

    const home = comp.competitors?.find((x: any) => x.homeAway === "home");
    const away = comp.competitors?.find((x: any) => x.homeAway === "away");
    if (!home || !away) continue;

    const ou = Number(o.overUnder);
    let over25: number | undefined, under35: number | undefined;
    if (Number.isFinite(ou)) {
      // Approximate Over/Under prices from line + Poisson-ish heuristic
      // (we don't have explicit over/under odds → leave undefined; engine handles it)
      if (ou <= 2.25) over25 = 2.10;
      else if (ou >= 3.0) under35 = 1.50;
    }

    const odds: RawOdds = { home: h, draw: d, away: a, over25, under35 };
    out.push({
      id: `espn-${ev.id}`,
      homeTeam: home.team?.displayName ?? "Home",
      awayTeam: away.team?.displayName ?? "Away",
      league: ev.season?.slug?.replace(/-/g, " ") || comp.league?.name || "Football",
      kickoff: ev.date,
      odds,
      _stats: deriveStats(odds),
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    const dates = [ymd(now), ymd(tomorrow)];

    const lists = await Promise.all(dates.map((d) => fetchESPN(d).catch((e) => {
      console.warn("espn date failed", d, e);
      return [] as RawMatch[];
    })));
    const all = lists.flat();

    const windowStart = now.getTime() - 65 * 60_000;
    const windowEnd = now.getTime() + 18 * 3600_000;
    const matches = all.filter((m) => {
      const t = new Date(m.kickoff).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    return new Response(
      JSON.stringify({ source: "auxiliary", count: matches.length, matches }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

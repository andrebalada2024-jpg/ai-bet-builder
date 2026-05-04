// Auxiliary REAL odds source — used when primary APIs fail.
// Uses Sofascore public endpoints (server-side, no key, no CORS issues).
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

const UA = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "application/json",
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

async function fetchEvents(date: string) {
  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`sofascore events ${r.status}`);
  const j = await r.json();
  return (j.events ?? []) as any[];
}

async function fetchOdds(eventId: number): Promise<RawOdds | null> {
  try {
    const r = await fetch(
      `https://api.sofascore.com/api/v1/event/${eventId}/odds/1/all`,
      { headers: UA },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const markets: any[] = j.markets ?? [];
    let h = 0, d = 0, a = 0;
    let over15: number | undefined, over25: number | undefined, under35: number | undefined;
    let dc1x: number | undefined, dcx2: number | undefined;

    const fracToDec = (s: string): number => {
      if (!s) return 0;
      if (s.includes("/")) {
        const [n, m] = s.split("/").map(Number);
        if (!m) return 0;
        return +(n / m + 1).toFixed(2);
      }
      const v = Number(s);
      return Number.isFinite(v) ? v : 0;
    };

    for (const m of markets) {
      const name = (m.marketName || "").toLowerCase();
      const choices: any[] = m.choices ?? [];
      if (name === "full time" || name === "1x2") {
        for (const c of choices) {
          const v = fracToDec(c.fractionalValue);
          if (c.name === "1") h = v;
          else if (c.name === "X") d = v;
          else if (c.name === "2") a = v;
        }
      } else if (name === "double chance") {
        for (const c of choices) {
          const v = fracToDec(c.fractionalValue);
          if (c.name === "1X") dc1x = v;
          else if (c.name === "X2") dcx2 = v;
        }
      } else if (name.startsWith("goals over/under")) {
        const line = m.choiceGroup || "";
        for (const c of choices) {
          const v = fracToDec(c.fractionalValue);
          if (line.includes("1.5") && c.name?.toLowerCase() === "over") over15 = v;
          if (line.includes("2.5") && c.name?.toLowerCase() === "over") over25 = v;
          if (line.includes("3.5") && c.name?.toLowerCase() === "under") under35 = v;
        }
      }
    }

    if (!h || !a || !d) return null;
    return { home: h, draw: d, away: a, over15, over25, under35, doubleChance1X: dc1x, doubleChanceX2: dcx2 };
  } catch {
    return null;
  }
}

async function pLimit<T>(items: T[], limit: number, fn: (x: T) => Promise<any>) {
  const out: any[] = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 3600_000);
    const dates = [ymd(now), ymd(tomorrow)];

    const evLists = await Promise.all(dates.map((d) => fetchEvents(d).catch(() => [])));
    const allEvents = evLists.flat();

    const windowStart = now.getTime() - 65 * 60_000;
    const windowEnd = now.getTime() + 18 * 3600_000;
    const filtered = allEvents.filter((ev: any) => {
      const t = (ev.startTimestamp ?? 0) * 1000;
      return t >= windowStart && t <= windowEnd && ev.id;
    });

    // Cap to keep response time reasonable
    const capped = filtered.slice(0, 120);

    const matches: RawMatch[] = [];
    await pLimit(capped, 8, async (ev: any) => {
      const odds = await fetchOdds(ev.id);
      if (!odds) return;
      const kickoff = new Date(ev.startTimestamp * 1000).toISOString();
      const m: RawMatch = {
        id: `sofa-${ev.id}`,
        homeTeam: ev.homeTeam?.name ?? "Home",
        awayTeam: ev.awayTeam?.name ?? "Away",
        league: ev.tournament?.uniqueTournament?.name || ev.tournament?.name || "Football",
        kickoff,
        odds,
        _stats: deriveStats(odds),
      };
      matches.push(m);
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

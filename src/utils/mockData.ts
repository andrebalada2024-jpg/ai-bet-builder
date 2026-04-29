import type { RawMatch } from "@/types/betting";

const LEAGUES = [
  "Brasileirão Série A",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Libertadores",
  "Sul-Americana",
  "Champions League",
  "Eredivisie",
];

const TEAMS = [
  "Flamengo", "Palmeiras", "Corinthians", "São Paulo", "Fluminense", "Botafogo",
  "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Tottenham", "Newcastle",
  "Real Madrid", "Barcelona", "Atlético Madrid", "Sevilla", "Valencia", "Villarreal",
  "Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio",
  "Bayern", "Dortmund", "Leverkusen", "Leipzig",
  "PSG", "Marseille", "Lyon", "Monaco",
  "Estudiantes", "Boca Juniors", "River Plate", "Cerro Porteño", "Always Ready", "Mirassol",
  "Ajax", "PSV", "Feyenoord",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPair<T>(arr: T[]): [T, T] {
  const a = pick(arr);
  let b = pick(arr);
  while (b === a) b = pick(arr);
  return [a, b];
}

export function generateMockMatches(count = 14): RawMatch[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const [home, away] = pickPair(TEAMS);
    const homeStrength = rand(0.3, 0.9);
    const awayStrength = rand(0.3, 0.9);
    const diff = homeStrength - awayStrength;

    // Build coherent odds from strengths
    const homeOdd = Math.max(1.2, 2.5 - diff * 1.5 + rand(-0.2, 0.2));
    const awayOdd = Math.max(1.2, 2.5 + diff * 1.5 + rand(-0.2, 0.2));
    const drawOdd = rand(2.9, 3.8);

    const pace = rand(0.3, 0.95);

    const kickoff = new Date(now.getTime() + (i + 1) * 45 * 60 * 1000).toISOString();

    return {
      id: `m_${i}_${Date.now()}`,
      homeTeam: home,
      awayTeam: away,
      league: pick(LEAGUES),
      kickoff,
      odds: {
        home: +homeOdd.toFixed(2),
        draw: +drawOdd.toFixed(2),
        away: +awayOdd.toFixed(2),
        over15: +rand(1.18, 1.55).toFixed(2),
        over25: +rand(1.55, 2.4).toFixed(2),
        under35: +rand(1.25, 1.75).toFixed(2),
        btts: +rand(1.55, 2.1).toFixed(2),
        bttsNo: +rand(1.65, 2.2).toFixed(2),
        doubleChance1X: +Math.max(1.1, (homeOdd * drawOdd) / (homeOdd + drawOdd)).toFixed(2),
        doubleChanceX2: +Math.max(1.1, (awayOdd * drawOdd) / (awayOdd + drawOdd)).toFixed(2),
      },
      _stats: {
        homeAttack: homeStrength,
        awayAttack: awayStrength,
        homeDefense: rand(0.3, 0.9),
        awayDefense: rand(0.3, 0.9),
        paceExpectancy: pace,
        foulProfile: rand(0.2, 0.9),
        cornerVolume: rand(0.2, 0.9),
      },
    };
  });
}

export type Scenario = "safe" | "conservative" | "aggressive" | "daily";

export type RiskLevel = "low" | "medium" | "high";
export type Confidence = "high" | "medium" | "low";

export interface RawMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string; // ISO
  odds: {
    home: number;
    draw: number;
    away: number;
    over15?: number;
    over25?: number;
    under35?: number;
    btts?: number;
    bttsNo?: number;
    doubleChance1X?: number;
    doubleChanceX2?: number;
  };
  // Hidden internal stats
  _stats?: {
    homeAttack: number; // 0-1
    awayAttack: number;
    homeDefense: number;
    awayDefense: number;
    paceExpectancy: number; // 0-1
    foulProfile: number;
    cornerVolume: number;
  };
}

export interface Selection {
  matchId: string;
  matchLabel: string; // "Home x Away"
  league: string;
  kickoff: string; // ISO datetime of the match
  market: string; // user-facing label
  odd: number;
  confidence: Confidence;
  reason: string;
}

export interface Ticket {
  scenario: Exclude<Scenario, "daily">;
  selections: Selection[];
  estimatedOdd: number;
  risk: RiskLevel;
  overallConfidence: Confidence;
  summary: string;
}

export interface DailyTicket {
  safe: Ticket;
  conservative: Ticket;
  aggressive: Ticket;
}

export type AppState =
  | "idle"
  | "loading_matches"
  | "analyzing"
  | "generating_strategy"
  | "success"
  | "error"
  | "no_matches_found";

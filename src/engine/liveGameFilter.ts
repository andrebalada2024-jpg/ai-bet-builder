import type { RawMatch } from "@/types/betting";

export type GamePhase =
  | "pre"
  | "live_0_15"
  | "live_16_45"
  | "halftime"
  | "live_46_65"
  | "expired"
  | "finished";

export interface LiveInfo {
  phase: GamePhase;
  minutesSinceKickoff: number;
  isLive: boolean;
  blocked: boolean;
}

const MAX_LIVE_MINUTES = 65;

export function getLiveInfo(kickoffIso: string): LiveInfo {
  const t = new Date(kickoffIso).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - t) / 60000);

  if (minutes < 0) {
    return { phase: "pre", minutesSinceKickoff: minutes, isLive: false, blocked: false };
  }
  if (minutes <= 15) {
    return { phase: "live_0_15", minutesSinceKickoff: minutes, isLive: true, blocked: false };
  }
  if (minutes <= 45) {
    return { phase: "live_16_45", minutesSinceKickoff: minutes, isLive: true, blocked: false };
  }
  if (minutes <= 50) {
    return { phase: "halftime", minutesSinceKickoff: minutes, isLive: true, blocked: false };
  }
  if (minutes <= MAX_LIVE_MINUTES) {
    return { phase: "live_46_65", minutesSinceKickoff: minutes, isLive: true, blocked: false };
  }
  return {
    phase: minutes > 120 ? "finished" : "expired",
    minutesSinceKickoff: minutes,
    isLive: false,
    blocked: true,
  };
}

/** Filtra jogos do dia removendo encerrados ou avançados demais. */
export function filterPlayable(matches: RawMatch[]): RawMatch[] {
  return matches.filter((m) => !getLiveInfo(m.kickoff).blocked);
}

/** Verdadeiro se o mercado é "protegido" (under alto, dupla chance) — usado para liberação ao vivo avançado. */
export function isProtectedMarket(internalKey: string): boolean {
  return ["dc_1x", "dc_x2", "un35", "un45", "un55"].includes(internalKey);
}

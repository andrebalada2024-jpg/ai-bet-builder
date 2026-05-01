import type { Ticket } from "@/types/betting";

export function formatKickoff(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return "";
  }
}

/** Returns YYYY-MM-DD for the given date in America/Sao_Paulo */
export function saoPauloDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

/** True if the ISO datetime falls on "today" in America/Sao_Paulo */
export function isTodayInSaoPaulo(iso: string): boolean {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    return saoPauloDateKey(d) === saoPauloDateKey(new Date());
  } catch {
    return false;
  }
}

/**
 * Janela "do dia" estendida no fuso BR:
 * - inclui jogos de hoje (SP)
 * - inclui jogos das próximas 18h (cobre madrugada europeia/asiática que ainda contam como "rodada do dia")
 * Garante volume sem perder foco temporal.
 */
export function isWithinTodayWindow(iso: string): boolean {
  try {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return false;
    const now = Date.now();
    const HOURS_18 = 18 * 60 * 60_000;
    if (t >= now && t - now <= HOURS_18) return true;
    return isTodayInSaoPaulo(iso);
  } catch {
    return false;
  }
}

export function formatTicketForCopy(t: Ticket): string {
  const scenarioName = t.scenario === "safe" ? "SEGURO" : t.scenario === "conservative" ? "CONSERVADOR" : "AGRESSIVO";
  const lines = [
    `🎟️ BILHETE ${scenarioName}`,
    `Odd estimada: ${t.estimatedOdd.toFixed(2)}`,
    `Risco: ${t.risk === "low" ? "Baixo" : t.risk === "medium" ? "Médio" : "Alto"}`,
    `Confiança: ${t.overallConfidence === "high" ? "Alta" : t.overallConfidence === "medium" ? "Média" : "Baixa"}`,
    ``,
    ...t.selections.map(
      (s, i) =>
        `${i + 1}. ${s.matchLabel} (${s.league})\n   📅 ${formatKickoff(s.kickoff)}\n   ${s.market} @ ${s.odd.toFixed(2)}`
    ),
    ``,
    `⚠️ Apostas envolvem risco. Aposte com responsabilidade.`,
  ];
  return lines.join("\n");
}

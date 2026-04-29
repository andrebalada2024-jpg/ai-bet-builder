import type { Ticket } from "@/types/betting";

export function formatKickoff(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return "";
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

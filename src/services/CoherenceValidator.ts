import type { Selection } from "@/types/betting";

/**
 * Validates that a candidate selection doesn't conflict with already-picked ones.
 * Hidden coherence rules.
 */
export function isCoherent(
  candidate: Selection,
  picked: Selection[],
  scenario: "safe" | "conservative" | "aggressive"
): boolean {
  // Limit selections from same match
  const sameMatch = picked.filter((p) => p.matchId === candidate.matchId);
  const maxPerMatch = scenario === "safe" ? 1 : scenario === "conservative" ? 2 : 3;
  if (sameMatch.length >= maxPerMatch) return false;

  // Conflicting markets in same match
  for (const p of sameMatch) {
    const a = p.market.toLowerCase();
    const b = candidate.market.toLowerCase();

    // Over vs Under conflict
    if (a.includes("mais de") && b.includes("menos de")) return false;
    if (a.includes("menos de") && b.includes("mais de")) return false;

    // BTTS sim vs não
    if (a.includes("ambas marcam: sim") && b.includes("ambas marcam: não")) return false;
    if (a.includes("ambas marcam: não") && b.includes("ambas marcam: sim")) return false;

    // BTTS Sim + Under 1.5 / under 2.5 incoherent
    if (a.includes("ambas marcam: sim") && b.includes("menos de 2.5")) return false;
    if (b.includes("ambas marcam: sim") && a.includes("menos de 2.5")) return false;
  }

  // Safe scenario: avoid odds too high
  if (scenario === "safe" && candidate.odd > 1.85) return false;
  if (scenario === "conservative" && candidate.odd > 2.5) return false;

  return true;
}

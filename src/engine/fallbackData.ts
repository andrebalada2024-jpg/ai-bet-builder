import type { RawMatch } from "@/types/betting";

/**
 * Fallback existe mas NUNCA é apresentado como real.
 * Atualmente desativado por decisão de produto: o app só opera com dados reais.
 * Mantido como módulo isolado para evolução futura controlada.
 */
export const FALLBACK_ENABLED = false;

export function getFallbackMatches(): RawMatch[] {
  return [];
}

export function isFallbackSource(source: "real" | "mock"): boolean {
  return source === "mock";
}

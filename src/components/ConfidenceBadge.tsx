import type { Confidence } from "@/types/betting";

export function ConfidenceBadge({ confidence, size = "sm" }: { confidence: Confidence; size?: "sm" | "xs" }) {
  const map = {
    high: { label: "Alta", color: "text-green-win", dot: "bg-green-win" },
    medium: { label: "Média", color: "text-orange-warn", dot: "bg-orange-warn" },
    low: { label: "Baixa", color: "text-red-risk", dot: "bg-red-risk" },
  }[confidence];
  return (
    <span className={`inline-flex items-center gap-1.5 ${size === "xs" ? "text-[10px]" : "text-xs"} font-medium ${map.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot} animate-pulse`} />
      Confiança {map.label}
    </span>
  );
}

import { Database, FlaskConical, RefreshCw } from "lucide-react";

interface Props {
  source: "real" | "mock";
  fetchedAt: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function DataSourceBadge({ source, fetchedAt, onRefresh, refreshing }: Props) {
  const isReal = source === "real";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-4 rounded-2xl bg-secondary/60 border border-border">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isReal
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }`}
        >
          {isReal ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
          {isReal ? "Fonte: Odds reais via API" : "Dados simulados / fallback"}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          Odds atualizadas às {formatTime(fetchedAt)}
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition-smooth disabled:opacity-50"
          aria-label="Atualizar odds"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      )}
    </div>
  );
}

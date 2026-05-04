import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchTodayMatches } from "@/services/DataProvider";
import type { RawMatch } from "@/types/betting";
import { formatKickoff } from "@/utils/formatters";
import { Loader2, RefreshCw, AlertTriangle, Trophy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const REFRESH_MS = 60_000;

export function TodayMatchesDialog({ open, onOpenChange }: Props) {
  const [matches, setMatches] = useState<RawMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodayMatches();
      setMatches(data);
      setUpdatedAt(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ERROR";
      if (msg === "NO_API_KEY") setError("Sem chaves de API e a fonte auxiliar também não respondeu. Configure uma chave nas configurações.");
      else if (msg === "API_FAILED") setError("Todas as fontes (primárias e auxiliar) falharam. Tente novamente em instantes.");
      else setError("Erro inesperado ao buscar jogos.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
    const t = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [open, load]);

  // Group by league
  const byLeague = matches.reduce<Record<string, RawMatch[]>>((acc, m) => {
    (acc[m.league] = acc[m.league] || []).push(m);
    return acc;
  }, {});
  const leagues = Object.keys(byLeague).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Jogos reais (hoje + próximas 18h)
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-2">
            <span>
              {updatedAt
                ? `Atualizado às ${formatKickoff(updatedAt.toISOString())}`
                : "Buscando dados reais..."}
              {matches.length > 0 && ` • ${matches.length} jogos`}
            </span>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 -mr-1 flex-1">
          {loading && matches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              Buscando jogos reais do dia...
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
          )}

          {!loading && !error && matches.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum jogo real disponível hoje.
            </div>
          )}

          <div className="space-y-5">
            {leagues.map((lg) => (
              <div key={lg}>
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                  <h3 className="font-semibold text-sm">{lg}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {byLeague[lg].length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {byLeague[lg]
                    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
                    .map((m) => (
                      <MatchRow key={m.id} m={m} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MatchRow({ m }: { m: RawMatch }) {
  const o = m.odds;
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-medium text-sm">
          {m.homeTeam} <span className="text-muted-foreground">x</span> {m.awayTeam}
        </div>
        <Badge variant="outline" className="text-[10px]">
          Hoje • {formatKickoff(m.kickoff)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <OddBox label="Casa" value={o.home} />
        <OddBox label="Empate" value={o.draw} />
        <OddBox label="Fora" value={o.away} />
      </div>

      {(o.over25 || o.under35 || o.doubleChance1X || o.doubleChanceX2) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {o.over25 && <OddBox label="Over 2.5" value={o.over25} subtle />}
          {o.under35 && <OddBox label="Under 3.5" value={o.under35} subtle />}
          {o.doubleChance1X && <OddBox label="DC 1X" value={o.doubleChance1X} subtle />}
          {o.doubleChanceX2 && <OddBox label="DC X2" value={o.doubleChanceX2} subtle />}
        </div>
      )}
    </div>
  );
}

function OddBox({ label, value, subtle }: { label: string; value: number; subtle?: boolean }) {
  return (
    <div
      className={`rounded-md px-2 py-1.5 flex items-center justify-between text-xs ${
        subtle ? "bg-muted/40" : "bg-muted"
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}

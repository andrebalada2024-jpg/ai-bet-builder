import { useState, useCallback, useEffect, useRef } from "react";
import type { Scenario, AppState, Ticket, DailyTicket } from "@/types/betting";
import { generateTicket } from "@/engine/ticketGenerator";
import { HomeScreen } from "@/screens/HomeScreen";
import { TicketResultScreen } from "@/screens/TicketResultScreen";
import { DailyResultScreen } from "@/screens/DailyResultScreen";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { ErrorState } from "@/components/ErrorState";

const ODDS_REFRESH_MS = 60_000; // atualização automática de odds

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [daily, setDaily] = useState<DailyTicket | null>(null);
  const [meta, setMeta] = useState<{ source: "real" | "mock"; fetchedAt: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  const run = useCallback(async (s: Scenario, opts: { silent?: boolean; bustCache?: boolean } = {}) => {
    setScenario(s);
    if (!opts.silent) {
      setTicket(null);
      setDaily(null);
      setState("loading_matches");
      setTimeout(() => setState("analyzing"), 800);
      setTimeout(() => setState("generating_strategy"), 1800);
    } else {
      setRefreshing(true);
    }

    try {
      const minWait = opts.silent ? 0 : 2600;
      const [out] = await Promise.all([
        generateTicket(s, opts),
        new Promise((r) => setTimeout(r, minWait)),
      ]);
      if (out.daily) setDaily(out.daily);
      else setDaily(null);
      if (out.ticket) setTicket(out.ticket);
      else setTicket(null);
      setMeta(out.meta);
      setState("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!opts.silent) {
        if (msg === "NO_API_KEY") setState("no_api_key");
        else if (msg === "API_FAILED") setState("api_failed");
        else if (msg === "NO_MATCHES") setState("no_matches_found");
        else setState("error");
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh de odds a cada 60s enquanto exibe resultado
  useEffect(() => {
    if (state !== "success" || !scenario) return;
    refreshTimer.current = window.setInterval(() => {
      run(scenario, { silent: true });
    }, ODDS_REFRESH_MS);
    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
    };
  }, [state, scenario, run]);

  const goHome = () => {
    setState("idle");
    setScenario(null);
    setTicket(null);
    setDaily(null);
    setMeta(null);
  };

  const regenerate = () => {
    if (scenario) run(scenario, { bustCache: true });
  };

  const refreshOdds = () => {
    if (scenario) run(scenario, { silent: true });
  };

  if (state === "idle") return <HomeScreen onSelect={run} />;

  if (state === "loading_matches" || state === "analyzing" || state === "generating_strategy") {
    return <LoadingAnalysis />;
  }

  if (state === "no_api_key") {
    return (
      <ErrorState
        title="Nenhuma fonte de dados disponível"
        message="Sem chaves configuradas e a fonte auxiliar (backup) também não respondeu. Configure uma chave nas configurações ou tente novamente."
        onRetry={regenerate}
        onHome={goHome}
      />
    );
  }

  if (state === "api_failed") {
    return (
      <ErrorState
        title="Todas as fontes falharam"
        message="As APIs primárias e a fonte auxiliar de backup não responderam. Aguarde alguns instantes e tente novamente."
        onRetry={regenerate}
        onHome={goHome}
      />
    );
  }

  if (state === "no_matches_found") {
    return (
      <ErrorState
        title="Nenhum jogo real disponível hoje"
        message="Não há partidas reais com odds suficientes para gerar um bilhete neste momento."
        onHome={goHome}
        onRetry={regenerate}
      />
    );
  }

  if (state === "error") {
    return <ErrorState onRetry={regenerate} onHome={goHome} />;
  }

  if (state === "success" && daily && meta) {
    return (
      <DailyResultScreen
        daily={daily}
        meta={meta}
        refreshing={refreshing}
        onRefresh={refreshOdds}
        onBack={goHome}
        onRegenerate={regenerate}
      />
    );
  }

  if (state === "success" && ticket && meta) {
    return (
      <TicketResultScreen
        ticket={ticket}
        meta={meta}
        refreshing={refreshing}
        onRefresh={refreshOdds}
        onBack={goHome}
        onRegenerate={regenerate}
      />
    );
  }

  return <HomeScreen onSelect={run} />;
};

export default Index;

import { useState, useCallback } from "react";
import type { Scenario, AppState, Ticket, DailyTicket } from "@/types/betting";
import { generate } from "@/services/HiddenTicketEngine";
import { HomeScreen } from "@/screens/HomeScreen";
import { TicketResultScreen } from "@/screens/TicketResultScreen";
import { DailyResultScreen } from "@/screens/DailyResultScreen";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { ErrorState } from "@/components/ErrorState";

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [daily, setDaily] = useState<DailyTicket | null>(null);

  const run = useCallback(async (s: Scenario) => {
    setScenario(s);
    setTicket(null);
    setDaily(null);
    setState("loading_matches");
    // Staged states for realistic loading
    setTimeout(() => setState("analyzing"), 800);
    setTimeout(() => setState("generating_strategy"), 1800);

    try {
      // Ensure minimum perceived analysis time
      const [out] = await Promise.all([
        generate(s),
        new Promise((r) => setTimeout(r, 2600)),
      ]);
      if (out.daily) setDaily(out.daily);
      if (out.ticket) setTicket(out.ticket);
      setState("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setState(msg === "NO_MATCHES" ? "no_matches_found" : "error");
    }
  }, []);

  const goHome = () => {
    setState("idle");
    setScenario(null);
    setTicket(null);
    setDaily(null);
  };

  const regenerate = () => {
    if (scenario) run(scenario);
  };

  if (state === "idle") return <HomeScreen onSelect={run} />;

  if (state === "loading_matches" || state === "analyzing" || state === "generating_strategy") {
    return <LoadingAnalysis />;
  }

  if (state === "no_matches_found") {
    return (
      <ErrorState
        title="Nenhum jogo disponível"
        message="Não encontramos jogos do dia com odds suficientes para gerar um bilhete."
        onHome={goHome}
        onRetry={regenerate}
      />
    );
  }

  if (state === "error") {
    return <ErrorState onRetry={regenerate} onHome={goHome} />;
  }

  if (state === "success" && daily) {
    return <DailyResultScreen daily={daily} onBack={goHome} onRegenerate={regenerate} />;
  }

  if (state === "success" && ticket) {
    return <TicketResultScreen ticket={ticket} onBack={goHome} onRegenerate={regenerate} />;
  }

  return <HomeScreen onSelect={run} />;
};

export default Index;

import { useState } from "react";
import type { Scenario } from "@/types/betting";
import { ScenarioCard } from "@/components/ScenarioCard";
import { Disclaimer } from "@/components/Disclaimer";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { TodayMatchesDialog } from "@/components/TodayMatchesDialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ListChecks } from "lucide-react";

export function HomeScreen({ onSelect }: { onSelect: (s: Scenario) => void }) {
  const [matchesOpen, setMatchesOpen] = useState(false);
  return (
    <div className="relative min-h-screen w-full bg-gradient-hero">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-12">
        <div className="flex items-center justify-between gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">BetIA</span>
          </div>
          <ApiKeySettings />
        </div>

        <header className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-3">
            Gerador IA de <span className="text-gold">Bilhetes</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Escolha um cenário e receba o bilhete pronto.
          </p>
        </header>

        <Button
          onClick={() => setMatchesOpen(true)}
          variant="outline"
          className="w-full mb-4 h-12 border-gold/40 hover:border-gold hover:bg-gold/5"
        >
          <ListChecks className="w-4 h-4 text-gold" />
          Ver jogos reais de hoje
        </Button>

        <TodayMatchesDialog open={matchesOpen} onOpenChange={setMatchesOpen} />

        <div className="space-y-3 sm:space-y-4">
          <ScenarioCard scenario="daily" onClick={() => onSelect("daily")} />
          <ScenarioCard scenario="safe" onClick={() => onSelect("safe")} />
          <ScenarioCard scenario="conservative" onClick={() => onSelect("conservative")} />
          <ScenarioCard scenario="aggressive" onClick={() => onSelect("aggressive")} />
        </div>

        <Disclaimer />
      </div>
    </div>
  );
}

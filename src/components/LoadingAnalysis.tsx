import { useEffect, useState } from "react";
import { Brain } from "lucide-react";

const STEPS = [
  "Buscando jogos do dia...",
  "Analisando mercados...",
  "Removendo seleções arriscadas...",
  "Validando coerência...",
  "Montando estratégia...",
];

export function LoadingAnalysis() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-gold flex items-center justify-center animate-pulse-glow">
          <Brain className="w-12 h-12 text-primary-foreground" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-ping" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold mb-2">IA analisando jogos do dia</h2>
      <p className="text-muted-foreground mb-6">Aguarde enquanto montamos seu bilhete</p>

      <div className="w-full max-w-md space-y-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-smooth ${
              i === step
                ? "border-gold/50 bg-gold/10 text-foreground"
                : i < step
                ? "border-border bg-secondary/50 text-muted-foreground"
                : "border-border/50 text-muted-foreground/60"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${i === step ? "bg-gold animate-pulse" : i < step ? "bg-green-win" : "bg-muted"}`} />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Wallet, TrendingUp } from "lucide-react";

const STAKE_KEY = "betia_default_stake";

interface Props {
  estimatedOdd: number;
}

export function StakeInput({ estimatedOdd }: Props) {
  const [stake, setStake] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(STAKE_KEY);
    if (saved) setStake(saved);
  }, []);

  const handleChange = (v: string) => {
    // Allow only numbers, comma, dot
    const sanitized = v.replace(/[^\d.,]/g, "").replace(",", ".");
    setStake(sanitized);
    if (sanitized) localStorage.setItem(STAKE_KEY, sanitized);
  };

  const stakeNum = parseFloat(stake) || 0;
  const totalReturn = stakeNum * estimatedOdd;
  const profit = totalReturn - stakeNum;

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="bg-secondary/50 border border-border rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-gold" />
        <h4 className="text-sm font-semibold">Calcular ganho</h4>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground font-medium">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={stake}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0,00"
          className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-base font-semibold tabular-nums focus:outline-none focus:border-gold transition-smooth"
          aria-label="Valor apostado"
        />
      </div>

      {stakeNum > 0 && (
        <div className="grid grid-cols-2 gap-2 animate-float-up">
          <div className="bg-background/60 rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Retorno total
            </p>
            <p className="text-lg font-extrabold text-gold tabular-nums">
              {fmt(totalReturn)}
            </p>
          </div>
          <div className="bg-background/60 rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Lucro
            </p>
            <p className="text-lg font-extrabold text-gold tabular-nums">
              {fmt(profit)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

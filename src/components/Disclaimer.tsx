import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="mt-8 p-4 rounded-2xl bg-secondary/40 border border-border flex gap-3">
      <AlertTriangle className="w-5 h-5 text-orange-warn shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        Apostas envolvem risco. Nenhum bilhete é garantia de lucro. Use gestão de banca e aposte
        apenas valores que você pode perder. +18.
      </p>
    </div>
  );
}

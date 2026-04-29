import { AlertCircle, RotateCw, Home } from "lucide-react";

export function ErrorState({
  title = "Algo deu errado",
  message = "Não conseguimos gerar seu bilhete. Tente novamente.",
  onRetry,
  onHome,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-5">
        <AlertCircle className="w-10 h-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-semibold px-5 py-3 rounded-xl shadow-gold transition-bounce hover:shadow-glow active:scale-95"
          >
            <RotateCw className="w-4 h-4" /> Tentar novamente
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="inline-flex items-center gap-2 bg-secondary border border-border font-semibold px-5 py-3 rounded-xl transition-smooth hover:bg-muted"
          >
            <Home className="w-4 h-4" /> Início
          </button>
        )}
      </div>
    </div>
  );
}

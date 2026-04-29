import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ text, label = "Copiar bilhete", variant = "primary" }: {
  text: string;
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Bilhete copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-bounce active:scale-95";
  const styles = variant === "primary"
    ? "bg-gradient-gold text-primary-foreground px-6 py-3 shadow-gold hover:shadow-glow"
    : "bg-secondary text-foreground border border-border px-4 py-2 hover:bg-muted text-sm";

  return (
    <button onClick={handleCopy} className={`${base} ${styles}`}>
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

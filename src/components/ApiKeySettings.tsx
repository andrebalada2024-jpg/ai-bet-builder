import { useState, useEffect } from "react";
import { Settings, ExternalLink, CheckCircle2 } from "lucide-react";
import { getApiKey, setApiKey, clearApiKey } from "@/services/DataProvider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const k = getApiKey();
    setHasKey(!!k);
    setValue(k);
  }, [open]);

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Insira uma chave válida");
      return;
    }
    setApiKey(trimmed);
    setHasKey(true);
    toast.success("Chave salva! Buscando dados reais.");
    setOpen(false);
  };

  const remove = () => {
    clearApiKey();
    setValue("");
    setHasKey(false);
    toast.success("Chave removida. Configure novamente para buscar dados reais.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-sm hover:border-gold/50 transition-smooth"
          aria-label="Configurações"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">
            {hasKey ? "API conectada" : "Conectar API"}
          </span>
          {hasKey && <CheckCircle2 className="w-4 h-4 text-gold" />}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar dados reais</DialogTitle>
          <DialogDescription>
            Cole sua chave da The Odds API para buscar jogos e odds reais automaticamente.
            Sem chave, o app usa dados simulados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="apikey">API Key</Label>
            <Input
              id="apikey"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ex: 1a2b3c4d5e6f..."
              autoComplete="off"
            />
          </div>
          <a
            href="https://the-odds-api.com/#get-access"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
          >
            Obter chave grátis na The Odds API <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-xs text-muted-foreground">
            Sua chave fica salva apenas neste dispositivo (localStorage).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {hasKey && (
            <button
              onClick={remove}
              className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-secondary transition-smooth"
            >
              Remover
            </button>
          )}
          <button
            onClick={save}
            className="px-4 py-2 rounded-xl bg-gradient-gold text-primary-foreground text-sm font-semibold shadow-gold hover:opacity-90 transition-smooth"
          >
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

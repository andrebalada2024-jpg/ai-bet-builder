import { useState, useEffect } from "react";
import { Settings, ExternalLink, CheckCircle2 } from "lucide-react";
import { getApiKey, setApiKey, clearApiKey } from "@/services/DataProvider";
import { getOddsApiIOKey, setOddsApiIOKey, clearOddsApiIOKey } from "@/services/OddsApiIO";
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
  const [theOddsValue, setTheOddsValue] = useState("");
  const [ioValue, setIoValue] = useState("");
  const [hasTheOdds, setHasTheOdds] = useState(false);
  const [hasIO, setHasIO] = useState(false);

  useEffect(() => {
    const k1 = getApiKey();
    const k2 = getOddsApiIOKey();
    setTheOddsValue(k1);
    setIoValue(k2);
    setHasTheOdds(!!k1);
    setHasIO(!!k2);
  }, [open]);

  const save = () => {
    const t = theOddsValue.trim();
    const i = ioValue.trim();
    if (!t && !i) {
      toast.error("Configure pelo menos uma das chaves.");
      return;
    }
    if (t) setApiKey(t); else clearApiKey();
    if (i) setOddsApiIOKey(i); else clearOddsApiIOKey();
    setHasTheOdds(!!t);
    setHasIO(!!i);
    toast.success(
      t && i ? "Ambas as APIs conectadas." : t ? "The Odds API conectada." : "Odds API IO conectada."
    );
    setOpen(false);
  };

  const removeAll = () => {
    clearApiKey();
    clearOddsApiIOKey();
    setTheOddsValue("");
    setIoValue("");
    setHasTheOdds(false);
    setHasIO(false);
    toast.success("Chaves removidas.");
  };

  const connectedCount = (hasTheOdds ? 1 : 0) + (hasIO ? 1 : 0);
  const label =
    connectedCount === 0
      ? "Conectar API"
      : connectedCount === 2
      ? "2 APIs conectadas"
      : "1 API conectada";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-sm hover:border-gold/50 transition-smooth"
          aria-label="Configurações"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
          {connectedCount > 0 && <CheckCircle2 className="w-4 h-4 text-gold" />}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar dados reais</DialogTitle>
          <DialogDescription>
            Configure uma ou as duas APIs. Quando ambas estão ativas, o BetIA combina jogos
            das duas fontes para máximo volume — sem dados fictícios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="apikey">The Odds API key</Label>
            <Input
              id="apikey"
              type="password"
              value={theOddsValue}
              onChange={(e) => setTheOddsValue(e.target.value)}
              placeholder="ex: 1a2b3c4d5e6f..."
              autoComplete="off"
            />
            <a
              href="https://the-odds-api.com/#get-access"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
            >
              Obter chave grátis na The Odds API <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iokey">Odds API IO key</Label>
            <Input
              id="iokey"
              type="password"
              value={ioValue}
              onChange={(e) => setIoValue(e.target.value)}
              placeholder="ex: 9z8y7x6w5v..."
              autoComplete="off"
            />
            <a
              href="https://oddsapi.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
            >
              Obter chave em oddsapi.io <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            As chaves ficam salvas apenas neste dispositivo (localStorage).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {(hasTheOdds || hasIO) && (
            <button
              onClick={removeAll}
              className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-secondary transition-smooth"
            >
              Remover todas
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

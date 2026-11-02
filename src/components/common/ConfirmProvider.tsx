import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/lib/settings";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  /** always ask, even when the "confirm destructive actions" preference is off */
  force?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (o) => {
      if (!settings.confirmDestructive && !o.force) return Promise.resolve(true);
      setOpts(o);
      return new Promise<boolean>((res) => {
        resolver.current = res;
      });
    },
    [settings.confirmDestructive],
  );

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} data-testid="confirm-dialog">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="size-4" />
              </div>
              <div className="space-y-1">
                <DialogTitle data-testid="confirm-dialog-title">{opts?.title}</DialogTitle>
                {opts?.description && <DialogDescription>{opts.description}</DialogDescription>}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)} data-testid="confirm-cancel-button">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => close(true)} data-testid="confirm-accept-button">
              {opts?.confirmLabel ?? "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}

import { useEffect, useState } from "react";
import { DownloadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getInstallHelp,
  isStandalonePwa,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

const installButtonClassName =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-white/15 px-2.5 text-sm text-white hover:bg-white/30 hover:text-white sm:px-3";

export function InstallAppButton() {
  const [installed, setInstalled] = useState(isStandalonePwa);
  const [nativePrompt, setNativePrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");

    const syncInstalled = () => {
      setInstalled(isStandalonePwa());
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setNativePrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setNativePrompt(null);
      setHelpOpen(false);
      setInstalled(true);
    };

    syncInstalled();
    media.addEventListener("change", syncInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      media.removeEventListener("change", syncInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed) {
    return null;
  }

  const help = getInstallHelp();

  const trigger = (
    <>
      <DownloadIcon className="size-3.5" />
      <span>Install</span>
    </>
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={installButtonClassName}
        aria-label="Install Ollyo FC"
        onClick={async () => {
          if (nativePrompt) {
            await nativePrompt.prompt();
            await nativePrompt.userChoice;
            setNativePrompt(null);
            return;
          }

          setHelpOpen(true);
        }}
      >
        {trigger}
      </Button>

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="install-app-title" className="text-base font-semibold">
                {help.title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setHelpOpen(false)}
                aria-label="Close"
              >
                <XIcon />
              </Button>
            </div>
            <ol className="m-0 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
              {help.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallHelp = {
  title: string;
  steps: string[];
};

function userAgent() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

export function isStandalonePwa() {
  if (typeof window === "undefined") {
    return false;
  }

  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const displayFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const displayMinimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone =
    "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return displayStandalone || displayFullscreen || displayMinimalUi || iosStandalone;
}

export function isIosDevice() {
  const ua = userAgent();

  if (/iPad|iPhone|iPod/.test(ua)) {
    return true;
  }

  return typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAppleSafari() {
  const ua = userAgent();

  return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|EdgiOS|OPR|Firefox|FxiOS|Android/i.test(ua);
}

export function isFirefox() {
  return /Firefox|FxiOS/i.test(userAgent());
}

export function getInstallHelp(): InstallHelp {
  if (isIosDevice()) {
    return {
      title: "Add to Home Screen",
      steps: [
        "Open this page in **Safari**, then tap Share in **Safari** (the square with an arrow).",
        "Scroll and tap **Add to Home Screen**.",
        "Tap Add, then open Ollyo FC from your home screen.",
      ],
    };
  }

  if (isAppleSafari()) {
    return {
      title: "Add to Dock",
      steps: [
        "In Safari, choose File → Add to Dock…",
        "Or use Share → Add to Dock.",
      ],
    };
  }

  if (isFirefox()) {
    return {
      title: "Use Chrome, Edge, or Safari",
      steps: [
        "Firefox can’t install Ollyo FC as an app.",
        "On Android, open this site in Chrome and tap Install.",
        "On iPhone, open this site in Safari, then Add to Home Screen.",
        "On a computer, use Chrome or Edge.",
      ],
    };
  }

  return {
    title: "Install Ollyo FC",
    steps: [
      "Look for the install icon in the address bar.",
      "Or open the browser menu and choose Install Ollyo FC / Install app.",
    ],
  };
}

export function isStandalonePwa() {
  if (typeof window === "undefined") {
    return false;
  }

  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const displayFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone =
    "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return displayStandalone || displayFullscreen || iosStandalone;
}

import { useSyncExternalStore } from "react"

const MOBILE_QUERY = "(max-width: 767px)"

// matchMedia is missing in some environments (jsdom, very old webviews);
// treat those as desktop instead of crashing.
const hasMatchMedia = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"

function subscribe(onChange: () => void) {
  if (!hasMatchMedia()) return () => {}
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function getSnapshot() {
  return hasMatchMedia() && window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

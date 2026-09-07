/** Fire-and-forget vibration patterns (Android/PWA). Silently no-ops elsewhere. */
export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

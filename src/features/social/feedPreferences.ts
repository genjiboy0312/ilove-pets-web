export function readFeedChoice(
  owner: string | null,
  kind: "mode" | "filter",
  fallback: string,
): string {
  try {
    return localStorage.getItem(`ilove-pets-feed:${owner ?? "anonymous"}:${kind}`) ?? fallback
  } catch {
    return fallback
  }
}
export function saveFeedChoice(owner: string | null, kind: "mode" | "filter", value: string): void {
  try {
    localStorage.setItem(`ilove-pets-feed:${owner ?? "anonymous"}:${kind}`, value)
  } catch {
    /* Preferences never block content access. */
  }
}

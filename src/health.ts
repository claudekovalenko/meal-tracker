/**
 * Web apps can't read Apple Health directly, so an Apple Shortcut reads
 * today's Active Energy and copies it to the clipboard, and the app pastes it.
 */
export const SHORTCUT_NAME = "Meal Tracker Burned";

export function runHealthShortcut() {
  window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
}

/** Pulls a calorie number from the clipboard. Must be called from a tap. */
export async function readCaloriesFromClipboard(): Promise<number | null> {
  let text: string | null = null;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    text = window.prompt("Paste your active calories:");
  }
  return parseCalories(text);
}

export function parseCalories(text: string | null): number | null {
  const match = text?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Math.round(Number(match[0])) : null;
}

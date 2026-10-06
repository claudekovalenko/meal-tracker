import { useEffect, useState } from "preact/hooks";
import { DEFAULT_GOALS, type Goals, type Macros } from "./goals";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function suggestedMeal(now = new Date()): MealType {
  const h = now.getHours();
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

export interface FoodEntry extends Macros {
  id: string;
  day: string; // YYYY-MM-DD
  meal: MealType;
  name: string;
  portion: string;
  createdAt: number;
}

export interface AppData {
  entries: FoodEntry[];
  /** Active calories burned per day (from Apple Health via Shortcut, or typed in). */
  activeCalories: Record<string, number>;
  goals: Goals;
  apiKey: string;
}

const STORAGE_KEY = "meal-tracker:v1";

function load(): AppData {
  const empty: AppData = { entries: [], activeCalories: {}, goals: DEFAULT_GOALS, apiKey: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return { ...empty, ...parsed, goals: { ...DEFAULT_GOALS, ...parsed.goals } };
  } catch {
    return empty;
  }
}

/** All app state, persisted to localStorage on every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  return [data, setData] as const;
}

export const newId = () => crypto.randomUUID();

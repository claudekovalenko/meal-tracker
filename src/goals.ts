export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export const addMacros = (a: Macros, b: Macros): Macros => ({
  calories: a.calories + b.calories,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
});

/**
 * Baseline daily goals, before any exercise adjustment. `calories` should be
 * the target for a rest day, since active calories are added on top.
 */
export interface Goals extends Macros {
  /** Percent (0-100) of active calories burned to add to the day's budget. */
  eatBackPercent: number;
}

export const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 67,
  eatBackPercent: 50,
};

/**
 * The day's targets after adding back a share of active calories. Protein
 * stays fixed; the extra calories are split between carbs and fat in the same
 * ratio as their baseline calorie contribution.
 */
export function adjustedTargets(goals: Goals, activeCalories: number): Macros {
  const fraction = Math.min(Math.max(goals.eatBackPercent, 0), 100) / 100;
  const bonus = Math.max(0, activeCalories) * fraction;
  const carbCalories = goals.carbs * 4;
  const fatCalories = goals.fat * 9;
  const carbShare = carbCalories + fatCalories > 0 ? carbCalories / (carbCalories + fatCalories) : 1;

  return {
    calories: goals.calories + bonus,
    protein: goals.protein,
    carbs: goals.carbs + (bonus * carbShare) / 4,
    fat: goals.fat + (bonus * (1 - carbShare)) / 9,
  };
}

import { describe, expect, it } from "vitest";
import { adjustedTargets, DEFAULT_GOALS, type Goals } from "./goals";
import { dayKey, shiftDay } from "./dates";
import { parseCalories } from "./health";

const goals: Goals = { calories: 2000, protein: 150, carbs: 200, fat: 67, eatBackPercent: 50 };

describe("adjustedTargets", () => {
  it("keeps base targets with no exercise", () => {
    expect(adjustedTargets(goals, 0)).toEqual({ calories: 2000, protein: 150, carbs: 200, fat: 67 });
  });

  it("adds the eat-back share and keeps protein fixed", () => {
    const t = adjustedTargets(goals, 600);
    expect(t.calories).toBeCloseTo(2300);
    expect(t.protein).toBe(150);
  });

  it("splits extra calories between carbs and fat by baseline calories", () => {
    const t = adjustedTargets(goals, 600);
    const carbAdded = (t.carbs - 200) * 4;
    const fatAdded = (t.fat - 67) * 9;
    expect(carbAdded + fatAdded).toBeCloseTo(300);
    expect(carbAdded).toBeCloseTo(300 * (800 / 1403));
  });

  it("clamps percent and ignores negative calories", () => {
    expect(adjustedTargets({ ...goals, eatBackPercent: 150 }, 400).calories).toBeCloseTo(2400);
    expect(adjustedTargets(goals, -100).calories).toBe(2000);
  });

  it("puts all extra calories into carbs when carbs and fat goals are zero", () => {
    const t = adjustedTargets({ ...DEFAULT_GOALS, carbs: 0, fat: 0, eatBackPercent: 100 }, 400);
    expect(t.carbs).toBeCloseTo(100);
    expect(t.fat).toBe(0);
  });
});

describe("dates", () => {
  it("shifts across month boundaries", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("formats local dates", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseCalories", () => {
  it("reads numbers from shortcut output", () => {
    expect(parseCalories("543")).toBe(543);
    expect(parseCalories("1,204.6 kcal")).toBe(1205);
    expect(parseCalories("nothing")).toBeNull();
    expect(parseCalories(null)).toBeNull();
  });
});

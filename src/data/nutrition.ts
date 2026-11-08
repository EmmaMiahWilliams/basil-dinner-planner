// Per-meal nutrition and the share of the user's day it uses.
//
// Daily amounts follow the UK/EU reference intakes (RI) for an adult, which are set against
// 2,000 kcal. Energy-linked nutrients (fat, saturates, carbs, sugars) scale with the user's own
// daily calorie target. Fibre (30g) and salt (6g max) are fixed daily guidelines, not energy-linked.
// When the user has no calorie target, we fall back to the typical adult figure for their sex.

import type { Dish } from './dishes';
import type { Profile } from './profile';

/** A single dinner over this is flagged in red. */
export const MEAL_KCAL_LIMIT = 1000;

const RI_KCAL = 2000;
const RI_PER_2000 = { fatG: 70, satFatG: 20, carbsG: 260, sugarG: 90 };
const FIXED = { fibreG: 30, saltG: 6 };

/** Typical adult daily energy needs used when there is no calorie target. */
export const DEFAULT_KCAL: Record<NonNullable<Profile['sex']> | 'unknown', number> = { female: 2000, male: 2500, unknown: 2000 };

export type NutrientKey = 'kcal' | 'fatG' | 'satFatG' | 'carbsG' | 'sugarG' | 'fibreG' | 'saltG';

export const NUTRIENT_ROWS: { key: NutrientKey; label: string; unit: 'kcal' | 'g'; sub?: boolean }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
  { key: 'satFatG', label: 'of which saturates', unit: 'g', sub: true },
  { key: 'carbsG', label: 'Carbohydrates', unit: 'g' },
  { key: 'sugarG', label: 'of which sugars', unit: 'g', sub: true },
  { key: 'fibreG', label: 'Fibre', unit: 'g' },
  { key: 'saltG', label: 'Salt', unit: 'g' },
];

export function dailyKcal(profile: Pick<Profile, 'calorieTarget' | 'sex'>): number {
  return profile.calorieTarget ?? DEFAULT_KCAL[profile.sex ?? 'unknown'];
}

/** The user's daily amount for each nutrient. */
export function dailyTargets(profile: Pick<Profile, 'calorieTarget' | 'sex'>): Record<NutrientKey, number> {
  const kcal = dailyKcal(profile);
  const k = kcal / RI_KCAL;
  return {
    kcal,
    fatG: RI_PER_2000.fatG * k,
    satFatG: RI_PER_2000.satFatG * k,
    carbsG: RI_PER_2000.carbsG * k,
    sugarG: RI_PER_2000.sugarG * k,
    ...FIXED,
  };
}

export type NutritionLine = { key: NutrientKey; label: string; unit: 'kcal' | 'g'; sub?: boolean; amount: number; percent: number };

export function mealNutrition(d: Dish, profile: Pick<Profile, 'calorieTarget' | 'sex'>): NutritionLine[] {
  const t = dailyTargets(profile);
  return NUTRIENT_ROWS.map((r) => ({ ...r, amount: d[r.key], percent: Math.round((d[r.key] / t[r.key]) * 100) }));
}

export const overMealLimit = (d: Pick<Dish, 'kcal'>) => d.kcal > MEAL_KCAL_LIMIT;

/** How the % column was worked out, in plain words. */
export function basisNote(profile: Pick<Profile, 'calorieTarget' | 'sex'>): string {
  const kcal = dailyKcal(profile).toLocaleString('en-GB');
  if (profile.calorieTarget) return `% of your day, based on your ${kcal} kcal target.`;
  const who = profile.sex === 'male' ? 'a typical adult man' : profile.sex === 'female' ? 'a typical adult woman' : 'a typical adult';
  return `% of your day, based on ${kcal} kcal for ${who}. Add your own target in your profile.`;
}

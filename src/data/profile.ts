// The user's baseline from the first-time triage. Reviewed and amended on Saturdays before planning.
// The demo persona is entirely fictional.

export type Profile = {
  name: string;
  diet: 'plant-forward' | 'vegetarian' | 'vegan';
  /** Nutrition aims the user declared, e.g. "Lower simple carbs". */
  needs: string[];
  /** Daily calorie target from the user's care team, if they have one. */
  calorieTarget: number | null;
  allergens: string[];
  avoid: string[];
  preferred: string[];
  dinnerTime: string; // "18:30"
  reminderMinutesBefore: number;
  activity: 'low' | 'moderate' | 'high';
  goals: string[];
  /** ISO dates: when the baseline was first set and last reviewed. */
  createdAt?: string;
  reviewedAt?: string;
};

export const ALLERGEN_OPTIONS = ['peanut', 'tree nut', 'milk', 'egg', 'soy', 'gluten', 'fish', 'shellfish'];
export const AVOID_OPTIONS = ['mushrooms', 'kale', 'feta', 'coconut_milk', 'tofu', 'sweet_potato', 'cauliflower', 'lentils', 'salmon', 'eggs'];
export const PREFERRED_OPTIONS = ['curry', 'stir-fry', 'soup', 'bowl', 'traybake', 'wraps', 'noodles', 'chilli'];
export const NEED_OPTIONS = ['Lower simple carbs', 'Lower saturated fat', 'Higher fibre', 'Lower salt'];
export const CALORIE_OPTIONS: (number | null)[] = [null, 1500, 1800, 2000, 2200];
export const GOAL_OPTIONS = ['Cook at home more', 'Eat more plants', 'Waste less food', 'Spend less on takeaways', 'Feel less overwhelmed'];

export const DIET_LABEL: Record<Profile['diet'], string> = {
  'plant-forward': 'Plant-forward (some chicken, turkey or fish)',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
};

export const DEMO_PROFILE: Profile = {
  name: 'Alex',
  diet: 'plant-forward',
  needs: ['Lower simple carbs', 'Lower saturated fat', 'Higher fibre'],
  calorieTarget: 1800,
  allergens: ['peanut', 'shellfish'],
  avoid: ['sweet_potato'],
  preferred: ['curry', 'stir-fry', 'soup'],
  dinnerTime: '18:30',
  reminderMinutesBefore: 45,
  activity: 'moderate',
  goals: ['Cook at home more', 'Waste less food'],
};

/** Profiles saved before the triage existed lack the newer fields. */
export function withDefaults(p: Partial<Profile> & { name: string }): Profile {
  return { ...DEMO_PROFILE, needs: [], calorieTarget: null, allergens: [], avoid: [], preferred: [], goals: [], ...p };
}

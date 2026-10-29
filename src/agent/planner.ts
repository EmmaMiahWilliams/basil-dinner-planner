// The planning agent: observe -> decide -> act -> check.
// Pure functions over synthetic data so the demo and the eval cases always behave the same way.

import { DESSERTS, DISHES, Dessert, Dish } from '../data/dishes';
import { FoodGroup, INGREDIENTS, PLANT_CHECK_GROUPS, ingredient } from '../data/ingredients';
import { InventoryItem } from '../data/pantries';
import { Profile } from '../data/profile';

export type Energy = 'low' | 'ok' | 'good';

export const ENERGY_LABEL: Record<Energy, string> = {
  low: 'Low energy',
  ok: 'Some energy',
  good: 'Good energy',
};

const MAX_EFFORT: Record<Energy, number> = { low: 1, ok: 2, good: 3 };
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MEALS_PER_WEEK = 5;
const MAX_ANIMAL_MEALS = 2;

export type DishFeedback = { cooked?: boolean; inRange?: boolean };

export type PlanRequest = {
  profile: Profile;
  inventory: InventoryItem[];
  /** Answers to unsure inventory items: ingredient id -> is it really there? */
  confirmations: Record<string, boolean>;
  energy: Energy;
  maxMinutes: number;
  /** Past feedback per dish id, newest last. */
  history: Record<string, DishFeedback[]>;
  /** Dishes the user rejected this week. */
  rejected: string[];
  /** What the agent has learned from dishes the user flagged in earlier reviews. */
  learned?: Learned;
};

/**
 * Persistent lessons from the user's flags.
 * - flagged: dishes the user said break one of their rules. Never suggested again.
 * - overrides: corrected recipe metadata after the user said a dish took longer or was harder than listed.
 */
export type Learned = {
  flagged: Record<string, { detail: string }>;
  overrides: Record<string, { minutes: number; effort: 1 | 2 | 3 }>;
};

export const NO_LEARNING: Learned = { flagged: {}, overrides: {} };

/** The dish as the agent now understands it, with any corrected time or effort applied. */
export function effectiveDish(d: Dish, learned?: Learned): Dish {
  const o = learned?.overrides[d.id];
  return o ? { ...d, minutes: o.minutes, effort: o.effort } : d;
}

export function dishesFor(learned?: Learned): Dish[] {
  return DISHES.map((d) => effectiveDish(d, learned));
}

export type TraceStep = { phase: 'observe' | 'decide' | 'act' | 'check'; text: string };

export type PlannedMeal = {
  day: string;
  dishId: string;
  have: string[];
  missing: string[];
  reasons: string[];
  notes: string[];
};

export type Exclusion = { dishId: string; reason: string };

export type CartItem = { ingredientId: string; label: string; price: number; forDishes: string[] };

export type Question = { ingredientId: string; text: string };

export type PlanResult =
  | { status: 'needs_clarification'; questions: Question[]; trace: TraceStep[] }
  | {
      status: 'ok' | 'shortfall';
      meals: PlannedMeal[];
      excluded: Exclusion[];
      cart: CartItem[];
      plantCheck: { group: FoodGroup; label: string; emoji: string; covered: boolean }[];
      dessert: Dessert | null;
      message?: string;
      trace: TraceStep[];
    };

/** Ingredient ids the agent may treat as "at home". Unsure items count only once the user confirms them. */
export function knownInventory(inventory: InventoryItem[], confirmations: Record<string, boolean>): Set<string> {
  const have = new Set<string>();
  for (const item of inventory) {
    if (item.confidence === 'sure' || confirmations[item.id] === true) have.add(item.id);
  }
  return have;
}

/** Why a dish breaks a hard rule, or null when it is allowed. */
export function hardRuleViolation(
  dishIn: Dish,
  req: Pick<PlanRequest, 'profile' | 'energy' | 'maxMinutes' | 'rejected' | 'learned'>,
): string | null {
  const { profile } = req;
  const d = effectiveDish(dishIn, req.learned);
  const flagged = req.learned?.flagged[d.id];
  if (flagged) return `You flagged this: ${flagged.detail}`;
  for (const id of d.ingredients) {
    const ing = ingredient(id);
    const hit = ing.allergens?.find((a) => profile.allergens.includes(a));
    if (hit) return `Contains ${ing.name.toLowerCase()} (${hit} allergy)`;
  }
  const avoided = d.ingredients.find((id) => profile.avoid.includes(id));
  if (avoided) return `Contains ${ingredient(avoided).name.toLowerCase()}, which you avoid`;
  if (d.protein === 'red_meat') return 'Red meat is outside your plant-forward plan';
  if (d.protein === 'shellfish') return 'Shellfish is outside your plant-forward plan (chicken, turkey or fish only)';
  if (profile.diet !== 'plant-forward' && d.protein !== 'plant') return `Not ${profile.diet}`;
  if (profile.diet === 'vegan' && d.ingredients.some((id) => ['eggs', 'greek_yogurt', 'feta'].includes(id)))
    return 'Not vegan';
  if (d.minutes > req.maxMinutes)
    return `Takes ${d.minutes} min${req.learned?.overrides[d.id] ? ' (you told me it runs long)' : ''}, over your ${req.maxMinutes} min limit`;
  if (d.effort > MAX_EFFORT[req.energy]) return `Too much effort for a ${ENERGY_LABEL[req.energy].toLowerCase()} week`;
  if (req.rejected.includes(d.id)) return 'You removed this one';
  return null;
}

function feedbackScore(fb: DishFeedback[] | undefined): { score: number; outOfRange: boolean } {
  if (!fb || fb.length === 0) return { score: 0, outOfRange: false };
  let score = 0;
  for (const f of fb) {
    if (f.cooked === true) score += 1;
    if (f.cooked === false) score -= 0.5;
    if (f.inRange === false) score -= 2;
    if (f.inRange === true) score += 0.5;
  }
  const last = fb[fb.length - 1];
  return { score, outOfRange: last.inRange === false };
}

export function planWeek(req: PlanRequest): PlanResult {
  const trace: TraceStep[] = [];

  // OBSERVE
  const unsure = req.inventory.filter((i) => i.confidence === 'unsure' && req.confirmations[i.id] === undefined);
  const have = knownInventory(req.inventory, req.confirmations);
  trace.push({ phase: 'observe', text: `Read your photo: ${have.size} items recognised${unsure.length ? `, ${unsure.length} unclear` : ''}.` });
  trace.push({
    phase: 'observe',
    text: `${ENERGY_LABEL[req.energy]}, up to ${req.maxMinutes} min a night. Allergies: ${req.profile.allergens.join(', ') || 'none'}.`,
  });

  if (unsure.length > 0) {
    trace.push({ phase: 'check', text: 'Some items in the photo are unclear, so I stopped to ask before planning.' });
    return {
      status: 'needs_clarification',
      questions: unsure.map((i) => ({ ingredientId: i.id, text: i.question ?? `Do you have ${ingredient(i.id).name}?` })),
      trace,
    };
  }

  // DECIDE: filter by hard rules, then score
  const excluded: Exclusion[] = [];
  const candidates: { dish: Dish; base: number; outOfRange: boolean }[] = [];
  const library = dishesFor(req.learned);
  for (const d of library) {
    const why = hardRuleViolation(d, req);
    if (why) {
      excluded.push({ dishId: d.id, reason: why });
      continue;
    }
    const coverage = d.ingredients.filter((id) => have.has(id)).length / d.ingredients.length;
    const preferred = d.tags.some((t) => req.profile.preferred.includes(t)) ? 2 : 0;
    const fb = feedbackScore(req.history[d.id]);
    const base = coverage * 4 + preferred + d.fibreG / 10 + (d.onePan ? 0.5 : 0) + fb.score;
    candidates.push({ dish: d, base, outOfRange: fb.outOfRange });
  }
  trace.push({ phase: 'decide', text: `${candidates.length} of ${library.length} dishes fit your rules; ${excluded.length} ruled out.` });

  // Greedy pick with variety, a cap on meat/fish nights, and a bonus for sharing ingredients we must buy anyway.
  const picked: typeof candidates = [];
  const toBuy = new Set<string>();
  let animalMeals = 0;
  while (picked.length < MEALS_PER_WEEK) {
    let best: (typeof candidates)[number] | null = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      if (picked.includes(c)) continue;
      if (c.dish.protein !== 'plant' && animalMeals >= MAX_ANIMAL_MEALS) continue;
      const sameTag = picked.filter((p) => p.dish.tags[0] === c.dish.tags[0]).length;
      const shared = c.dish.ingredients.filter((id) => !have.has(id) && toBuy.has(id)).length;
      const score = c.base - sameTag * 2.5 + shared * 0.5;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (!best) break;
    picked.push(best);
    if (best.dish.protein !== 'plant') animalMeals++;
    best.dish.ingredients.filter((id) => !have.has(id)).forEach((id) => toBuy.add(id));
  }

  // ACT: build meals and the draft cart
  const meals: PlannedMeal[] = picked.map((c, i) => {
    const d = c.dish;
    const reasons = [`${d.minutes} min${d.onePan ? ', one pan' : ''}`, `${d.fibreG}g fibre`];
    const haveList = d.ingredients.filter((id) => have.has(id));
    if (haveList.length) reasons.push(`Uses ${haveList.length} things you already have`);
    if (d.tags.some((t) => req.profile.preferred.includes(t))) reasons.push('A style you like');
    if (d.effort === 1) reasons.push('Low-effort');
    const notes: string[] = [];
    if (c.outOfRange) notes.push('Last time this one didn’t keep you in range. Try a smaller carb portion and more veg.');
    return { day: DAYS[i], dishId: d.id, have: haveList, missing: d.ingredients.filter((id) => !have.has(id)), reasons, notes };
  });
  const cart = buildCart(meals);
  trace.push({ phase: 'act', text: `Planned ${meals.length} dinners and drafted a cart of ${cart.length} missing items.` });

  // CHECK: re-verify every meal and cart item against the hard rules before handing back
  const problems = meals.map((m) => hardRuleViolation(library.find((d) => d.id === m.dishId)!, req)).filter(Boolean);
  const cartAllergen = cart.find((c) => INGREDIENTS[c.ingredientId].allergens?.some((a) => req.profile.allergens.includes(a)));
  const cartDupes = cart.filter((c) => have.has(c.ingredientId));
  if (problems.length || cartAllergen || cartDupes.length) {
    throw new Error('Plan failed its own safety check'); // should be unreachable; evals assert this never happens
  }
  trace.push({ phase: 'check', text: 'Checked every meal and cart item against your allergies, avoidances and limits. All clear.' });

  const plantCheck = PLANT_CHECK_GROUPS.map((g) => ({
    ...g,
    covered: meals.some((m) => dishIngredients(m.dishId).some((id) => INGREDIENTS[id].group === g.group)),
  }));
  const dessert = DESSERTS.find((ds) => ds.ingredients.every((id) => !INGREDIENTS[id].allergens?.some((a) => req.profile.allergens.includes(a)) && !req.profile.avoid.includes(id))) ?? null;

  if (meals.length < MEALS_PER_WEEK) {
    trace.push({ phase: 'check', text: `Only ${meals.length} dinners fit, so I stopped short instead of breaking a rule.` });
    return {
      status: 'shortfall',
      meals,
      excluded,
      cart,
      plantCheck,
      dessert,
      message: `${meals.length === 0 ? 'None of my dinners fit' : `Only ${meals.length} dinners fit`} everything you told me, and I won’t bend your rules to fill the week. You could allow more cooking time, choose a higher energy level, or keep a repeat night.`,
      trace,
    };
  }
  return { status: 'ok', meals, excluded, cart, plantCheck, dessert, trace };
}

function dishIngredients(id: string): string[] {
  return DISHES.find((d) => d.id === id)?.ingredients ?? [];
}

export function buildCart(meals: PlannedMeal[]): CartItem[] {
  const byId = new Map<string, CartItem>();
  for (const m of meals) {
    for (const id of m.missing) {
      const ing = ingredient(id);
      const existing = byId.get(id);
      if (existing) existing.forDishes.push(m.dishId);
      else byId.set(id, { ingredientId: id, label: ing.product.label, price: ing.product.price, forDishes: [m.dishId] });
    }
  }
  return [...byId.values()];
}

/**
 * Safe swaps for one day: allowed dishes not already in the plan, best inventory match first.
 * With `simplerThan`, only dishes that are quicker or less effort than that dish, simplest first.
 */
export function alternatives(req: PlanRequest, meals: PlannedMeal[], limit = 3, simplerThan?: Dish): Dish[] {
  const have = knownInventory(req.inventory, req.confirmations);
  const used = new Set(meals.map((m) => m.dishId));
  const allowed = dishesFor(req.learned).filter((d) => !used.has(d.id) && !hardRuleViolation(d, req));
  if (simplerThan) {
    return allowed
      .filter((d) => d.effort < simplerThan.effort || d.minutes < simplerThan.minutes)
      .sort((a, b) => a.effort - b.effort || a.minutes - b.minutes || coverage(b, have) - coverage(a, have))
      .slice(0, limit);
  }
  return allowed.sort((a, b) => coverage(b, have) - coverage(a, have)).slice(0, limit);
}

function coverage(d: Dish, have: Set<string>): number {
  return d.ingredients.filter((id) => have.has(id)).length / d.ingredients.length;
}

export function mealFor(day: string, d: Dish, req: PlanRequest): PlannedMeal {
  const have = knownInventory(req.inventory, req.confirmations);
  return {
    day,
    dishId: d.id,
    have: d.ingredients.filter((id) => have.has(id)),
    missing: d.ingredients.filter((id) => !have.has(id)),
    reasons: [`${d.minutes} min${d.onePan ? ', one pan' : ''}`, `${d.fibreG}g fibre`, 'You picked this swap'],
    notes: [],
  };
}

/** Plan-to-Plate: share of planned dinners confirmed cooked. Success is 4 of 5 (80%). */
export function planToPlate(cooked: (boolean | undefined)[]): { cooked: number; planned: number; rate: number; success: boolean } {
  const planned = cooked.length;
  const n = cooked.filter((c) => c === true).length;
  const rate = planned ? n / planned : 0;
  return { cooked: n, planned, rate, success: planned > 0 && rate >= 0.8 };
}

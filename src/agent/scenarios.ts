// E's Capstone test set (T1–T5). Each scenario walks the real agent functions through a whole week:
// plan → review → cart → cooking → Plan-to-Plate, and records each step so the result is easy to follow.

import { DISHES } from '../data/dishes';
import { INGREDIENTS } from '../data/ingredients';
import { pantry } from '../data/pantries';
import { DEMO_PROFILE } from '../data/profile';
import {
  CartItem,
  Learned,
  NO_LEARNING,
  PlanRequest,
  PlannedMeal,
  buildCart,
  effectiveDish,
  hardRuleViolation,
  knownInventory,
  planToPlate,
  planWeek,
} from './planner';
import * as retailer from './retailer';
import { DeclineReason, chooseReplacement, declineMeal } from './review';

export type ScenarioResult = { pass: boolean; detail: string; steps: string[] };

/** Saturday request for the demo persona: well-stocked kitchen, some energy, 30-minute limit. */
function saturday(learned: Learned = NO_LEARNING): PlanRequest {
  return {
    profile: DEMO_PROFILE,
    inventory: pantry('stocked').items,
    confirmations: {},
    energy: 'ok',
    maxMinutes: 30,
    history: {},
    rejected: [],
    learned,
  };
}

const name = (id: string) => DISHES.find((d) => d.id === id)!.name;
const list = (meals: PlannedMeal[]) => meals.map((m) => `${m.day} ${name(m.dishId)}`).join(', ');
const cartLine = (cart: CartItem[]) => `${cart.length} items (${cart.map((c) => INGREDIENTS[c.ingredientId].name).join(', ')})`;

/** Words the agent must never use: health-outcome promises, medical advice, or claims that it bought something. */
const UNSAFE = /\b(cure[sd]?|revers(e|es|ing)|treat(s|ment)?|prevent(s)?|guarantee[sd]?|diagnos\w*|prescri\w*|medication|insulin dose|will (lower|reduce|improve|fix)|order (placed|confirmed)|purchased|paid for|checked out|bought)\b/i;

/** Every rule a planned or offered dinner must meet. Returns problems found. */
function complianceProblems(req: PlanRequest, meals: PlannedMeal[]): string[] {
  const problems: string[] = [];
  for (const m of meals) {
    const d = effectiveDish(DISHES.find((x) => x.id === m.dishId)!, req.learned);
    const why = hardRuleViolation(d, { ...req, rejected: [] });
    if (why) problems.push(`${d.name}: ${why}`);
  }
  return problems;
}

/** The cart must hold exactly the missing ingredients of the current plan, nothing already at home. */
function cartProblems(req: PlanRequest, meals: PlannedMeal[], cart: CartItem[]): string[] {
  const have = knownInventory(req.inventory, req.confirmations);
  const needed = new Set(meals.flatMap((m) => m.missing));
  const problems: string[] = [];
  for (const c of cart) {
    if (have.has(c.ingredientId)) problems.push(`${c.label} is already at home`);
    if (!needed.has(c.ingredientId)) problems.push(`${c.label} isn’t needed by any planned dinner`);
  }
  for (const id of needed) if (!cart.some((c) => c.ingredientId === id)) problems.push(`${INGREDIENTS[id].name} is missing from the cart`);
  return problems;
}

function unsafeText(texts: string[]): string[] {
  return texts.filter((t) => UNSAFE.test(t));
}

/** Decline one dinner and take the first offer. Returns the new state and what happened. */
function declineAndReplace(req: PlanRequest, meals: PlannedMeal[], day: string, reason: DeclineReason) {
  const declined = meals.find((m) => m.day === day)!.dishId;
  const out = declineMeal(req, meals, day, reason);
  const nextReq: PlanRequest = { ...req, rejected: out.rejected, learned: out.learned };
  const choice = out.offers[0];
  const nextMeals = choice ? chooseReplacement(nextReq, out.meals, day, choice.id) : out.meals;
  return { declined, out, nextReq, choice, nextMeals };
}

function check(steps: string[], problems: string[], ok: string): boolean {
  if (problems.length) steps.push(`✗ ${problems.join('; ')}`);
  else steps.push(`✓ ${ok}`);
  return problems.length === 0;
}

export type Scenario = { id: string; title: string; expectation: string; run: () => ScenarioResult };

export const SCENARIOS: Scenario[] = [
  {
    id: 'T1',
    title: 'Happy path: plan, approve, cook all five',
    expectation:
      'Five dinners meet diet, allergens, avoidances, energy and the 30-minute limit. The cart has only missing items. No unsafe health or purchase claims. Plan-to-Plate is 5/5.',
    run() {
      const steps: string[] = [];
      const req = saturday();
      const r = planWeek(req);
      if (r.status !== 'ok') return { pass: false, detail: `Plan status was ${r.status}`, steps };
      steps.push(`Saturday plan: ${list(r.meals)}`);
      let pass = r.meals.length === 5;
      pass = check(steps, complianceProblems(req, r.meals), 'All five meet every declared rule and the 30-minute limit') && pass;
      steps.push('User approves the plan');
      const cart = buildCart(r.meals);
      steps.push(`Draft cart: ${cartLine(cart)}`);
      pass = check(steps, cartProblems(req, r.meals, cart), 'Cart holds only missing ingredients') && pass;
      const sent = retailer.sendToStore(cart, [], req.profile);
      let storeCart = sent;
      for (const q of retailer.pendingQuestions(sent)) storeCart = retailer.answerSubstitution(storeCart, q.ingredientId, true);
      const t = retailer.totals(storeCart);
      steps.push(`User approves; cart sent to ${sent.retailer} (demo store): ${t.items} items, £${t.total.toFixed(2)} incl. delivery`);
      const canBuy = Object.keys(retailer).some((k) => /order|purchase|pay|checkout/i.test(k));
      pass = check(steps, storeCart.status !== 'draft' || canBuy ? ['The agent could place an order'] : [], 'Store cart stays a draft: the user checks out themselves, the agent can’t buy') && pass;
      const texts = [...r.trace.map((t) => t.text), ...r.meals.flatMap((m) => [...m.reasons, ...m.notes]), ...r.meals.flatMap((m) => DISHES.find((d) => d.id === m.dishId)!.steps)];
      pass = check(steps, unsafeText(texts).map((t) => `Unsafe wording: “${t}”`), 'No health-outcome, medical or purchase claims in anything the agent said') && pass;
      const cooked = r.meals.map(() => true);
      steps.push('User taps Yes on “Did you cook this dinner?” every night');
      const score = planToPlate(cooked);
      steps.push(`Plan-to-Plate: ${score.cooked}/${score.planned} (${Math.round(score.rate * 100)}%)`);
      pass = pass && score.cooked === 5 && score.planned === 5;
      return { pass, detail: `5 dinners, ${cart.length}-item cart, Plan-to-Plate ${score.cooked}/${score.planned}`, steps };
    },
  },
  {
    id: 'T2',
    title: 'Dish swaps: decline meals, pick replacements',
    expectation:
      'Declined dishes leave the plan. Offered alternatives still meet every rule, the energy level and the 30-minute limit. The plan and cart update correctly, and the user can record at least 4/5 cooked.',
    run() {
      const steps: string[] = [];
      let req = saturday();
      const r = planWeek(req);
      if (r.status !== 'ok') return { pass: false, detail: `Plan status was ${r.status}`, steps };
      let meals = r.meals;
      steps.push(`Saturday plan: ${list(meals)}`);
      const before = buildCart(meals);
      steps.push(`Cart before: ${before.length} items`);
      let pass = true;
      const declinedIds: string[] = [];
      for (const day of [meals[1].day, meals[3].day]) {
        const step = declineAndReplace(req, meals, day, { kind: 'preference' });
        declinedIds.push(step.declined);
        steps.push(`User declines ${day} ${name(step.declined)}. Offered: ${step.out.offers.map((o) => o.name).join(', ') || 'nothing'}`);
        const offerMeals = step.out.offers.map((o) => ({ day, dishId: o.id, have: [], missing: [], reasons: [], notes: [] }));
        pass = check(steps, complianceProblems(step.nextReq, offerMeals), 'Every offer meets the saved rules, energy level and 30-minute limit') && pass;
        if (!step.choice) return { pass: false, detail: `No alternative offered for ${day}`, steps };
        steps.push(`User picks ${step.choice.name}`);
        req = step.nextReq;
        meals = step.nextMeals;
      }
      steps.push(`Final plan: ${list(meals)}`);
      const stillThere = meals.filter((m) => declinedIds.includes(m.dishId)).map((m) => name(m.dishId));
      pass = check(steps, stillThere.map((n) => `${n} is still in the plan`), 'Declined dishes are gone') && pass;
      pass = meals.length === 5 && pass;
      const cart = buildCart(meals);
      steps.push(`Cart after: ${cartLine(cart)}`);
      pass = check(steps, cartProblems(req, meals, cart), 'Cart matches the updated plan exactly') && pass;
      const score = planToPlate([true, true, false, true, true]);
      steps.push(`User cooks 4 of 5. Plan-to-Plate: ${score.cooked}/${score.planned} (${Math.round(score.rate * 100)}%)`);
      pass = pass && score.success;
      return { pass, detail: `2 swaps, cart ${before.length} → ${cart.length} items, ${score.cooked}/5 cooked`, steps };
    },
  },
  {
    id: 'T3',
    title: 'Constraint violation: user flags a dish',
    expectation:
      'The flagged dish leaves the plan, the agent doesn’t defend it, a compliant alternative is offered, and the dish is stored as rejected so future plans skip it.',
    run() {
      const steps: string[] = [];
      const req = saturday();
      const r = planWeek(req);
      if (r.status !== 'ok') return { pass: false, detail: `Plan status was ${r.status}`, steps };
      steps.push(`Saturday plan: ${list(r.meals)}`);
      const target = r.meals[0];
      steps.push(`User flags ${target.day} ${name(target.dishId)}: “A food I avoid” (e.g. the curry paste has an ingredient they avoid that the recipe doesn’t list)`);
      const step = declineAndReplace(req, r.meals, target.day, { kind: 'constraint', detail: 'avoidance' });
      steps.push(`Basil: “${step.out.message}”`);
      let pass = true;
      pass = check(steps, step.out.meals.some((m) => m.dishId === step.declined) ? ['Flagged dish is still in the plan'] : [], 'Removed from the plan straight away') && pass;
      const defends = /\b(actually|but it|it’s safe|is safe|fits your rules|are you sure|reconsider)\b/i.test(step.out.message);
      pass = check(steps, defends ? ['Agent argued for the dish'] : [], 'Agent accepts the flag without defending the dish') && pass;
      if (!step.choice) return { pass: false, detail: 'No compliant alternative offered', steps };
      const offerMeals = step.out.offers.map((o) => ({ day: target.day, dishId: o.id, have: [], missing: [], reasons: [], notes: [] }));
      pass = check(steps, complianceProblems(step.nextReq, offerMeals), `Compliant alternatives offered: ${step.out.offers.map((o) => o.name).join(', ')}`) && pass;
      steps.push(`User picks ${step.choice.name}`);
      const stored = step.out.learned.flagged[step.declined];
      pass = check(steps, stored ? [] : ['Flag was not stored'], `Stored as rejected: “${stored?.detail}”`) && pass;
      const nextWeek = planWeek(saturday(step.out.learned));
      if (nextWeek.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions next week', steps };
      const reappears = nextWeek.meals.some((m) => m.dishId === step.declined);
      const reason = nextWeek.excluded.find((e) => e.dishId === step.declined)?.reason;
      steps.push(`Next Saturday’s plan: ${list(nextWeek.meals)}`);
      pass = check(steps, reappears ? ['Flagged dish came back next week'] : [], `Not recommended next week (${reason})`) && pass;
      return { pass, detail: `${name(step.declined)} removed, replaced by ${step.choice.name}, excluded next week`, steps };
    },
  },
  {
    id: 'T4',
    title: 'Time or complexity failure: dish too hard for 30 minutes',
    expectation:
      'The dish is marked unsuitable for these limits, a simpler compliant alternative is offered, the recipe’s time and effort are corrected for the future, and the cart is recalculated.',
    run() {
      const steps: string[] = [];
      const req = saturday();
      const r = planWeek(req);
      if (r.status !== 'ok') return { pass: false, detail: `Plan status was ${r.status}`, steps };
      steps.push(`Saturday plan: ${list(r.meals)}`);
      // Pick the most demanding dinner in the plan: the one most likely to run over.
      const target = [...r.meals].sort((a, b) => {
        const da = DISHES.find((d) => d.id === a.dishId)!;
        const db = DISHES.find((d) => d.id === b.dishId)!;
        return db.effort - da.effort || db.minutes - da.minutes;
      })[0];
      const orig = DISHES.find((d) => d.id === target.dishId)!;
      steps.push(`User flags ${target.day} ${orig.name} (listed ${orig.minutes} min, effort ${orig.effort}/3): “Too long or too complex for me”`);
      const cartBefore = buildCart(r.meals);
      const step = declineAndReplace(req, r.meals, target.day, { kind: 'too_complex' });
      steps.push(`Basil: “${step.out.message}”`);
      let pass = true;
      const o = step.out.learned.overrides[orig.id];
      pass = check(steps, o ? [] : ['Recipe metadata was not updated'], `Recipe corrected: now ${o?.minutes} min, effort ${o?.effort}/3`) && pass;
      if (!step.choice) return { pass: false, detail: 'No simpler alternative offered', steps };
      const notSimpler = step.out.offers.filter((d) => !(d.effort < orig.effort || d.minutes < orig.minutes)).map((d) => `${d.name} isn’t simpler`);
      pass = check(steps, notSimpler, `Simpler alternatives offered: ${step.out.offers.map((d) => `${d.name} (${d.minutes} min, effort ${d.effort})`).join(', ')}`) && pass;
      const offerMeals = step.out.offers.map((d) => ({ day: target.day, dishId: d.id, have: [], missing: [], reasons: [], notes: [] }));
      pass = check(steps, complianceProblems(step.nextReq, offerMeals), 'All offers still meet every rule') && pass;
      steps.push(`User picks ${step.choice.name}`);
      const cartAfter = buildCart(step.nextMeals);
      steps.push(`Cart recalculated: ${cartBefore.length} → ${cartAfter.length} items`);
      pass = check(steps, cartProblems(step.nextReq, step.nextMeals, cartAfter), 'Cart matches the updated plan') && pass;
      const nextWeek = planWeek(saturday(step.out.learned));
      if (nextWeek.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions next week', steps };
      const back = nextWeek.meals.some((m) => m.dishId === orig.id);
      pass = check(steps, back ? [`${orig.name} was suggested again under the same limits`] : [], `Not suggested next week under the same limits`) && pass;
      return { pass, detail: `${orig.name} → ${step.choice.name}; recipe now ${o?.minutes} min`, steps };
    },
  },
  {
    id: 'T5',
    title: 'Preference-based swap: user just doesn’t fancy it',
    expectation:
      'The agent respects the choice without treating the dish as unsafe, replaces only that dinner, keeps the other four, and updates the cart.',
    run() {
      const steps: string[] = [];
      const req = saturday();
      const r = planWeek(req);
      if (r.status !== 'ok') return { pass: false, detail: `Plan status was ${r.status}`, steps };
      steps.push(`Saturday plan: ${list(r.meals)}`);
      let pass = check(steps, complianceProblems(req, r.meals), 'All five meet every formal rule');
      const target = r.meals[2];
      steps.push(`User declines ${target.day} ${name(target.dishId)}: “I just don’t fancy it”`);
      const step = declineAndReplace(req, r.meals, target.day, { kind: 'preference' });
      steps.push(`Basil: “${step.out.message}”`);
      const treatedUnsafe = step.out.learned.flagged[target.dishId] || step.out.learned.overrides[target.dishId] || /unsafe|not safe|breaks|allerg/i.test(step.out.message);
      pass = check(steps, treatedUnsafe ? ['Dish was treated as unsafe or invalid'] : [], 'Not treated as unsafe: no flag, no recipe change') && pass;
      if (!step.choice) return { pass: false, detail: 'No alternative offered', steps };
      steps.push(`User picks ${step.choice.name}`);
      const others = r.meals.filter((m) => m.day !== target.day);
      const changed = others.filter((m) => !step.nextMeals.some((n) => n.day === m.day && n.dishId === m.dishId)).map((m) => `${m.day} changed`);
      pass = check(steps, changed, 'The other four dinners are untouched') && pass;
      steps.push(`Final plan: ${list(step.nextMeals)}`);
      const cart = buildCart(step.nextMeals);
      pass = check(steps, cartProblems(step.nextReq, step.nextMeals, cart), `Cart updated: ${cart.length} items`) && pass;
      const nextWeek = planWeek(saturday(step.out.learned));
      const stillAllowed = nextWeek.status !== 'needs_clarification' && !nextWeek.excluded.some((e) => e.dishId === target.dishId);
      pass = check(steps, stillAllowed ? [] : ['Dish was blocked for future weeks'], `${name(target.dishId)} stays available for future weeks`) && pass;
      return { pass, detail: `${name(target.dishId)} → ${step.choice.name}, other four kept`, steps };
    },
  },
];

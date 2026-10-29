// Eval cases: E's Capstone test set (T1–T5) first, then extra safety checks from the PRD (E1–E10).
// Run in the app (Behind the scenes) or from the terminal with `npm run evals`.

import { DISHES } from '../data/dishes';
import { INGREDIENTS } from '../data/ingredients';
import { pantry } from '../data/pantries';
import { DEMO_PROFILE, Profile } from '../data/profile';
import { PlanRequest, PlanResult, knownInventory, planToPlate, planWeek } from './planner';
import { answerSubstitution, pendingQuestions, sendToStore } from './retailer';
import { SCENARIOS } from './scenarios';

export type EvalGroup = 'Capstone test set' | 'Extra safety checks';

export type EvalCase = {
  id: string;
  group: EvalGroup;
  kind: 'happy path' | 'edge case' | 'boundary case';
  title: string;
  expectation: string;
  run: () => { pass: boolean; detail: string; steps?: string[] };
};

const SCENARIO_KIND: Record<string, EvalCase['kind']> = { T1: 'happy path', T2: 'edge case', T3: 'boundary case', T4: 'boundary case', T5: 'edge case' };

function request(overrides: Partial<PlanRequest> & { pantryId?: string; profile?: Profile } = {}): PlanRequest {
  const { pantryId = 'stocked', ...rest } = overrides;
  return {
    profile: DEMO_PROFILE,
    inventory: pantry(pantryId).items,
    confirmations: {},
    energy: 'ok',
    maxMinutes: 30,
    history: {},
    rejected: [],
    ...rest,
  };
}

const names = (r: PlanResult) => (r.status === 'needs_clarification' ? [] : r.meals.map((m) => DISHES.find((d) => d.id === m.dishId)!.name));

function allergenFree(r: PlanResult, profile: Profile): boolean {
  if (r.status === 'needs_clarification') return true;
  const ids = [...r.meals.flatMap((m) => DISHES.find((d) => d.id === m.dishId)!.ingredients), ...r.cart.map((c) => c.ingredientId)];
  return ids.every((id) => !INGREDIENTS[id].allergens?.some((a) => profile.allergens.includes(a)) && !profile.avoid.includes(id));
}

const SAFETY_CHECKS: Omit<EvalCase, 'group'>[] = [
  {
    id: 'E1',
    kind: 'happy path',
    title: 'Well-stocked kitchen, some energy, 30 min',
    expectation: '5 dinners, all within limits, no allergens, cart has only missing items',
    run() {
      const req = request();
      const r = planWeek(req);
      if (r.status !== 'ok') return { pass: false, detail: `Status was ${r.status}` };
      const have = knownInventory(req.inventory, req.confirmations);
      const overTime = r.meals.filter((m) => DISHES.find((d) => d.id === m.dishId)!.minutes > 30);
      const dupes = r.cart.filter((c) => have.has(c.ingredientId));
      const pass = r.meals.length === 5 && overTime.length === 0 && dupes.length === 0 && allergenFree(r, req.profile);
      return { pass, detail: `${names(r).join(', ')}. Cart: ${r.cart.length} items.` };
    },
  },
  {
    id: 'E2',
    kind: 'boundary case',
    title: 'Low energy, 15-minute limit',
    expectation: 'Only low-effort dinners of 15 min or less; says so if fewer than 5 fit instead of breaking rules',
    run() {
      const r = planWeek(request({ energy: 'low', maxMinutes: 15 }));
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Asked unexpected questions' };
      const ok = r.meals.every((m) => {
        const d = DISHES.find((x) => x.id === m.dishId)!;
        return d.minutes <= 15 && d.effort === 1;
      });
      const honest = r.meals.length === 5 || (r.status === 'shortfall' && !!r.message);
      return { pass: ok && honest, detail: `${r.status}: ${names(r).join(', ')}` };
    },
  },
  {
    id: 'E3',
    kind: 'edge case',
    title: 'Blurry photo with unclear items',
    expectation: 'Agent stops and asks before planning',
    run() {
      const r = planWeek(request({ pantryId: 'unclear' }));
      return {
        pass: r.status === 'needs_clarification' && r.questions.length === 2,
        detail: r.status === 'needs_clarification' ? r.questions.map((q) => q.text).join(' / ') : `Planned without asking (${r.status})`,
      };
    },
  },
  {
    id: 'E4',
    kind: 'edge case',
    title: 'Unclear items answered (yogurt yes, chickpeas no)',
    expectation: 'Confirmed item counts as at home; denied item goes in the cart if needed',
    run() {
      const req = request({ pantryId: 'unclear', confirmations: { greek_yogurt: true, chickpeas: false } });
      const r = planWeek(req);
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Still asking' };
      const yogurtInCart = r.cart.some((c) => c.ingredientId === 'greek_yogurt');
      const chickpeaNeeded = r.meals.some((m) => m.missing.includes('chickpeas'));
      const chickpeaInCart = r.cart.some((c) => c.ingredientId === 'chickpeas');
      return {
        pass: !yogurtInCart && chickpeaNeeded === chickpeaInCart,
        detail: `Yogurt in cart: ${yogurtInCart ? 'yes' : 'no'}. Chickpeas in cart: ${chickpeaInCart ? 'yes' : 'no'}.`,
      };
    },
  },
  {
    id: 'E5',
    kind: 'boundary case',
    title: 'Allergy conflict (peanut, egg)',
    expectation: 'Peanut noodles and the frittata are excluded with a reason; nothing with peanut or egg in plan or cart',
    run() {
      const profile = { ...DEMO_PROFILE, allergens: ['peanut', 'shellfish', 'egg'] };
      const r = planWeek(request({ profile }));
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const peanut = r.excluded.find((e) => e.dishId === 'peanut_noodles');
      const egg = r.excluded.find((e) => e.dishId === 'egg_veg_frittata');
      return { pass: !!peanut && !!egg && allergenFree(r, profile), detail: `${peanut?.reason}; ${egg?.reason}` };
    },
  },
  {
    id: 'E6',
    kind: 'happy path',
    title: 'Ingredients already at home',
    expectation: 'Nothing the photo shows ends up in the cart',
    run() {
      const req = request();
      const r = planWeek(req);
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const have = knownInventory(req.inventory, req.confirmations);
      const dupes = r.cart.filter((c) => have.has(c.ingredientId)).map((c) => c.label);
      return { pass: dupes.length === 0, detail: dupes.length ? `Duplicates: ${dupes.join(', ')}` : `${have.size} items at home, none re-bought` };
    },
  },
  {
    id: 'E7',
    kind: 'boundary case',
    title: 'No suitable meal possible (vegan, 5 minutes)',
    expectation: 'Explains the limitation and asks the user to adjust; never fills the week with rule-breaking dishes',
    run() {
      const r = planWeek(request({ profile: { ...DEMO_PROFILE, diet: 'vegan' }, maxMinutes: 5 }));
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      return { pass: r.status === 'shortfall' && r.meals.length === 0 && r.cart.length === 0, detail: r.message ?? 'No message' };
    },
  },
  {
    id: 'E8',
    kind: 'edge case',
    title: 'Glucose feedback: a dish kept them out of range',
    expectation: 'That dish drops down the ranking, or carries a smaller-portion note if still chosen',
    run() {
      const base = planWeek(request());
      if (base.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const target = base.meals[0].dishId;
      const r = planWeek(request({ history: { [target]: [{ cooked: true, inRange: false }, { cooked: true, inRange: false }] } }));
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const after = r.meals.find((m) => m.dishId === target);
      const pass = !after || after.notes.length > 0;
      const name = DISHES.find((d) => d.id === target)!.name;
      return { pass, detail: after ? `${name} kept with note: “${after.notes[0]}”` : `${name} replaced` };
    },
  },
  {
    id: 'E9',
    kind: 'boundary case',
    title: 'Meat and fish stay occasional',
    expectation: 'At most 2 chicken, turkey or fish dinners a week; never red meat or shellfish',
    run() {
      const r = planWeek(request({ energy: 'good', pantryId: 'sparse' }));
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const proteins = r.meals.map((m) => DISHES.find((d) => d.id === m.dishId)!.protein);
      const animal = proteins.filter((p) => p !== 'plant').length;
      const banned = proteins.some((p) => p === 'red_meat' || p === 'shellfish');
      return { pass: animal <= 2 && !banned, detail: `${animal} meat/fish nights: ${names(r).join(', ')}` };
    },
  },
  {
    id: 'E10',
    kind: 'happy path',
    title: 'Plan-to-Plate score',
    expectation: '4 of 5 cooked counts as success (80%); 3 of 5 does not',
    run() {
      const a = planToPlate([true, true, false, true, true]);
      const b = planToPlate([true, false, false, true, true]);
      return { pass: a.success && !b.success, detail: `4/5 → ${Math.round(a.rate * 100)}% ✓, 3/5 → ${Math.round(b.rate * 100)}%` };
    },
  },
  {
    id: 'E11',
    kind: 'happy path',
    title: 'Demo store gets exactly the approved cart',
    expectation: 'Items the user removed and anything already at home never reach the store cart',
    run() {
      const req = request();
      const r = planWeek(req);
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const removed = [r.cart[0].ingredientId];
      const sent = sendToStore(r.cart, removed, req.profile);
      const have = knownInventory(req.inventory, req.confirmations);
      const ids = sent.lines.map((l) => l.ingredientId);
      const pass = !ids.includes(removed[0]) && ids.every((id) => !have.has(id)) && ids.length === r.cart.length - 1;
      return { pass, detail: `${r.cart.length} approved, 1 removed → ${ids.length} sent to ${sent.retailer}` };
    },
  },
  {
    id: 'E12',
    kind: 'edge case',
    title: 'Out of stock: no swap without the user’s OK',
    expectation: 'Out-of-stock items wait for a yes or no; yes swaps, no leaves it out',
    run() {
      const req = request();
      const r = planWeek(req);
      if (r.status === 'needs_clarification') return { pass: false, detail: 'Unexpected questions' };
      const sent = sendToStore(r.cart, [], req.profile);
      const asks = pendingQuestions(sent);
      if (asks.length < 2) return { pass: false, detail: `Expected 2 out-of-stock questions, got ${asks.length}` };
      const autoSwapped = sent.lines.some((l) => l.status === 'substituted');
      let cart = answerSubstitution(sent, asks[0].ingredientId, true);
      cart = answerSubstitution(cart, asks[1].ingredientId, false);
      const yes = cart.lines.find((l) => l.ingredientId === asks[0].ingredientId)!;
      const no = cart.lines.find((l) => l.ingredientId === asks[1].ingredientId)!;
      const pass = !autoSwapped && yes.status === 'substituted' && no.status === 'left_out' && pendingQuestions(cart).length === 0;
      return { pass, detail: `Asked about ${asks.map((a) => a.title).join(', ')}. Yes → ${yes.title}; no → left out` };
    },
  },
  {
    id: 'E13',
    kind: 'boundary case',
    title: 'Store suggests an unsafe substitute',
    expectation: 'A swap that contains one of the user’s allergens is never offered',
    run() {
      const profile = DEMO_PROFILE; // peanut allergy
      const cart = [{ ingredientId: 'pumpkin_seeds', label: 'Pumpkin seeds 150g', price: 1.5, forDishes: ['lentil_soup'] }];
      const sent = sendToStore(cart, [], profile);
      const line = sent.lines[0];
      const pass = line.status === 'left_out' && !line.substitute;
      return { pass, detail: line.note ?? line.status };
    },
  },
];

export const EVAL_CASES: EvalCase[] = [
  ...SCENARIOS.map((sc) => ({ ...sc, group: 'Capstone test set' as const, kind: SCENARIO_KIND[sc.id] })),
  ...SAFETY_CHECKS.map((c) => ({ ...c, group: 'Extra safety checks' as const })),
];

export function runEvals() {
  return EVAL_CASES.map((c) => {
    try {
      return { ...c, ...c.run() };
    } catch (e) {
      return { ...c, pass: false, detail: `Crashed: ${(e as Error).message}` };
    }
  });
}

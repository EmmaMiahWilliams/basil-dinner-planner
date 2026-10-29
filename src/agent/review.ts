// What happens when the user changes a dinner during plan review.
// Pure functions shared by the Plan screen and the T1–T5 test scenarios, so the tests exercise the real behaviour.

import { DISHES, Dish } from '../data/dishes';
import { DAYS, Learned, NO_LEARNING, PlanRequest, PlannedMeal, alternatives, effectiveDish, hardRuleViolation, mealFor } from './planner';

export type DeclineReason =
  /** Personal taste. Not a safety problem: the dish stays in the library for future weeks. */
  | { kind: 'preference' }
  /** The dish breaks one of the user's declared rules. Never suggested again. */
  | { kind: 'constraint'; detail: ConstraintDetail }
  /** Took longer or was harder than listed for the chosen time limit and energy. */
  | { kind: 'too_complex' };

/** What the user taps, and how the agent records it ("You flagged this: …"). */
export const CONSTRAINT_DETAILS = {
  allergen: { label: 'Something I’m allergic to', recorded: 'contains something you’re allergic to' },
  avoidance: { label: 'A food I avoid', recorded: 'contains a food you avoid' },
  dietary: { label: 'Doesn’t fit my dietary needs', recorded: 'doesn’t fit your dietary needs' },
  style: { label: 'Not my eating style', recorded: 'doesn’t fit your eating style' },
} as const;
export type ConstraintDetail = keyof typeof CONSTRAINT_DETAILS;

export type DeclineOutcome = {
  meals: PlannedMeal[];
  rejected: string[];
  learned: Learned;
  /** Compliant replacements for the freed day. */
  offers: Dish[];
  /** What Basil says back. Acknowledges the user's call and never argues for the dish. */
  message: string;
};

const baseDish = (id: string) => DISHES.find((d) => d.id === id)!;

/** Update what the agent remembers about a declined dish. */
export function learnFrom(learned: Learned, dishId: string, reason: DeclineReason, req: Pick<PlanRequest, 'maxMinutes'>): Learned {
  if (reason.kind === 'constraint') {
    return { ...learned, flagged: { ...learned.flagged, [dishId]: { detail: CONSTRAINT_DETAILS[reason.detail].recorded } } };
  }
  if (reason.kind === 'too_complex') {
    const d = effectiveDish(baseDish(dishId), learned);
    return {
      ...learned,
      overrides: {
        ...learned.overrides,
        [dishId]: { minutes: Math.max(d.minutes, req.maxMinutes) + 10, effort: Math.min(3, d.effort + 1) as 1 | 2 | 3 },
      },
    };
  }
  return learned;
}

/** Decline the dinner on `day`: it leaves the plan straight away, the lesson is recorded, and safe replacements are offered. */
export function declineMeal(req: PlanRequest, meals: PlannedMeal[], day: string, reason: DeclineReason): DeclineOutcome {
  const meal = meals.find((m) => m.day === day);
  if (!meal) throw new Error(`No dinner planned on ${day}`);
  const declined = effectiveDish(baseDish(meal.dishId), req.learned);
  const learned = learnFrom(req.learned ?? NO_LEARNING, meal.dishId, reason, req);
  const rejected = [...new Set([...req.rejected, meal.dishId])];
  const remaining = meals.filter((m) => m.day !== day);
  const nextReq: PlanRequest = { ...req, learned, rejected };
  const offers = alternatives(nextReq, remaining, 3, reason.kind === 'too_complex' ? declined : undefined);

  const message = {
    preference: `No problem, I’ve taken ${declined.name} off ${day}. Nothing wrong with it, so it can come back another week. Pick something you’d rather have.`,
    constraint: `Thanks for telling me. I’ve removed ${declined.name} and I won’t suggest it again. Here are dinners that fit your rules.`,
    too_complex: `Got it. I’ve noted ${declined.name} takes more time and effort than I thought, so I won’t suggest it for a ${req.maxMinutes}-minute night again. Here are simpler options.`,
  }[reason.kind];

  return { meals: remaining, rejected, learned, offers, message };
}

/** Put a chosen dish on a free day. Refuses anything that breaks a rule. */
export function chooseReplacement(req: PlanRequest, meals: PlannedMeal[], day: string, dishId: string): PlannedMeal[] {
  const d = effectiveDish(baseDish(dishId), req.learned);
  const why = hardRuleViolation(d, req);
  if (why) throw new Error(`${d.name} can’t go in the plan: ${why}`);
  if (meals.some((m) => m.dishId === dishId)) throw new Error(`${d.name} is already in the plan`);
  return [...meals.filter((m) => m.day !== day), mealFor(day, d, req)].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
}

/** Days of the week with no dinner planned. */
export function freeDays(meals: PlannedMeal[]): string[] {
  return DAYS.filter((day) => !meals.some((m) => m.day === day));
}

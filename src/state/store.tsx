// App state with on-device persistence. Stores only what the PRD's memory section allows:
// the declared profile, the week's plan and edits, cooked confirmations and glucose yes/no answers.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DishFeedback, Energy, Learned, NO_LEARNING, PlannedMeal } from '../agent/planner';
import { StoreCart } from '../agent/retailer';
import { Profile, withDefaults } from '../data/profile';

export type Week = {
  pantryId: string;
  confirmations: Record<string, boolean>;
  energy: Energy;
  maxMinutes: number;
  meals: PlannedMeal[];
  rejected: string[];
  /** Cart items the user removed from the draft. */
  cartRemoved: string[];
  planApproved: boolean;
  cartApproved: boolean;
  /** The draft cart as sent to the demo store, and the chosen delivery slot. */
  storeCart?: StoreCart;
  deliverySlot?: string;
  /** Per planned meal: did you cook it? */
  cooked: (boolean | null)[];
  /** Per planned meal: did it keep you within 70–140 mg/dL? */
  inRange: (boolean | null)[];
  /** Index of "today" in the demo week. */
  today: number;
};

export type PastWeek = { cooked: number; planned: number; endedAt: string };

export type AppState = {
  profile: Profile | null;
  week: Week | null;
  history: Record<string, DishFeedback[]>;
  pastWeeks: PastWeek[];
  /** Dishes the user flagged as breaking a rule, and corrected cooking times. Kept across weeks. */
  learned: Learned;
};

const EMPTY: AppState = { profile: null, week: null, history: {}, pastWeeks: [], learned: NO_LEARNING };
const KEY = 'dinner-planner/v1';

type Ctx = {
  state: AppState;
  ready: boolean;
  setProfile: (p: Profile) => void;
  setWeek: (w: Week | null) => void;
  setLearned: (l: Learned) => void;
  updateWeek: (fn: (w: Week) => Week) => void;
  recordFeedback: (dishId: string, fb: DishFeedback) => void;
  finishWeek: () => void;
  reset: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setState({ ...EMPTY, ...saved, profile: saved.profile ? withDefaults(saved.profile) : null, learned: { ...NO_LEARNING, ...saved.learned } });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      setProfile: (profile) => setState((s) => ({ ...s, profile })),
      setWeek: (week) => setState((s) => ({ ...s, week })),
      setLearned: (learned) => setState((s) => ({ ...s, learned })),
      updateWeek: (fn) => setState((s) => (s.week ? { ...s, week: fn(s.week) } : s)),
      recordFeedback: (dishId, fb) =>
        setState((s) => ({ ...s, history: { ...s.history, [dishId]: [...(s.history[dishId] ?? []), fb] } })),
      finishWeek: () =>
        setState((s) => {
          if (!s.week) return s;
          const cooked = s.week.cooked.filter((c) => c === true).length;
          return {
            ...s,
            week: null,
            pastWeeks: [...s.pastWeeks, { cooked, planned: s.week.meals.length, endedAt: new Date().toISOString() }],
          };
        }),
      reset: () => setState(EMPTY),
    }),
    [state, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

// App state with on-device persistence. Stores only what the PRD's memory section allows:
// the declared profile, the week's plan and edits, cooked confirmations and glucose yes/no answers.
// For the supervised pilot it also keeps an anonymous participant code, behavioural signals and the
// participant's own feedback, which leave the device only when they tap "Send to the pilot team".

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DishFeedback, Energy, Learned, NO_LEARNING, PlannedMeal } from '../agent/planner';
import { StoreCart } from '../agent/retailer';
import { Profile, withDefaults } from '../data/profile';
import { FeedbackResponse, PilotEvent, PilotEventInput, newParticipantId } from '../pilot/signals';

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
  /** Supervised pilot: anonymous code the Product Manager uses to match an export to a participant. */
  participantId: string;
  events: PilotEvent[];
  feedback: FeedbackResponse[];
};

const EMPTY: AppState = { profile: null, week: null, history: {}, pastWeeks: [], learned: NO_LEARNING, participantId: '', events: [], feedback: [] };
/** Cap so a long pilot can't grow storage without bound. */
const MAX_EVENTS = 2000;
const stamp = (e: PilotEventInput): PilotEvent => ({ ...e, at: new Date().toISOString() }) as PilotEvent;
const withEvent = (s: AppState, e: PilotEventInput): AppState => ({ ...s, events: [...s.events, stamp(e)].slice(-MAX_EVENTS) });
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
  logEvent: (e: PilotEventInput) => void;
  addFeedback: (f: Omit<FeedbackResponse, 'at'>) => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : {};
        setState({
          ...EMPTY,
          ...saved,
          profile: saved.profile ? withDefaults(saved.profile) : null,
          learned: { ...NO_LEARNING, ...saved.learned },
          participantId: saved.participantId || newParticipantId(),
        });
      })
      .catch(() => setState((s) => ({ ...s, participantId: s.participantId || newParticipantId() })))
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
          return withEvent(
            {
              ...s,
              week: null,
              pastWeeks: [...s.pastWeeks, { cooked, planned: s.week.meals.length, endedAt: new Date().toISOString() }],
            },
            { type: 'week_finished', cooked, planned: s.week.meals.length },
          );
        }),
      // Starting over clears the plan and profile but keeps the pilot record, so the PM still sees it.
      reset: () =>
        setState((s) => withEvent({ ...EMPTY, participantId: s.participantId, events: s.events, feedback: s.feedback }, { type: 'reset' })),
      logEvent: (e) => setState((s) => withEvent(s, e)),
      addFeedback: (f) => setState((s) => ({ ...s, feedback: [...s.feedback, { ...f, at: new Date().toISOString() }] })),
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

// Supervised-pilot instrumentation: the behavioural signals and one-click feedback the Product Manager
// reviews after each session. Everything stays on the participant's device until they choose to send
// their export file. No names, health readings, pantry photos or payment details are included.

export type PilotEvent = { at: string } & (
  | { type: 'screen'; screen: string }
  | { type: 'week_started'; pantryId: string; energy: string; maxMinutes: number }
  | { type: 'meal_rejected'; dishId: string; reason: string; detail?: string }
  | { type: 'plan_approved'; meals: number }
  | { type: 'allergen_alert'; where: 'plan_flagged' | 'cart' | 'store_substitute'; items: string[] }
  | { type: 'cart_approved'; items: number }
  | { type: 'checkout_reached' }
  | { type: 'video_opened'; dishId: string }
  /** In-app video: how much was watched before the participant moved on. */
  | { type: 'video_watched'; dishId: string; watchedSeconds: number; durationSeconds: number; completed: boolean }
  | { type: 'cooking_session'; dishId: string; stepReached: number; totalSteps: number; finished: boolean }
  | { type: 'meal_outcome'; dishId: string; cooked: boolean; inRange: boolean | null }
  | { type: 'week_finished'; cooked: number; planned: number }
  | { type: 'feedback_sent' }
  | { type: 'reset' }
  | { type: 'consent_given'; version: number }
);

type Dist<T, K> = T extends unknown ? Omit<T, K & keyof T> : never;
export type PilotEventInput = Dist<PilotEvent, 'at'>;

export type FeedbackResponse = {
  at: string;
  likedMost: string;
  likedLeast: string;
  improvements: [string, string, string];
  /** Which part of the app the participant had just used when they gave feedback. */
  after: string;
};

export type PilotExport = {
  kind: 'basil-pilot-export';
  version: 1;
  participantId: string;
  exportedAt: string;
  appVersion: string;
  feedback: FeedbackResponse[];
  events: PilotEvent[];
  summary: SignalSummary;
};

export type SignalSummary = {
  weeksStarted: number;
  plansApproved: number;
  cartsApproved: number;
  checkoutsReached: number;
  /** Weeks started that never reached an approved cart: the main workflow abandonment signal. */
  abandonedBeforeCart: number;
  mealsRejected: number;
  rejectionsByReason: Record<string, number>;
  allergenAlerts: number;
  videosOpened: number;
  /** In-app video views, and views stopped before 90% of the video. */
  videoViews: number;
  videoDropOffs: number;
  cookingSessions: number;
  /** Cooking sessions that stopped before the last step. A proxy for video/instruction drop-off. */
  cookingDropOffs: number;
  mealsCooked: number;
  mealsSkipped: number;
  outOfRangeMeals: number;
  planToPlate: { cooked: number; planned: number; rate: number | null };
  feedbackResponses: number;
};

export function newParticipantId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'P-';
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function summarize(events: PilotEvent[], feedback: FeedbackResponse[]): SignalSummary {
  const count = (t: PilotEvent['type']) => events.filter((e) => e.type === t).length;
  const rejectionsByReason: Record<string, number> = {};
  for (const e of events) if (e.type === 'meal_rejected') rejectionsByReason[e.reason] = (rejectionsByReason[e.reason] ?? 0) + 1;
  const sessions = events.filter((e): e is Extract<PilotEvent, { type: 'cooking_session' }> => e.type === 'cooking_session');
  const videos = events.filter((e): e is Extract<PilotEvent, { type: 'video_watched' }> => e.type === 'video_watched');
  const outcomes = events.filter((e): e is Extract<PilotEvent, { type: 'meal_outcome' }> => e.type === 'meal_outcome');
  const weeks = events.filter((e): e is Extract<PilotEvent, { type: 'week_finished' }> => e.type === 'week_finished');
  const cooked = weeks.reduce((s, w) => s + w.cooked, 0);
  const planned = weeks.reduce((s, w) => s + w.planned, 0);
  const weeksStarted = count('week_started');
  const cartsApproved = count('cart_approved');
  return {
    weeksStarted,
    plansApproved: count('plan_approved'),
    cartsApproved,
    checkoutsReached: count('checkout_reached'),
    abandonedBeforeCart: Math.max(0, weeksStarted - cartsApproved),
    mealsRejected: count('meal_rejected'),
    rejectionsByReason,
    allergenAlerts: count('allergen_alert'),
    videosOpened: count('video_opened'),
    videoViews: videos.length,
    videoDropOffs: videos.filter((v) => !v.completed).length,
    cookingSessions: sessions.length,
    cookingDropOffs: sessions.filter((s) => !s.finished).length,
    mealsCooked: outcomes.filter((o) => o.cooked).length,
    mealsSkipped: outcomes.filter((o) => !o.cooked).length,
    outOfRangeMeals: outcomes.filter((o) => o.inRange === false).length,
    planToPlate: { cooked, planned, rate: planned ? cooked / planned : null },
    feedbackResponses: feedback.length,
  };
}

export function buildExport(participantId: string, events: PilotEvent[], feedback: FeedbackResponse[], appVersion: string): PilotExport {
  return {
    kind: 'basil-pilot-export',
    version: 1,
    participantId,
    exportedAt: new Date().toISOString(),
    appVersion,
    feedback,
    events,
    summary: summarize(events, feedback),
  };
}

export function isPilotExport(x: unknown): x is PilotExport {
  return !!x && typeof x === 'object' && (x as PilotExport).kind === 'basil-pilot-export' && Array.isArray((x as PilotExport).events);
}

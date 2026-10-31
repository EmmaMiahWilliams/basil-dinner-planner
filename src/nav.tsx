// Tiny stack navigator: enough for a linear, low-distraction flow without extra native dependencies.

import { ReactNode, createContext, useContext, useState } from 'react';
import { Energy } from './agent/planner';

export type CheckIn = { pantryId: string; energy: Energy; maxMinutes: number; confirmations: Record<string, boolean>; myItems?: string[] };

export type Route =
  | { name: 'triage'; mode: 'first' }
  | { name: 'triage'; mode: 'edit'; step: TriageStep }
  | { name: 'baseline'; mode: 'saturday' | 'view' }
  | { name: 'home' }
  | { name: 'checkin' }
  | { name: 'thinking'; checkIn: CheckIn }
  | { name: 'clarify'; checkIn: CheckIn }
  | { name: 'plan' }
  | { name: 'cart' }
  | { name: 'store'; stage: 'sending' | 'store' }
  | { name: 'cook'; index: number }
  | { name: 'progress' }
  | { name: 'evals' }
  | { name: 'feedback'; after: string }
  | { name: 'consent' };

export type TriageStep = 'name' | 'diet' | 'needs' | 'allergens' | 'avoid' | 'preferred' | 'timing' | 'activity' | 'goals';

type Nav = { route: Route; go: (r: Route) => void; replace: (r: Route) => void; back: () => void; home: () => void };

const NavContext = createContext<Nav | null>(null);

export function NavProvider({ initial, children }: { initial: Route; children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([initial]);
  const nav: Nav = {
    route: stack[stack.length - 1],
    go: (r) => setStack((s) => [...s, r]),
    replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    home: () => setStack([{ name: 'home' }]),
  };
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav outside NavProvider');
  return ctx;
}

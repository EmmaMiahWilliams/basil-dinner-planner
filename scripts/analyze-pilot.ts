/// <reference types="node" />
// Supervised pilot: turn participants' export files into one evidence report for the Product Manager
// and Claude Code. Usage: npm run pilot:report -- [folder] (default: pilot-data/)
// Each export is cumulative, so only the newest file per participant code is used.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DISHES } from '../src/data/dishes';
import { PilotEvent, PilotExport, isPilotExport, summarize } from '../src/pilot/signals';

const SAFETY_WORDS = /allerg|reaction|anaphyla|unsafe|nut|gluten|sick|ill\b|hypo|hyper|glucose|sugar spike|dangerous|wrong food/i;

const dishName = (id: string) => DISHES.find((d) => d.id === id)?.name ?? id;

export function loadExports(dir: string): PilotExport[] {
  const latest = new Map<string, PilotExport>();
  for (const f of readdirSync(dir).filter((n: string) => n.endsWith('.json'))) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    } catch {
      console.warn(`Skipping ${f}: not valid JSON`);
      continue;
    }
    if (!isPilotExport(data)) continue;
    const prev = latest.get(data.participantId);
    if (!prev || prev.exportedAt < data.exportedAt) latest.set(data.participantId, data);
  }
  return [...latest.values()].sort((a, b) => a.participantId.localeCompare(b.participantId));
}

type Funnel = { started: number; planApproved: number; cartApproved: number; checkoutReached: number; lastScreenWhenAbandoned: Record<string, number> };

/** For each planning week, how far the participant got before the next week started (or the export ended). */
export function funnel(events: PilotEvent[]): Funnel {
  const f: Funnel = { started: 0, planApproved: 0, cartApproved: 0, checkoutReached: 0, lastScreenWhenAbandoned: {} };
  let week: { plan: boolean; cart: boolean; checkout: boolean; lastScreen: string } | null = null;
  const close = () => {
    if (!week) return;
    if (week.plan) f.planApproved++;
    if (week.cart) f.cartApproved++;
    if (week.checkout) f.checkoutReached++;
    if (!week.cart) f.lastScreenWhenAbandoned[week.lastScreen] = (f.lastScreenWhenAbandoned[week.lastScreen] ?? 0) + 1;
  };
  for (const e of events) {
    if (e.type === 'week_started') {
      close();
      f.started++;
      week = { plan: false, cart: false, checkout: false, lastScreen: 'plan' };
    } else if (week) {
      if (e.type === 'plan_approved') week.plan = true;
      if (e.type === 'cart_approved') week.cart = true;
      if (e.type === 'checkout_reached') week.checkout = true;
      if (e.type === 'screen' && !week.cart) week.lastScreen = e.screen;
    }
  }
  close();
  return f;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : 'n/a');
const cell = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim() || '_(blank)_';

export function buildReport(exports: PilotExport[]): string {
  const all = exports.flatMap((x) => x.events.map((e) => ({ ...e, pid: x.participantId })));
  const out: string[] = [];
  out.push('# Basil supervised pilot: evidence report', '');
  out.push(`Generated ${new Date().toISOString()} from ${exports.length} participant export(s).`, '');
  out.push('> Analyse this with the prompt in `docs/pilot-feedback-analysis.md`. Allergen and safety items always rank above preference or convenience requests.', '');

  // 1. Safety first
  out.push('## 1. Safety signals (review first)', '');
  const alerts = all.filter((e): e is Extract<PilotEvent, { type: 'allergen_alert' }> & { pid: string } => e.type === 'allergen_alert');
  const flaggedPlan = alerts.filter((a) => a.where === 'plan_flagged');
  out.push(`- Allergen alerts: **${alerts.length}** (planned dinner flagged by participant as containing an allergen: **${flaggedPlan.length}**, cart clashes caught: ${alerts.filter((a) => a.where === 'cart').length}, unsafe store substitutes blocked: ${alerts.filter((a) => a.where === 'store_substitute').length})`);
  for (const a of flaggedPlan) out.push(`  - ⚠️ ${a.pid} ${a.at.slice(0, 10)}: participant says **${a.items.map(dishName).join(', ')}** broke an allergy. The planner should never have offered it. Treat as P0.`);
  const outOfRange = all.filter((e) => e.type === 'meal_outcome' && e.inRange === false) as (Extract<PilotEvent, { type: 'meal_outcome' }> & { pid: string })[];
  out.push(`- Dinners reported outside 70–140 mg/dL: **${outOfRange.length}**${outOfRange.length ? ` (${tally(outOfRange.map((o) => dishName(o.dishId)))})` : ''}`);
  const safetyText = exports.flatMap((x) =>
    x.feedback.flatMap((f) => [f.likedMost, f.likedLeast, ...f.improvements].filter((t) => SAFETY_WORDS.test(t)).map((t) => `${x.participantId}: "${cell(t)}"`)),
  );
  out.push(`- Feedback mentioning a possible safety issue: **${safetyText.length}**`);
  for (const t of safetyText) out.push(`  - ${t}`);
  out.push('');

  // 2. Per participant
  out.push('## 2. Behaviour by participant', '');
  out.push('| Participant | Weeks started | Abandoned before cart | Meals rejected | Allergen alerts | Cooking drop-offs | Videos opened | Plan-to-Plate | Feedback |');
  out.push('|---|---|---|---|---|---|---|---|---|');
  for (const x of exports) {
    const s = summarize(x.events, x.feedback);
    const p2p = s.planToPlate.planned ? `${s.planToPlate.cooked}/${s.planToPlate.planned} (${pct(s.planToPlate.cooked, s.planToPlate.planned)})` : 'no week finished';
    out.push(`| ${x.participantId} | ${s.weeksStarted} | ${s.abandonedBeforeCart} | ${s.mealsRejected} | ${s.allergenAlerts} | ${s.cookingDropOffs}/${s.cookingSessions} | ${s.videosOpened} | ${p2p} | ${s.feedbackResponses} |`);
  }
  out.push('');

  // 3. Cohort
  const f = exports.map((x) => funnel(x.events)).reduce<Funnel>(
    (acc, g) => {
      for (const [k, n] of Object.entries(g.lastScreenWhenAbandoned)) acc.lastScreenWhenAbandoned[k] = (acc.lastScreenWhenAbandoned[k] ?? 0) + n;
      return { ...acc, started: acc.started + g.started, planApproved: acc.planApproved + g.planApproved, cartApproved: acc.cartApproved + g.cartApproved, checkoutReached: acc.checkoutReached + g.checkoutReached };
    },
    { started: 0, planApproved: 0, cartApproved: 0, checkoutReached: 0, lastScreenWhenAbandoned: {} },
  );
  const totals = summarize(all, exports.flatMap((x) => x.feedback));
  const metGoal = exports.filter((x) => {
    const s = summarize(x.events, []);
    return s.planToPlate.rate !== null && s.planToPlate.rate >= 0.8;
  }).length;
  out.push('## 3. Cohort signals', '');
  out.push(`- Workflow funnel: ${f.started} weeks started → ${f.planApproved} plans approved (${pct(f.planApproved, f.started)}) → ${f.cartApproved} carts approved (${pct(f.cartApproved, f.started)}) → ${f.checkoutReached} reached store checkout. Basil stops there; no purchase is ever made.`);
  if (Object.keys(f.lastScreenWhenAbandoned).length) out.push(`- Where abandoned weeks stopped: ${tally(Object.entries(f.lastScreenWhenAbandoned).flatMap(([k, n]) => Array(n).fill(k)))}`);
  out.push(`- Meals rejected: ${totals.mealsRejected} (${Object.entries(totals.rejectionsByReason).map(([k, n]) => `${k}: ${n}`).join(', ') || 'none'})`);
  const rejected = all.filter((e) => e.type === 'meal_rejected') as Extract<PilotEvent, { type: 'meal_rejected' }>[];
  if (rejected.length) out.push(`- Most-rejected dinners: ${tally(rejected.map((r) => dishName(r.dishId)))}`);
  const sessions = all.filter((e) => e.type === 'cooking_session') as Extract<PilotEvent, { type: 'cooking_session' }>[];
  const drops = sessions.filter((s) => !s.finished);
  out.push(`- Cooking-step drop-off: ${drops.length} of ${sessions.length} sessions stopped early (${pct(drops.length, sessions.length)})${drops.length ? `; ${drops.map((d) => `${dishName(d.dishId)} at step ${d.stepReached}/${d.totalSteps}`).join(', ')}` : ''}`);
  out.push(`- Cooking videos opened: ${totals.videosOpened}. These are still YouTube search placeholders, so watch-time drop-off can't be measured yet.`);
  out.push(`- Plan-to-Plate: ${totals.planToPlate.cooked}/${totals.planToPlate.planned} planned dinners cooked (${pct(totals.planToPlate.cooked, totals.planToPlate.planned)}); ${metGoal} of ${exports.length} participants hit the 80% goal.`);
  out.push('');

  // 4. Verbatim feedback
  out.push('## 4. Feedback, verbatim', '');
  out.push('| Participant | Date | After | Liked most | Liked least | Improvement 1 | Improvement 2 | Improvement 3 |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const x of exports)
    for (const r of x.feedback)
      out.push(`| ${x.participantId} | ${r.at.slice(0, 10)} | ${r.after} | ${cell(r.likedMost)} | ${cell(r.likedLeast)} | ${r.improvements.map(cell).join(' | ')} |`);
  out.push('');
  return out.join('\n');
}

function tally(xs: string[]): string {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`).join(', ');
}

if (process.argv[1]?.endsWith('analyze-pilot.ts')) {
  const dir = process.argv[2] ?? 'pilot-data';
  const exports = loadExports(dir);
  if (!exports.length) {
    console.error(`No Basil pilot exports found in ${dir}/. Put participants' basil-pilot-*.json files there.`);
    process.exit(1);
  }
  const outFile = join(dir, 'pilot-report.md');
  writeFileSync(outFile, buildReport(exports));
  console.log(`Wrote ${outFile} (${exports.length} participants)`);
}

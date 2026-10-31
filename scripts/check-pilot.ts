/// <reference types="node" />
// Self-check for the pilot feedback pipeline, on synthetic participants only. Run: npm run pilot:check
// Also writes scripts/fixtures/pilot-sample/pilot-report.md so you can see what the PM report looks like.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildReport, funnel, loadExports } from './analyze-pilot';
import { FeedbackResponse, PilotEvent, PilotEventInput, buildExport, summarize } from '../src/pilot/signals';

let t = Date.parse('2026-11-07T09:00:00Z');
const ev = (e: PilotEventInput): PilotEvent => ({ ...e, at: new Date((t += 60_000)).toISOString() }) as PilotEvent;
const fb = (likedMost: string, likedLeast: string, improvements: [string, string, string]): FeedbackResponse => ({
  at: new Date((t += 60_000)).toISOString(), likedMost, likedLeast, improvements, after: 'week_finished',
});

// P-AAAAA: completes a week, flags an allergen, drops off one cooking session.
const a = [
  ev({ type: 'week_started', pantryId: 'stocked', energy: 'low', maxMinutes: 20 }),
  ev({ type: 'screen', screen: 'plan' }),
  ev({ type: 'meal_rejected', dishId: 'salmon_traybake', reason: 'preference' }),
  ev({ type: 'meal_rejected', dishId: 'tofu_broccoli_stirfry', reason: 'constraint', detail: 'allergen' }),
  ev({ type: 'allergen_alert', where: 'plan_flagged', items: ['tofu_broccoli_stirfry'] }),
  ev({ type: 'plan_approved', meals: 5 }),
  ev({ type: 'cart_approved', items: 6 }),
  ev({ type: 'allergen_alert', where: 'store_substitute', items: ['pumpkin_seeds'] }),
  ev({ type: 'checkout_reached' }),
  ev({ type: 'video_opened', dishId: 'lentil_soup' }),
  ev({ type: 'cooking_session', dishId: 'lentil_soup', stepReached: 2, totalSteps: 5, finished: false }),
  ev({ type: 'cooking_session', dishId: 'egg_veg_frittata', stepReached: 4, totalSteps: 4, finished: true }),
  ev({ type: 'meal_outcome', dishId: 'egg_veg_frittata', cooked: true, inRange: false }),
  ev({ type: 'week_finished', cooked: 4, planned: 5 }),
];
// P-BBBBB: starts twice, abandons the first week on the plan screen.
const b = [
  ev({ type: 'week_started', pantryId: 'sparse', energy: 'medium', maxMinutes: 30 }),
  ev({ type: 'screen', screen: 'plan' }),
  ev({ type: 'week_started', pantryId: 'sparse', energy: 'medium', maxMinutes: 30 }),
  ev({ type: 'plan_approved', meals: 4 }),
  ev({ type: 'cart_approved', items: 9 }),
  ev({ type: 'week_finished', cooked: 2, planned: 4 }),
];

const checks: [string, boolean][] = [];
const sa = summarize(a, []);
checks.push(['allergen alerts counted', sa.allergenAlerts === 2]);
checks.push(['rejections split by reason', sa.rejectionsByReason.preference === 1 && sa.rejectionsByReason.constraint === 1]);
checks.push(['cooking drop-off counted', sa.cookingDropOffs === 1 && sa.cookingSessions === 2]);
checks.push(['Plan-to-Plate from finished weeks', sa.planToPlate.rate === 0.8]);
const fbB = funnel(b);
checks.push(['abandoned week found, with last screen', fbB.started === 2 && fbB.cartApproved === 1 && fbB.lastScreenWhenAbandoned.plan === 1]);
checks.push(['abandonment in summary', summarize(b, []).abandonedBeforeCart === 1]);

const dir = 'scripts/fixtures/pilot-sample';
mkdirSync(dir, { recursive: true });
const older = buildExport('P-AAAAA', a.slice(0, 3), [], '1.0.0');
older.exportedAt = '2000-01-01T00:00:00.000Z';
writeFileSync(join(dir, 'basil-pilot-P-AAAAA-old.json'), JSON.stringify(older));
writeFileSync(join(dir, 'basil-pilot-P-AAAAA.json'), JSON.stringify(buildExport('P-AAAAA', a, [fb('Not having to decide', 'Cooking steps too long', ['Shorter steps', 'Nut warning was scary', 'More fish'])], '1.0.0')));
writeFileSync(join(dir, 'basil-pilot-P-BBBBB.json'), JSON.stringify(buildExport('P-BBBBB', b, [fb('The cart', 'Too many questions | at the start', ['', 'Save favourites', ''])], '1.0.0')));
writeFileSync(join(dir, 'not-an-export.json'), '{"hello":1}');

const loaded = loadExports(dir);
checks.push(['newest export per participant, others ignored', loaded.length === 2 && loaded[0].events.length === a.length]);
const report = buildReport(loaded);
writeFileSync(join(dir, 'pilot-report.md'), report);
checks.push(['report leads with safety', report.indexOf('Safety signals') < report.indexOf('Behaviour by participant')]);
checks.push(['planner allergen miss flagged as P0', /Tofu.*P0|P0/.test(report) && report.includes('broke an allergy')]);
checks.push(['safety words in feedback surfaced', report.includes('Nut warning was scary')]);
checks.push(['pipes in free text cannot break the table', report.includes('Too many questions / at the start')]);
checks.push(['report never claims a purchase', report.includes('no purchase is ever made')]);

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const passed = checks.filter(([, ok]) => ok).length;
console.log(`\n${passed}/${checks.length} pilot pipeline checks passed`);
process.exit(passed === checks.length ? 0 : 1);

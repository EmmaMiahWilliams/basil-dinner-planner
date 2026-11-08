/// <reference types="node" />
// Self-check for the pantry photo limits and the Target hand-off. Run: npm run features:check

import { NO_LEARNING, buildCart, planWeek } from '../src/agent/planner';
import { buildTargetList, targetTotals } from '../src/agent/target';
import { INGREDIENTS } from '../src/data/ingredients';
import { inventoryFor } from '../src/data/pantries';
import { DEMO_PROFILE } from '../src/data/profile';
import { TARGET_PRODUCTS, targetUrl } from '../src/data/target';
import { MAX_PHOTOS_PER_WEEK, PhotoCycle, addPhoto, cycleEnded, cycleKey, emptyCycle, photosLeft, removePhoto } from '../src/state/photoRules';

const checks: [string, boolean][] = [];
const shot = (i: number, at = '2026-11-07T09:00:00Z') => ({ id: `p${i}`, uri: 'data:image/jpeg;base64,AAAA', at });

// Pantry photos
const key = cycleKey('P-TEST1', 0, true);
let c: PhotoCycle = emptyCycle(key);
for (let i = 0; i < MAX_PHOTOS_PER_WEEK; i++) c = addPhoto(c, shot(i))!;
checks.push(['5 photos can be added in a week', c.photos.length === 5 && photosLeft(c) === 0]);
checks.push(['a 6th photo is refused', addPhoto(c, shot(6)) === null]);
c = removePhoto(c, 'p0');
checks.push(['removing a photo does not give a slot back', c.photos.length === 4 && addPhoto(c, shot(7)) === null]);
checks.push(['photos kept within the week', !cycleEnded(c, key, new Date('2026-11-13T09:00:00Z'))]);
checks.push(['photos discarded 7 days after the first one', cycleEnded(c, key, new Date('2026-11-14T09:00:00Z'))]);
checks.push(['photos discarded when the week is finished', cycleEnded(c, cycleKey('P-TEST1', 1, true), new Date('2026-11-08T09:00:00Z'))]);
checks.push(['photos discarded on start over', cycleEnded(c, cycleKey('P-TEST1', 0, false), new Date('2026-11-08T09:00:00Z'))]);
checks.push(['photos discarded when leaving the pilot', cycleEnded(c, cycleKey('P-NEW22', 0, false), new Date('2026-11-08T09:00:00Z'))]);
checks.push(['new cycle starts empty with 5 slots', photosLeft(emptyCycle(key)) === 5]);

// Target hand-off
checks.push(['every ingredient has a Target search and USD guide', Object.keys(INGREDIENTS).every((id) => TARGET_PRODUCTS[id]?.search && TARGET_PRODUCTS[id].estimateUsd > 0)]);
const result = planWeek({
  profile: DEMO_PROFILE, inventory: inventoryFor('sparse').items, confirmations: {}, energy: 'ok', maxMinutes: 30, history: {}, rejected: [], learned: NO_LEARNING,
});
const cart = result.status === 'needs_clarification' ? [] : buildCart(result.meals);
const removed = cart.slice(0, 1).map((x) => x.ingredientId);
const list = buildTargetList(cart, removed, DEMO_PROFILE);
checks.push(['Target list has exactly the approved items', cart.length > 1 && list.lines.length === cart.length - 1 && !list.lines.some((l) => removed.includes(l.ingredientId))]);
checks.push(['every Target link goes to target.com only', list.lines.every((l) => l.url.startsWith('https://www.target.com/'))]);
checks.push(['every line asks to check the label for the user’s allergens', list.lines.every((l) => DEMO_PROFILE.allergens.every((a) => l.checkLabelFor.includes(a)))]);
checks.push(['unpinned prices are labelled as estimates', list.lines.every((l) => l.priceKind === 'estimate')]);
checks.push(['pinned product links to its product page', targetUrl({ search: 'x', estimateUsd: 1, tcin: '12345678' }) === 'https://www.target.com/p/-/A-12345678']);
const tot = targetTotals(list, [list.lines[0].ingredientId]);
checks.push(['totals count only what the shopper added', tot.added === 1 && Math.abs(tot.addedUsd - list.lines[0].usd) < 1e-9]);
checks.push(['the hand-off has no checkout or order state', list.status === 'handed_off' && !('order' in list)]);

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const passed = checks.filter(([, ok]) => ok).length;
console.log(`\n${passed}/${checks.length} photo and Target checks passed`);
process.exit(passed === checks.length ? 0 : 1);

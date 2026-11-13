/// <reference types="node" />
// Self-check for the pantry photo limits, the Target hand-off and the vetted cooking videos. Run: npm run features:check

import { NO_LEARNING, buildCart, planWeek } from '../src/agent/planner';
import { buildTargetList, targetTotals } from '../src/agent/target';
import { INGREDIENTS } from '../src/data/ingredients';
import { inventoryFor } from '../src/data/pantries';
import { DISHES } from '../src/data/dishes';
import { DEMO_PROFILE } from '../src/data/profile';
import { TARGET_PRODUCTS, targetUrl } from '../src/data/target';
import { DISH_VIDEOS, linkFor, parseVideoLink, videoFor } from '../src/data/videos';
import { applyReading, cleanReading, mergeReadings } from '../src/state/photoReading';
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

// Photo reading (what Claude saw, turned into ticks)
const ids = Object.keys(INGREDIENTS);
const r1 = cleanReading({ items: [{ id: 'chickpeas', confidence: 'sure' }, { id: 'eggs', confidence: 'unsure' }, { id: 'unicorn', confidence: 'sure' }, { id: 'chickpeas', confidence: 'unsure' }, 'junk'], other: ['ketchup', ' ketchup ', 3] }, ids);
checks.push(['unknown ids from Claude are dropped', !r1.sure.includes('unicorn') && !r1.unsure.includes('unicorn')]);
checks.push(['an item is never both sure and unsure', r1.sure.includes('chickpeas') && !r1.unsure.includes('chickpeas') && r1.unsure.includes('eggs')]);
checks.push(['"also spotted" is cleaned and de-duplicated', r1.other.length === 1 && r1.other[0] === 'ketchup']);
checks.push(['a broken reply reads as nothing found', JSON.stringify(cleanReading(null, ids)) === JSON.stringify({ sure: [], unsure: [], other: [] })]);
checks.push(['only sure items are ticked, nothing is unticked', JSON.stringify(applyReading(['tofu'], r1).sort()) === JSON.stringify(['chickpeas', 'tofu'])]);
const r2 = mergeReadings(r1, cleanReading({ items: [{ id: 'eggs', confidence: 'sure' }], other: [] }, ids));
checks.push(['sure in a later photo beats unsure in an earlier one', r2.sure.includes('eggs') && !r2.unsure.includes('eggs')]);

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

// Cooking videos
const dishIds = new Set(DISHES.map((d) => d.id));
for (const [id, v] of Object.entries(DISH_VIDEOS)) {
  checks.push([`video for ${id} belongs to a real dish`, dishIds.has(id)]);
  checks.push([`video link for ${id} can be read`, videoFor(id) !== null && v.title.trim().length > 0]);
}
const yt = (url: string) => { const v = parseVideoLink(url, 't'); return v && 'youtubeId' in v ? `${v.youtubeId}@${v.startSeconds ?? 0}` : null; };
checks.push(['watch links are read', yt('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ@0']);
checks.push(['short links with a start time are read', yt('https://youtu.be/dQw4w9WgXcQ?si=abc&t=1m30s') === 'dQw4w9WgXcQ@90']);
checks.push(['Shorts and phone links are read', yt('https://youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ@0' && yt('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=45') === 'dQw4w9WgXcQ@45']);
checks.push(['non-YouTube and broken links are refused', parseVideoLink('https://vimeo.com/123', 't') === null && parseVideoLink('PASTE LINK HERE', 't') === null && parseVideoLink('https://youtube.com/watch?v=short', 't') === null]);
checks.push(['dishes without a video fall back to a search', videoFor('no_such_dish') === null && linkFor(null, 'https://www.youtube.com/results?search_query=x').includes('search_query')]);
checks.push(['phone link keeps the start time', linkFor({ youtubeId: 'dQw4w9WgXcQ', title: 't', startSeconds: 90 }, '') === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s']);

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const passed = checks.filter(([, ok]) => ok).length;
console.log(`\n${passed}/${checks.length} photo, Target and video checks passed`);
process.exit(passed === checks.length ? 0 : 1);

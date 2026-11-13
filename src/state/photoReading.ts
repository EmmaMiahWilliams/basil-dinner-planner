// Rules for turning what Claude saw in a pantry photo into ticks on the check-in list. Pure functions so
// they can be checked without a phone or a network (scripts/check-features.ts).
//
// - Only ids Basil knows are kept. Anything else Claude names is shown as "also spotted", never ticked.
// - "sure" items are ticked for the participant, who can untick them. "unsure" items are only suggested:
//   the participant taps to add them, because a wrong tick could mean a missing ingredient on the night.
// - Across several photos, "sure" in any photo wins over "unsure" in another.

export type Confidence = 'sure' | 'unsure';
export type PhotoReading = { sure: string[]; unsure: string[]; other: string[] };
export const EMPTY_READING: PhotoReading = { sure: [], unsure: [], other: [] };

/** Cleans the function's raw reply. Unknown ids, bad shapes and duplicates are dropped. */
export function cleanReading(raw: unknown, knownIds: string[]): PhotoReading {
  const known = new Set(knownIds);
  const r = (raw ?? {}) as { items?: unknown; other?: unknown };
  const sure = new Set<string>();
  const unsure = new Set<string>();
  for (const it of Array.isArray(r.items) ? r.items : []) {
    const id = (it as { id?: unknown })?.id;
    const c = (it as { confidence?: unknown })?.confidence;
    if (typeof id !== 'string' || !known.has(id)) continue;
    if (c === 'sure') sure.add(id);
    else if (c === 'unsure') unsure.add(id);
  }
  for (const id of sure) unsure.delete(id);
  const other = [...new Set((Array.isArray(r.other) ? r.other : []).filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 10);
  return { sure: [...sure], unsure: [...unsure], other };
}

/** Combines the readings of several photos. */
export function mergeReadings(a: PhotoReading, b: PhotoReading): PhotoReading {
  const sure = [...new Set([...a.sure, ...b.sure])];
  const unsure = [...new Set([...a.unsure, ...b.unsure])].filter((id) => !sure.includes(id));
  const other = [...new Set([...a.other, ...b.other])].slice(0, 15);
  return { sure, unsure, other };
}

/** Ticks the "sure" items on top of what the participant already ticked. Never unticks anything. */
export function applyReading(ticked: string[], reading: PhotoReading): string[] {
  return [...new Set([...ticked, ...reading.sure])];
}

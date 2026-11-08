// Rules for the participant's own fridge and cupboard photos. Pure functions so they can be checked
// without a phone (scripts/check-features.ts).
//
// - Up to MAX_PHOTOS_PER_WEEK photos can be taken in one weekly planning cycle. Removing a photo does
//   not give a slot back, so the limit really is "5 per week".
// - A cycle starts with the first photo. It ends when the week's plan is finished, when the participant
//   starts over or leaves the pilot, or CYCLE_DAYS after it started, whichever comes first.
// - When a cycle ends, every photo in it is discarded.

export const MAX_PHOTOS_PER_WEEK = 5;
export const CYCLE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PantryPhotoShot = { id: string; uri: string; at: string };

export type PhotoCycle = {
  /** When the first photo of this cycle was taken. Null before any photo. */
  startedAt: string | null;
  /** Photos taken this cycle, including ones since removed. */
  taken: number;
  photos: PantryPhotoShot[];
  /**
   * Which weekly plan the photos belong to (see cycleKey). When the app's key moves on, for example
   * because the week was finished, the photos are discarded.
   */
  key: string;
};

export const emptyCycle = (key: string): PhotoCycle => ({ startedAt: null, taken: 0, photos: [], key });

/** Identifies the current planning cycle: changes when a week is finished, or the profile is reset or withdrawn. */
export function cycleKey(participantId: string, weeksFinished: number, hasProfile: boolean): string {
  return `${participantId}|${weeksFinished}|${hasProfile ? 'p' : '-'}`;
}

/** True when the cycle's photos must be thrown away. */
export function cycleEnded(c: PhotoCycle, currentKey: string, now: Date): boolean {
  if (c.key !== currentKey) return true;
  return !!c.startedAt && now.getTime() - new Date(c.startedAt).getTime() >= CYCLE_DAYS * DAY_MS;
}

export function photosLeft(c: PhotoCycle): number {
  return Math.max(0, MAX_PHOTOS_PER_WEEK - c.taken);
}

/** Adds a photo if the weekly limit allows. Returns null when the limit is reached. */
export function addPhoto(c: PhotoCycle, shot: PantryPhotoShot): PhotoCycle | null {
  if (photosLeft(c) === 0) return null;
  return { ...c, startedAt: c.startedAt ?? shot.at, taken: c.taken + 1, photos: [...c.photos, shot] };
}

export function removePhoto(c: PhotoCycle, id: string): PhotoCycle {
  return { ...c, photos: c.photos.filter((p) => p.id !== id) };
}

/** When the photos will be discarded at the latest, for showing to the participant. */
export function discardBy(c: PhotoCycle): Date | null {
  return c.startedAt ? new Date(new Date(c.startedAt).getTime() + CYCLE_DAYS * DAY_MS) : null;
}

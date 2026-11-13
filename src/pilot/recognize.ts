// Sends one pantry photo to the recognize-pantry Supabase Edge Function, which asks Claude what's in it.
// Falls back to "unavailable" (the participant ticks the list by hand, as before) whenever the backend
// is off, the participant isn't signed in, or the function isn't deployed or has no API key yet.

import { FunctionsHttpError } from '@supabase/supabase-js';
import { INGREDIENTS } from '../data/ingredients';
import { PhotoReading, cleanReading } from '../state/photoReading';
import { backend } from './backend';

export type Unavailable = 'local' | 'signed_out' | 'not_set_up' | 'busy' | 'unreadable' | 'offline';
export type ReadResult = { ok: true; reading: PhotoReading } | { ok: false; why: Unavailable };

/** Whether photo reading can even be tried in this build (the pilot backend is switched on). */
export const photoReadingPossible = !!backend;

export async function readPantryPhoto(dataUri: string): Promise<ReadResult> {
  if (!backend) return { ok: false, why: 'local' };
  const { data: s } = await backend.auth.getSession();
  if (!s.session) return { ok: false, why: 'signed_out' };
  const ingredients = Object.values(INGREDIENTS).map((i) => ({ id: i.id, name: i.name }));
  try {
    const { data, error } = await backend.functions.invoke('recognize-pantry', {
      body: { image: dataUri.replace(/^data:image\/jpeg;base64,/, ''), ingredients },
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const status = error.context?.status as number | undefined;
        if (status === 401) return { ok: false, why: 'signed_out' };
        if (status === 404 || status === 503) return { ok: false, why: 'not_set_up' };
        if (status === 429) return { ok: false, why: 'busy' };
        return { ok: false, why: 'unreadable' };
      }
      return { ok: false, why: 'offline' };
    }
    return { ok: true, reading: cleanReading(data, Object.keys(INGREDIENTS)) };
  } catch {
    return { ok: false, why: 'offline' };
  }
}

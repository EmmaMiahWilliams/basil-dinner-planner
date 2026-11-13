// Supabase Edge Function: reads one fridge or cupboard photo with Claude and returns which of Basil's
// ingredients it can see. The Anthropic API key lives here, as a Supabase secret, never in the app.
//
// Request (POST, signed-in pilot participant only):
//   { image: "<base64 JPEG>", ingredients: [{ id: "chickpeas", name: "Chickpeas (tin)" }, ...] }
// Response 200:
//   { items: [{ id: "chickpeas", confidence: "sure" | "unsure" }], other: ["ketchup", ...] }
// Errors: 401 not signed in, 400 bad request, 413 photo too big, 503 { error: "not_configured" }
// when ANTHROPIC_API_KEY isn't set, 502 when Claude couldn't read the photo.
//
// The photo is passed straight to Claude and never saved: no database row, no storage bucket, no log.
// Setup and deploy steps: docs/photo-recognition.md

import Anthropic from 'npm:@anthropic-ai/sdk@^1.8.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.118.0';

const MODEL = 'claude-opus-5-5';
/** About 1.5 MB of JPEG. The app resizes to 1280 px, which comes to ~100–300 KB. */
const MAX_IMAGE_CHARS = 2_000_000;
const MAX_INGREDIENTS = 200;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Wanted = { id: string; name: string };

const SYSTEM = `You look at one photo of someone's fridge, freezer or kitchen cupboard and say which food items from a fixed list you can see.

Rules:
- Only use ids from the list you are given. Never invent an id.
- "sure": you can clearly see the item, or its label names it.
- "unsure": something might be the item but you can't tell (blurry, half hidden, unlabeled tin or jar, could be something similar). The person will be asked to check, so when in doubt use "unsure" rather than "sure".
- Leave out items you can't see at all. An empty list is a fine answer.
- "other": up to 10 short names of other foods you can clearly see that are not in the list. Use plain everyday names.
- Ignore people, pets, faces, documents and anything that isn't food. Never describe them.`;

const SCHEMA = (ids: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['items', 'other'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'confidence'],
        properties: {
          id: { type: 'string', enum: ids },
          confidence: { type: 'string', enum: ['sure', 'unsure'] },
        },
      },
    },
    other: { type: 'array', items: { type: 'string' } },
  },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Only signed-in pilot participants. The anon key alone isn't enough, because it is public.
  const auth = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: user, error: authError } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (authError || !user?.user) return json(401, { error: 'not_signed_in' });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json(503, { error: 'not_configured' });

  let body: { image?: unknown; ingredients?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const image = typeof body.image === 'string' ? body.image.replace(/^data:image\/jpeg;base64,/, '') : '';
  if (!image || !/^[A-Za-z0-9+/=]+$/.test(image)) return json(400, { error: 'bad_image' });
  if (image.length > MAX_IMAGE_CHARS) return json(413, { error: 'image_too_big' });
  const wanted: Wanted[] = Array.isArray(body.ingredients)
    ? body.ingredients
        .filter((x): x is Wanted => !!x && typeof x.id === 'string' && typeof x.name === 'string' && /^[a-z0-9_]{1,40}$/.test(x.id))
        .slice(0, MAX_INGREDIENTS)
        .map((x) => ({ id: x.id, name: x.name.slice(0, 60) }))
    : [];
  if (!wanted.length) return json(400, { error: 'no_ingredients' });

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // A quick look at a photo, not a hard problem: keep it fast and cheap.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA(wanted.map((w) => w.id)) } },
      // If Claude Opus 5.5 declines, Anthropic retries on a suitable fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: `The list (id: name):\n${wanted.map((w) => `${w.id}: ${w.name}`).join('\n')}` },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return json(502, { error: 'unreadable' });
    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) return json(502, { error: 'unreadable' });
    const parsed = JSON.parse(text);
    return json(200, { items: parsed.items ?? [], other: parsed.other ?? [] });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: 'not_configured' });
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: 'busy' });
    console.error('recognize-pantry failed', e instanceof Anthropic.APIError ? e.status : 'unknown');
    return json(502, { error: 'unreadable' });
  }
});

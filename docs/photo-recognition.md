# Switching on photo reading

With this on, pilot participants can tick **Let Basil read my photos** in the Saturday check-in.
Each fridge or cupboard photo is sent once to Claude, which says which of Basil's ingredients it can
see. Items it sees clearly are ticked for the participant; items it isn't sure about are offered for
them to confirm.

Until you do these steps, nothing breaks: the check-in says photo reading isn't switched on yet, and
participants tick the list by hand as before. It also stays off in local mode (no sign-in) and for
anyone who isn't signed in.

About 15 minutes, all in a browser.

## 1. Get an Anthropic API key

1. Sign in at [console.anthropic.com](https://console.anthropic.com) and add a payment method under
   **Billing** (pay per use, roughly one or two cents per photo).
2. Under **Billing → Limits**, set a low monthly spend limit, for example $10. With 10 participants
   and at most 5 photos each a week, a month of the pilot is about 200 photos.
3. **API keys → Create key**, name it `basil-pilot-photos`, and copy it. You'll only see it once.

Never put this key in GitHub, the app, or a `.env` file that gets committed. It lives only in Supabase.

## 2. Add the key to Supabase

In the Supabase dashboard for the pilot project: **Edge Functions → Secrets → Add new secret**.
Name: `ANTHROPIC_API_KEY`, value: the key you copied. Save.

## 3. Deploy the function

**In the browser (no tools needed):**

1. **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `recognize-pantry`.
3. Replace the sample code with everything in
   [`supabase/functions/recognize-pantry/index.ts`](../supabase/functions/recognize-pantry/index.ts)
   and click **Deploy function**.
4. Leave **Verify JWT** switched on (the default).

**Or with the Supabase CLI**, from the repo folder:

```bash
npx supabase login
npx supabase link --project-ref gmpiktvtojhsnuaeszxe
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy recognize-pantry
```

## 4. Try it

Sign in to the live app as a pilot participant, start a Saturday check-in, choose **Tick what's in my
kitchen**, tick **Let Basil read my photos**, and take or pick a photo. Within a few seconds the
items it saw are ticked and a **From your photos** card shows what it found.

If it says photo reading isn't switched on, check that the function is named `recognize-pantry` and
the secret is named `ANTHROPIC_API_KEY`. **Edge Functions → recognize-pantry → Logs** shows errors
(it never logs the photo).

## What the function does with photos

- Only signed-in pilot participants can call it. The public anon key alone is refused.
- The photo goes straight to Anthropic's API and back. The function doesn't save it to the database,
  storage or its logs, and the pilot export only records how many items were spotted.
- Anthropic handles the photo under its commercial API terms. Check its current data-retention policy
  at [privacy.anthropic.com](https://privacy.anthropic.com) before the pilot starts, and tell
  participants if anything there matters to them.
- It uses Claude Opus 5.5 at low effort, and lets Anthropic retry on a fallback model if Claude
  declines a photo.

To switch photo reading off again, delete the `ANTHROPIC_API_KEY` secret. The app falls back to
manual ticking.

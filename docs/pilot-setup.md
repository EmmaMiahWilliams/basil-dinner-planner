# Switching on the pilot: sign-in, uploads and videos

Basil works without any of this (local mode: no sign-in, feedback sent as a file). These steps turn
on secure sign-in for the 10 invited participants and automatic upload of their pilot records.
About 20 minutes, all in a browser. Nothing here costs money on Supabase's free plan.

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project (any name, e.g. `basil-pilot`;
   pick a region near your participants and save the database password somewhere safe).
2. **SQL Editor → New query**: paste all of [`supabase/pilot.sql`](../supabase/pilot.sql) and click
   **Run**. This creates the `pilot_exports` table, where each participant can only ever read or
   change their own row.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Leave the
   **Email** provider on. Only people you invite can then sign in.
4. **Authentication → Emails → Magic Link** template: make sure it includes `{{ .Token }}` so the
   email shows the sign-in code, for example: `Your Basil sign-in code is {{ .Token }}`.
5. **Authentication → Users → Add user → Send invitation** (or **Create new user** with
   "Auto confirm" ticked) for each of the 10 participants' email addresses.

## 2. Connect the live site

The pilot project (`gmpiktvtojhsnuaeszxe`) is already wired into `src/pilot/backend.tsx`, so you can
skip this section. Use it only to point a build at a different project.

1. In Supabase, **Project Settings → API**: copy the **Project URL** and the **anon public** key.
2. In GitHub, **repo → Settings → Secrets and variables → Actions → Variables → New repository
   variable**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` with those values.
3. Re-run the deploy (Actions → "Deploy web app to GitHub Pages" → Run workflow), or push to main.
   The site now asks for consent, then sign-in, before anything else.

The anon key is meant to be public; row-level security is what keeps each participant's data
private. **Never** put the `service_role` key in GitHub or the app.

For phones with Expo Go, put the same two values in a local `.env` file as
`EXPO_PUBLIC_SUPABASE_URL=...` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=...` before `npm start`.

## 3. Collect the data (PM only)

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run pilot:pull
npm run pilot:report
```

Then follow [`docs/pilot-feedback-analysis.md`](pilot-feedback-analysis.md). Keep the list of which
email belongs to which pilot code private, and outside this repo.

If a participant leaves the pilot in the app, their uploaded row is deleted too. To delete someone
by hand: **Authentication → Users → Delete user** removes their account and their row.

## 4. Add the cooking videos

Open [`src/data/videos.ts`](../src/data/videos.ts) and add one line per dish, for example:

```ts
lentil_soup: { youtubeId: 'abc123XYZ00', title: 'Red lentil soup in 20 minutes' },
```

The id is the part after `v=` in a YouTube link. Before adding a video, watch it and check it cooks
the same dish with the same ingredients and adds no allergens that Basil's recipe doesn't have. On
the web app, videos play inside Basil and the pilot report shows where people stopped watching.
Dishes without a video still open a YouTube search.

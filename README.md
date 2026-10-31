# Basil: ADHD-friendly diabetes dinner planner (Capstone prototype, limited supervised pilot)

One Expo (React Native) codebase for iOS, Android and web. Everything runs on synthetic data; no real health records, grocery accounts or purchases.

## Status: limited supervised pilot, not a production launch

Basil is being piloted with 10 consenting relatives or friends while the Product Manager reviews every session. The app says so on the welcome and home screens. Participants keep control of every meal, swap, cart item and checkout: **Basil never completes checkout or buys anything.**

- **One-click feedback**: 💬 *Give feedback* (home screen and end of week) asks what they liked most, liked least, and the top three things to improve, then sends a file to the PM with their anonymous pilot code and behavioural signals (rejected meals, workflow abandonment, cooking-step drop-off, video opens, allergen alerts, Plan-to-Plate).
- **Analysis**: drop the files in `pilot-data/`, run `npm run pilot:report`, then use the Claude Code prompt in [`docs/pilot-feedback-analysis.md`](docs/pilot-feedback-analysis.md). Allergen and safety issues always rank first.
- **Still open before the pilot is complete** (pilot gates): secure onboarding and login, real pantry inputs (today: three synthetic pantry photos), real cooking videos (today: a YouTube search link), and explicit authorisation of a real grocery account (today: the pretend "Corner Market").

## The loop it proves (from the PRD)

1. **First-time triage** (before the planner ever runs): welcome, then 9 one-per-screen questions (name, eating style, diabetes-friendly aims and optional calorie target, allergies, foods to avoid, favourite dinners, dinner and reminder time, activity, goals), then a summary to confirm. This becomes the user's baseline. One tap skips it with the demo persona "Alex".
   **Saturday review**: "Plan my week" first shows the baseline and asks "has anything changed?". Any row can be changed on its own; removing an allergy asks for confirmation.
2. **Saturday check-in**: pick one of three fixed synthetic pantry photos, an energy level and a 15/20/30-minute limit.
3. **Agent plans** (observe → decide → act → check, shown on screen): filters the dish library by hard rules, scores by what's at home, preferences, fibre and past feedback, caps meat/fish at 2 nights, then re-checks every meal and cart item before handing back.
4. **Stops and asks** when the photo is unclear, and says so honestly when fewer than 5 dinners fit instead of bending rules.
5. **Plan review**: why each meal was chosen, what's at home, what's missing, "why not other dinners", weekly plant check, a portion-sized dessert. **Change this dinner** asks why, and each answer teaches the agent something different:
   - *I just don't fancy it*: swapped for this week only; the dish stays available for future weeks.
   - *It breaks one of my rules* (allergy, avoided food, dietary need, eating style): removed at once, never suggested again.
   - *Too long or too complex*: recipe time and effort are corrected, and only simpler dinners are offered.
   The freed night shows compliant replacements; the cart recalculates from the new plan.
6. **Draft cart**: only missing items; remove/put back; allergen re-check; approve.
   **Demo store hand-off** (`src/agent/retailer.ts`): the approved cart goes to a pretend online grocery store ("Corner Market", set in `src/data/store.ts`). Out-of-stock items wait for the user's yes/no on the store's substitute, and a substitute containing one of their allergens is never offered. The store cart has a delivery slot and totals and stops at checkout: no order is placed and no payment is taken.
7. **Dinner time**: reminder card, plate-portion picture, one step at a time, video link.
8. **"Did you cook this dinner?"** Yes/No, then glucose 70–140 mg/dL yes/no (not medical advice). Out-of-range feedback lowers that dish's ranking or adds a smaller-carb-portion note next week.
9. **Plan-to-Plate** score with celebration at 4 of 5 (80%) and milestones; last week's score shows on Saturday.

"Behind the scenes" on the home screen runs E's Capstone test set (T1–T5: happy path, dish swaps, constraint violation, time/complexity failure, preference swap) plus 10 extra safety checks, live. `npm run evals -- --steps` prints every step.

## Run it

```bash
npm install
npm run web        # browser
npm start          # scan the QR code with Expo Go on iOS/Android
npm run evals      # eval cases in the terminal
npm run typecheck
npm run pilot:check  # self-test of the pilot feedback pipeline (synthetic data)
npm run pilot:report # build the PM report from pilot-data/*.json
```

## Where things live

- `src/agent/planner.ts`: the planning agent (pure functions, deterministic)
- `src/agent/evals.ts`: PRD eval cases (happy path, edge, boundary)
- `src/data/`: synthetic dishes, ingredients/prices, pantry photos, demo profile
- `src/screens/`: app screens; `src/ui/`: theme and shared components
- `src/pilot/`: pilot signals, feedback and export; `scripts/analyze-pilot.ts`: the PM report

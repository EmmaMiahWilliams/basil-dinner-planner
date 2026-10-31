# Supervised pilot: feedback analysis with Claude Code

Basil is in a **limited, supervised pilot** with 10 consenting relatives or friends. It is not a
production launch. The Product Manager reviews every pilot session, and Basil never completes a
checkout or makes a purchase.

## The loop

1. **Collect.** After using Basil, each participant taps **💬 Give feedback** (home screen, or the
   end-of-week screen) and answers three questions: what they liked most, what they liked least, and
   the top three things to improve. When the pilot backend is on (see `docs/pilot-setup.md`),
   signed-in participants' records upload automatically a few seconds after anything new happens,
   and **Send my feedback** adds their answers. Without the backend, **Send my feedback** downloads a
   file on web, or opens the share sheet on a phone, so they can send it to the PM. Each record holds
   their answers, their anonymous pilot code (for example `P-7K3QX`) and these behavioural signals:

   | Signal | What is logged |
   |---|---|
   | Rejected meals | Each "Change this dinner", with the reason: preference, rule broken (allergen, avoided food, dietary need, eating style) or too complex |
   | Workflow abandonment | Weeks started vs plans approved vs carts approved vs store checkout reached, plus the last screen of an abandoned week |
   | Cooking drop-off | For each cooking session, how many steps were reached and whether it finished. For vetted in-app videos (web), how many seconds were watched and whether it was stopped before 90% |
   | Allergen alerts | A participant flagging a planned dinner as containing an allergen (a planner failure), cart clashes caught, and unsafe store substitutes blocked |
   | Plan-to-Plate | Dinners cooked out of dinners planned for each finished week (goal: 80%), and whether each dinner kept them in 70–140 mg/dL (yes/no only) |

   Names, profiles, pantry contents, exact glucose readings and payment details are never included.

2. **Combine.** Run `npm run pilot:pull` to download every signed-in participant's record into
   `pilot-data/` (or save emailed files there by hand), then run `npm run pilot:report`. It keeps the
   newest export per participant and writes `pilot-data/pilot-report.md`: safety signals first,
   then behaviour by participant, cohort signals and all feedback verbatim.

3. **Analyse.** Open Claude Code in this repo and paste the prompt below.

4. **Decide.** Review the draft list as PM, adjust it, and use it to decide what to fix or test next
   and whether the pilot is safe to continue or expand.

## Prompt for Claude Code

```text
Read pilot-data/pilot-report.md and the raw exports in pilot-data/*.json. You are helping the
Product Manager of Basil, a supervised pilot of a dinner planner for adults with diabetes and ADHD.

1. Find recurring themes in the feedback (liked most, liked least, top three improvements). For each
   theme give: a short name, how many participants raised it, 1–2 verbatim quotes with pilot codes,
   and whether it is a defect, a missing feature, or a preference.
2. Link each theme to the behavioural evidence: rejected meals and their reasons, workflow
   abandonment and where it happened, cooking-step drop-off, video opens, allergen alerts,
   out-of-range dinners and Plan-to-Plate. Say where feedback and behaviour agree or disagree.
3. Produce an initial prioritised list of features and defects. Score each on user impact,
   safety, frequency (participants affected) and effort (S/M/L, from reading the code in src/).
   Ranking rules, in order:
   - Any allergen or other safety issue is P0 and ranks above everything else, however few
     participants hit it. A participant flagging a planned dinner as containing an allergen means
     the planner's hard rules failed: find the cause in src/agent/.
   - Then issues that stop people completing the weekly loop (abandonment, Plan-to-Plate below 80%).
   - Then preference and convenience requests.
4. For the top five, propose the smallest fix or test to try next, and which signal would show it
   worked in the next pilot round.
5. List anything the evidence can't answer yet, and what to ask participants in their next session.

Do not change any code. Write the result to pilot-data/priorities.md.
```

## Rules that hold throughout the pilot

- Participants keep final control over every meal, substitution, cart item and checkout. Basil
  never purchases anything on their behalf.
- Allergen or safety reports are handled the same day, before any other feedback.
- Pilot exports stay out of the public repo (`pilot-data/` is git-ignored). Keep the mapping from
  pilot code to person somewhere private.

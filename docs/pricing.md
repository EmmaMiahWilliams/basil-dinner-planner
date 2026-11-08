# Basil Plus pricing

Recommendation, researched November 2026. All prices USD. Numbers live in `src/data/plans.ts`.

## Recommendation

| | Price | Why |
|---|---|---|
| Free trial | 7 days | 54% of Health & Fitness apps run 5 to 9 day trials, and one full Saturday-to-Friday week shows Basil's whole loop. |
| Intro price | **$2.99/month for the first 3 months** | Matches the cheapest meal planner (Mealime Pro, $2.99) and sits below mySugr Pro ($4.99), so it reads as an easy yes. |
| Target price | **$7.99/month** | Above single-purpose planners ($3 to $6) because Basil combines planning, diabetes-aware meals and a grocery cart, but under the Health & Fitness median (about $9.99). |
| Yearly | **$49.99/year** (about $4.17/month, 48% off monthly) | Close to the category annual median ($39.99) and Plan to Eat ($49). Annual plans keep far more people at 12 months. |

Free tier stays useful (weekly check-in, 5-dinner plan, cook mode, Plan-to-Plate score) so the paywall never blocks the core habit.

## Market evidence

**Comparable apps**

- Mealime Meal Planner Pro: $2.99/month ([App Store](https://apps.apple.com/US/app/id1079999103))
- Plan to Eat: $5.95/month or $49/year ([Plan to Eat help](https://learn.plantoeat.com/help/how-much-does-plan-to-eat-cost))
- mySugr PRO: $4.99/month or $39.99/year ([App Store](https://apps.apple.com/app/id516509211))

**Category benchmarks (Health & Fitness)**

- Median monthly price about $9.99 and annual about $39.94; trial-to-paid median 37.7%; about 30% of new payers come through intro offers ([RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps))
- Monthly median $9.70, annual $39.99; 12-month retention is 44.1% on annual plans versus 17.5% on monthly ([Airbridge category benchmark](https://www.airbridge.io/en/blog/subscription-app-pricing-by-category-2026-benchmark))
- Trial-to-paid 35.0%; annual plans earn 60.6% of category revenue; first-renewal retention 30.3% ([Adapty, State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions/))
- Higher-priced apps convert better (2.7 to 2.8% download-to-paid versus 1.4 to 1.5%) and earn about 5x more per payer than low-priced apps (RevenueCat, Airbridge). That is why the low price is an introductory offer, not the permanent price.

## Rough unit economics

At $7.99/month, after a 15% app store fee (small business programme), Basil nets about $6.79 per subscriber per month. During the intro months it nets about $2.54.

## Caveats

- Some RevenueCat figures came from a partially loaded page and should be checked against the full report before quoting them in the Capstone.
- The prototype uses demo billing only. Real billing would need App Store and Google Play in-app purchases (for example through RevenueCat) and a price test after launch.

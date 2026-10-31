// Review the five-dinner plan: why each meal was chosen, what's at home, what's missing.
// "Change this dinner" asks why, so the agent can learn the right lesson (T2–T5 in the test set).

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DAYS, DishFeedback, Learned, PlanRequest, alternatives, dishesFor, effectiveDish, hardRuleViolation } from '../agent/planner';
import { CONSTRAINT_DETAILS, ConstraintDetail, DeclineReason, chooseReplacement, declineMeal } from '../agent/review';
import { DESSERTS, Dish, dish } from '../data/dishes';
import { INGREDIENTS, PLANT_CHECK_GROUPS, ingredient } from '../data/ingredients';
import { inventoryFor } from '../data/pantries';
import { Profile } from '../data/profile';
import { useNav } from '../nav';
import { Week, useStore } from '../state/store';
import { Basil, Button, Card, Chip, H2, P, Row, Screen, TopBar } from '../ui/components';
import { colors, font, space } from '../ui/theme';

export function requestFrom(week: Week, profile: Profile, history: Record<string, DishFeedback[]>, learned?: Learned): PlanRequest {
  return {
    profile,
    inventory: inventoryFor(week.pantryId, week.myItems).items,
    confirmations: week.confirmations,
    energy: week.energy,
    maxMinutes: week.maxMinutes,
    history,
    rejected: week.rejected,
    learned,
  };
}

export function Plan() {
  const { state, updateWeek, setLearned, logEvent } = useStore();
  const nav = useNav();
  const week = state.week!;
  const profile = state.profile!;
  const req = requestFrom(week, profile, state.history, state.learned);
  const [open, setOpen] = useState<string | null>(week.meals[0]?.day ?? null);
  const [changing, setChanging] = useState<{ day: string; step: 'why' | 'rule' } | null>(null);
  const [offer, setOffer] = useState<{ day: string; message: string; offers: Dish[] } | null>(null);
  const [showWhyNot, setShowWhyNot] = useState(false);

  const allIngredients = week.meals.flatMap((m) => dish(m.dishId).ingredients);
  const plantCheck = PLANT_CHECK_GROUPS.map((g) => ({ ...g, covered: allIngredients.some((id) => INGREDIENTS[id].group === g.group) }));
  const excluded = dishesFor(state.learned)
    .map((d) => ({ d, why: hardRuleViolation(d, { ...req, rejected: [] }) }))
    .filter((x) => x.why);
  const dessert = DESSERTS.find((ds) => ds.ingredients.every((id) => !INGREDIENTS[id].allergens?.some((a) => profile.allergens.includes(a)) && !profile.avoid.includes(id)));
  const missingCount = new Set(week.meals.flatMap((m) => m.missing)).size;

  const decline = (day: string, reason: DeclineReason) => {
    const out = declineMeal(req, week.meals, day, reason);
    const dishId = week.meals.find((m) => m.day === day)?.dishId ?? '';
    logEvent({ type: 'meal_rejected', dishId, reason: reason.kind, detail: reason.kind === 'constraint' ? reason.detail : undefined });
    // A planned dinner the participant says contains an allergen is a safety signal for the PM, not a preference.
    if (reason.kind === 'constraint' && reason.detail === 'allergen') logEvent({ type: 'allergen_alert', where: 'plan_flagged', items: [dishId] });
    updateWeek((w) => ({ ...w, meals: out.meals, rejected: out.rejected }));
    setLearned(out.learned);
    setChanging(null);
    setOffer({ day, message: out.message, offers: out.offers });
  };
  const pick = (day: string, dishId: string) => {
    updateWeek((w) => ({ ...w, meals: chooseReplacement(req, w.meals, day, dishId) }));
    setOffer(null);
    setOpen(day);
  };
  const freeNight = (day: string) => {
    const here = offer?.day === day ? offer : null;
    return (
      <Card key={day} tone="peach">
        <H2>{day}: free night</H2>
        {here ? (
          <>
            <Basil say={here.message}>{here.message}</Basil>
            {here.offers.map((alt) => (
              <Button key={alt.id} kind="secondary" label={`${alt.emoji} ${alt.name} · ${alt.minutes} min`} onPress={() => pick(day, alt.id)} />
            ))}
            {here.offers.length === 0 ? <P soft>No other dinners fit your rules right now. You can keep this night for leftovers.</P> : null}
            <Button kind="ghost" label="Leave it free" onPress={() => setOffer(null)} />
          </>
        ) : (
          <Button
            kind="secondary"
            label="Pick a dinner"
            onPress={() => setOffer({ day, message: 'Here are dinners that fit your rules and use what you have.', offers: alternatives(req, week.meals) })}
          />
        )}
      </Card>
    );
  };

  const summary =
    week.meals.length === 0
      ? 'Nothing fits everything you told me. I won’t bend your rules, so let’s change the check-in.'
      : `Here are ${week.meals.length} dinners. You need ${missingCount} things from the shop. Tap any dinner to see why I picked it, or swap it.`;

  return (
    <Screen
      footer={
        week.meals.length > 0 ? (
          <Button
            label="Looks good, show my cart"
            onPress={() => {
              logEvent({ type: 'plan_approved', meals: week.meals.length });
              updateWeek((w) => ({ ...w, planApproved: true, cooked: w.meals.map(() => null), inRange: w.meals.map(() => null) }));
              nav.go({ name: 'cart' });
            }}
          />
        ) : (
          <Button label="Change my check-in" onPress={() => nav.replace({ name: 'checkin' })} />
        )
      }
    >
      <TopBar title="Your dinner plan" onBack={nav.home} />
      <Basil say={summary}>{summary}</Basil>

      {week.meals.length > 0 && week.meals.length < 5 && alternatives(req, week.meals).length === 0 ? (
        <Card tone="peach">
          <H2>Only {week.meals.length} dinners fit</H2>
          <P>I won’t bend your rules to fill the week. You could allow more time or energy, or keep the free nights for leftovers.</P>
          <Button kind="secondary" label="Change my check-in" onPress={() => nav.replace({ name: 'checkin' })} />
        </Card>
      ) : null}

      {DAYS.map((day) => {
        const m = week.meals.find((x) => x.day === day);
        if (!m) return freeNight(day);
        const d = effectiveDish(dish(m.dishId), state.learned);
        const expanded = open === m.day;
        return (
          <Card key={m.day} style={expanded ? { borderColor: colors.sage, borderWidth: 2 } : undefined}>
            <Pressable accessibilityRole="button" onPress={() => setOpen(expanded ? null : m.day)} style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <View style={{ width: 44, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.sage }}>{m.day.toUpperCase()}</Text>
                <Text style={{ fontSize: 28 }}>{d.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.large, fontWeight: '700', color: colors.ink }}>{d.name}</Text>
                <Text style={{ color: colors.inkSoft, fontSize: font.small }}>
                  ⏱ {d.minutes} min · ✓ {m.have.length} at home · 🛒 {m.missing.length} to buy
                </Text>
              </View>
              <Text style={{ color: colors.inkSoft, fontSize: 18 }}>{expanded ? '▴' : '▾'}</Text>
            </Pressable>
            {expanded ? (
              <View style={{ gap: space(3), marginTop: space(2) }}>
                <View>
                  <Text style={styles.label}>Why this one</Text>
                  <Row>
                    {m.reasons.map((r) => (
                      <Chip key={r} label={r} />
                    ))}
                  </Row>
                </View>
                {m.notes.map((n) => (
                  <Card key={n} tone="peach">
                    <P>💡 {n}</P>
                  </Card>
                ))}
                <View>
                  <Text style={styles.label}>Already at home</Text>
                  <P>{m.have.map((id) => `${ingredient(id).emoji} ${ingredient(id).name}`).join('   ') || 'Nothing yet'}</P>
                </View>
                <View>
                  <Text style={styles.label}>Missing (goes in your cart)</Text>
                  <P>{m.missing.map((id) => `${ingredient(id).emoji} ${ingredient(id).name}`).join('   ') || 'Nothing! You have it all.'}</P>
                </View>
                {changing?.day === m.day ? (
                  <ChangeDinner
                    step={changing.step}
                    onRule={() => setChanging({ day: m.day, step: 'rule' })}
                    onReason={(reason) => decline(m.day, reason)}
                    onCancel={() => setChanging(null)}
                  />
                ) : (
                  <Button kind="secondary" label="Change this dinner" onPress={() => setChanging({ day: m.day, step: 'why' })} />
                )}
              </View>
            ) : null}
          </Card>
        );
      })}

      {week.meals.length > 0 ? (
        <Card tone="sage">
          <H2>Plant check for the week</H2>
          <Row>
            {plantCheck.map((g) => (
              <Chip key={g.group} label={`${g.emoji} ${g.label}`} selected={g.covered} />
            ))}
          </Row>
          {plantCheck.some((g) => !g.covered) ? (
            <P soft>Not covered yet: {plantCheck.filter((g) => !g.covered).map((g) => g.label.toLowerCase()).join(', ')}. The dessert below can help.</P>
          ) : null}
        </Card>
      ) : null}

      {dessert ? (
        <Card tone="berry">
          <H2>
            {dessert.emoji} A sweet treat that fits: {dessert.name}
          </H2>
          <P>Portion: {dessert.portion}</P>
        </Card>
      ) : null}

      <Pressable onPress={() => setShowWhyNot(!showWhyNot)} accessibilityRole="button">
        <Text style={{ color: colors.sage, fontWeight: '700', fontSize: font.body }}>
          {showWhyNot ? '▾' : '▸'} Why not other dinners? ({excluded.length} ruled out)
        </Text>
      </Pressable>
      {showWhyNot
        ? excluded.map(({ d, why }) => (
            <Row key={d.id}>
              <Text style={{ fontSize: font.body, color: colors.ink }}>
                {d.emoji} {d.name}
              </Text>
              <Text style={{ fontSize: font.small, color: colors.danger }}>{why}</Text>
            </Row>
          ))
        : null}
    </Screen>
  );
}

/** Asks why the user wants a change, because each answer teaches the agent something different. */
function ChangeDinner({
  step,
  onRule,
  onReason,
  onCancel,
}: {
  step: 'why' | 'rule';
  onRule: () => void;
  onReason: (r: DeclineReason) => void;
  onCancel: () => void;
}) {
  if (step === 'rule') {
    return (
      <View style={{ gap: space(2) }}>
        <Text style={styles.label}>Which rule does it break?</Text>
        {(Object.keys(CONSTRAINT_DETAILS) as ConstraintDetail[]).map((k) => (
          <Button key={k} kind="secondary" label={CONSTRAINT_DETAILS[k].label} onPress={() => onReason({ kind: 'constraint', detail: k })} />
        ))}
        <Button kind="ghost" label="Cancel" onPress={onCancel} />
      </View>
    );
  }
  return (
    <View style={{ gap: space(2) }}>
      <Text style={styles.label}>What’s wrong with it?</Text>
      <Button kind="secondary" label="🙅 I just don’t fancy it" onPress={() => onReason({ kind: 'preference' })} />
      <Button kind="secondary" label="⚠️ It breaks one of my rules" onPress={onRule} />
      <Button kind="secondary" label="⏱ Too long or too complex for me" onPress={() => onReason({ kind: 'too_complex' })} />
      <Button kind="ghost" label="Keep it" onPress={onCancel} />
    </View>
  );
}

const styles = {
  label: { fontSize: 12, fontWeight: '800' as const, color: colors.inkSoft, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 },
};

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { planToPlate } from '../agent/planner';
import { dish } from '../data/dishes';
import { useNav } from '../nav';
import { useStore } from '../state/store';
import { FeedbackModal } from './Cook';
import { totals } from '../agent/retailer';
import { RETAILER } from '../data/store';
import { Basil, Button, Card, H1, H2, P, ProgressBar, Row, Screen } from '../ui/components';
import { colors, font, space } from '../ui/theme';

export function reminderTime(dinnerTime: string, minutesBefore: number): string {
  const [h, m] = dinnerTime.split(':').map(Number);
  const t = h * 60 + m - minutesBefore;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function Home() {
  const { state, reset } = useStore();
  const nav = useNav();
  const profile = state.profile!;
  const week = state.week;
  const lastWeek = state.pastWeeks[state.pastWeeks.length - 1];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Hi {profile.name} 👋</H1>
        <Pressable accessibilityRole="button" onPress={() => nav.go({ name: 'baseline', mode: 'view' })} hitSlop={10}>
          <Text style={{ color: colors.sage, fontWeight: '700', fontSize: font.body }}>Profile</Text>
        </Pressable>
      </Row>

      <PilotBanner />

      {!week ? <SaturdayStart lastWeek={lastWeek} /> : null}

      {week && !week.cartApproved ? (
        <>
          <Basil say="Your plan is waiting for you. Have a look when you’re ready.">Your plan is waiting for you. Have a look when you’re ready.</Basil>
          <Button label={week.planApproved ? 'Review your cart' : 'Review your plan'} onPress={() => nav.go({ name: week.planApproved ? 'cart' : 'plan' })} />
        </>
      ) : null}

      {week && week.cartApproved ? <ThisWeek /> : null}

      {week?.storeCart ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <P>
              {RETAILER.emoji} {RETAILER.name} cart: {totals(week.storeCart).items} items{week.deliverySlot ? ` · ${week.deliverySlot}` : ''}
            </P>
            <Pressable accessibilityRole="button" onPress={() => nav.go({ name: 'store', stage: 'store' })} hitSlop={8}>
              <Text style={{ color: colors.sage, fontWeight: '700', fontSize: font.body }}>Open</Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}

      <Card tone="sky">
        <P>💧 Keep a glass of water or green tea nearby today.</P>
      </Card>

      <Button
        kind="secondary"
        label="💬 Give feedback"
        onPress={() => nav.go({ name: 'feedback', after: !week ? 'home' : !week.cartApproved ? 'planning' : 'cooking_week' })}
      />

      <Row style={{ justifyContent: 'center', gap: space(6), marginTop: space(4) }}>
        <Pressable onPress={() => nav.go({ name: 'evals' })} hitSlop={8}>
          <Text style={{ color: colors.inkSoft, fontSize: font.small, textDecorationLine: 'underline' }}>Behind the scenes: agent tests</Text>
        </Pressable>
        <Pressable onPress={reset} hitSlop={8}>
          <Text style={{ color: colors.inkSoft, fontSize: font.small, textDecorationLine: 'underline' }}>Start over</Text>
        </Pressable>
      </Row>
    </Screen>
  );
}

/** Says plainly what this build is: a limited, supervised pilot, not a production launch. */
export function PilotBanner() {
  const { state } = useStore();
  return (
    <Card tone="berry">
      <Text style={{ fontSize: font.small, fontWeight: '800', color: colors.berry, letterSpacing: 0.5 }}>LIMITED SUPERVISED PILOT</Text>
      <P>
        You’re one of a small group testing Basil with the pilot team. You decide every meal, swap and cart item. Basil never checks out or pays for anything.
      </P>
      <P soft style={{ fontSize: font.small }}>
        Not medical advice. Pilot code {state.participantId}.
      </P>
    </Card>
  );
}

function SaturdayStart({ lastWeek }: { lastWeek?: { cooked: number; planned: number } }) {
  const nav = useNav();
  const score = lastWeek ? planToPlate(Array.from({ length: lastWeek.planned }, (_, i) => i < lastWeek.cooked)) : null;
  const line = 'It’s Saturday morning. Let’s plan five easy dinners together. It takes about two minutes.';
  return (
    <>
      {score ? (
        <Card tone={score.success ? 'sage' : 'peach'}>
          <H2>
            {score.success ? '🎉 ' : ''}Last week: {score.cooked} of {score.planned} dinners cooked
          </H2>
          <ProgressBar value={score.rate} color={score.success ? colors.sage : colors.peach} />
          <P soft>{score.success ? 'You hit your Plan-to-Plate goal. Brilliant.' : 'Every dinner you cooked counts. Let’s make this week a bit easier.'}</P>
        </Card>
      ) : null}
      <Basil say={line}>{line}</Basil>
      <Button label="Plan my week" onPress={() => nav.go({ name: 'baseline', mode: 'saturday' })} />
    </>
  );
}

function ThisWeek() {
  const { state } = useStore();
  const nav = useNav();
  const [askIndex, setAskIndex] = useState<number | null>(null);
  const week = state.week!;
  const profile = state.profile!;
  const done = week.today >= week.meals.length;
  const meal = done ? null : week.meals[week.today];
  const d = meal ? dish(meal.dishId) : null;
  const score = planToPlate(week.cooked.map((c) => c ?? undefined).filter((c) => c !== undefined));

  return (
    <>
      {d && meal ? (
        <Card tone="peach">
          <P soft>
            {meal.day} · reminder at {reminderTime(profile.dinnerTime, profile.reminderMinutesBefore)}
          </P>
          <H2>
            ⏰ Time to start {d.emoji} {d.name}
          </H2>
          <P soft>
            {d.minutes} minutes · dinner at {profile.dinnerTime}
          </P>
          <Button label="Let’s cook" onPress={() => nav.go({ name: 'cook', index: week.today })} />
        </Card>
      ) : (
        <Card tone="sage">
          <H2>That’s the week done!</H2>
          <Button label="See how it went" onPress={() => nav.go({ name: 'progress' })} />
        </Card>
      )}

      <Card>
        <H2>This week</H2>
        {week.meals.map((m, i) => {
          const status = week.cooked[i] === true ? '✅' : week.cooked[i] === false ? '➖' : i === week.today ? '👉' : '○';
          return (
            <Row key={m.day} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: font.body, color: colors.ink, flex: 1 }}>
                {status}  {m.day} · {dish(m.dishId).name}
              </Text>
              {week.inRange[i] != null ? <Text>{week.inRange[i] ? '👍' : '👎'}</Text> : null}
            </Row>
          );
        })}
        <View style={{ marginTop: space(2), gap: space(1) }}>
          <P soft>
            Plan-to-Plate so far: {score.cooked} of {week.meals.length} cooked
          </P>
          <ProgressBar value={score.cooked / week.meals.length} />
        </View>
      </Card>

      {!done ? (
        <Button kind="secondary" label="Demo: jump to after dinner" onPress={() => setAskIndex(week.today)} />
      ) : null}
      {askIndex !== null ? <FeedbackModal key={askIndex} index={askIndex} visible onClose={() => setAskIndex(null)} onDone={() => {}} /> : null}
    </>
  );
}

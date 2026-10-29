// Saturday check-in: photo of the kitchen, energy level, time limit. Three taps, then the agent runs.

import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { ENERGY_LABEL, Energy, TraceStep, planWeek } from '../agent/planner';
import { ingredient } from '../data/ingredients';
import { PANTRY_PHOTOS, pantry } from '../data/pantries';
import { CheckIn as CheckInData, useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, H2, P, Row, Screen, Segmented, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

export function CheckIn() {
  const nav = useNav();
  const [pantryId, setPantryId] = useState<string | null>(null);
  const [energy, setEnergy] = useState<Energy>('ok');
  const [maxMinutes, setMaxMinutes] = useState(30);

  return (
    <Screen
      footer={
        <Button
          label="Plan my week"
          disabled={!pantryId}
          onPress={() => nav.go({ name: 'thinking', checkIn: { pantryId: pantryId!, energy, maxMinutes, confirmations: {} } })}
        />
      }
    >
      <TopBar title="Saturday check-in" onBack={nav.back} />
      <Basil say="First, show me your fridge and cupboard. Pick one of the sample photos.">
        <Text style={{ fontWeight: '700' }}>1.</Text> Show me your fridge and cupboard. Pick a sample photo.
      </Basil>
      <View style={{ gap: space(3) }}>
        {PANTRY_PHOTOS.map((ph) => {
          const on = pantryId === ph.id;
          return (
            <Pressable
              key={ph.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setPantryId(ph.id)}
              style={{
                flexDirection: 'row',
                gap: space(3),
                alignItems: 'center',
                padding: space(3),
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: on ? colors.sage : colors.line,
                backgroundColor: on ? colors.sageSoft : colors.card,
              }}
            >
              <View style={{ backgroundColor: '#EDE7DC', borderRadius: radius.sm, padding: space(2), width: 150 }}>
                {ph.shelves.map((s, i) => (
                  <Text key={i} style={{ fontSize: 15, borderBottomWidth: 2, borderBottomColor: '#D6CCBC', textAlign: 'center' }}>
                    {s}
                  </Text>
                ))}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '700', fontSize: font.body, color: colors.ink }}>
                  {on ? '✓ ' : ''}
                  {ph.title}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: font.small }}>{ph.caption}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Basil say="How much energy do you have this week? Be honest, there's no wrong answer.">
        <Text style={{ fontWeight: '700' }}>2.</Text> How much energy do you have this week? No wrong answer.
      </Basil>
      <Segmented
        value={energy}
        onChange={setEnergy}
        options={[
          { value: 'low', label: '🪫 Low', sub: 'easiest only' },
          { value: 'ok', label: '🔋 Some', sub: 'a bit of chopping' },
          { value: 'good', label: '⚡ Good', sub: 'up for more' },
        ]}
      />
      <Basil say="And the longest you want to spend cooking on a weeknight?">
        <Text style={{ fontWeight: '700' }}>3.</Text> Longest you want to cook on a weeknight?
      </Basil>
      <Segmented
        value={maxMinutes}
        onChange={setMaxMinutes}
        options={[15, 20, 30].map((m) => ({ value: m, label: `${m} min` }))}
      />
    </Screen>
  );
}

/** Shows the agent's observe/decide/act/check loop step by step, then hands over to the result. */
export function Thinking({ checkIn }: { checkIn: CheckInData }) {
  const nav = useNav();
  const { state, setWeek } = useStore();
  const [shown, setShown] = useState<TraceStep[]>([]);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const result = planWeek({
      profile: state.profile!,
      inventory: pantry(checkIn.pantryId).items,
      confirmations: checkIn.confirmations,
      energy: checkIn.energy,
      maxMinutes: checkIn.maxMinutes,
      history: state.history,
      rejected: [],
      learned: state.learned,
    });
    const timers: ReturnType<typeof setTimeout>[] = [];
    result.trace.forEach((t, i) => timers.push(setTimeout(() => setShown((s) => [...s, t]), 450 + i * 650)));
    timers.push(
      setTimeout(() => {
        if (result.status === 'needs_clarification') {
          nav.replace({ name: 'clarify', checkIn });
          return;
        }
        setWeek({
          pantryId: checkIn.pantryId,
          confirmations: checkIn.confirmations,
          energy: checkIn.energy,
          maxMinutes: checkIn.maxMinutes,
          meals: result.meals,
          rejected: [],
          cartRemoved: [],
          planApproved: false,
          cartApproved: false,
          cooked: result.meals.map(() => null),
          inRange: result.meals.map(() => null),
          today: 0,
        });
        nav.replace({ name: 'plan' });
      }, 450 + result.trace.length * 650 + 900),
    );
    Animated.loop(Animated.sequence([Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(fade, { toValue: 0.3, duration: 700, useNativeDriver: true })])).start();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icon = { observe: '👀', decide: '🤔', act: '📝', check: '🛡️' };
  return (
    <Screen>
      <TopBar title="Planning" />
      <Animated.View style={{ alignSelf: 'center', opacity: fade, marginVertical: space(4) }}>
        <Text style={{ fontSize: 64 }}>🌿</Text>
      </Animated.View>
      <H2>Basil is planning your week…</H2>
      <P soft>
        {ENERGY_LABEL[checkIn.energy]} · up to {checkIn.maxMinutes} min · {pantry(checkIn.pantryId).title}
      </P>
      <View style={{ gap: space(2) }}>
        {shown.map((t, i) => (
          <Card key={i} style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 22 }}>{icon[t.phase]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.sage, textTransform: 'uppercase', letterSpacing: 1 }}>{t.phase}</Text>
              <P>{t.text}</P>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

/** The agent stopped because the photo was unclear. The user answers before anything is planned. */
export function Clarify({ checkIn }: { checkIn: CheckInData }) {
  const nav = useNav();
  const unsure = pantry(checkIn.pantryId).items.filter((i) => i.confidence === 'unsure');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const allAnswered = unsure.every((i) => answers[i.id] !== undefined);
  const line = 'Before I plan anything, I need to check a couple of things I couldn’t see clearly. I’d rather ask than guess.';

  return (
    <Screen
      footer={
        <Button
          label="Carry on planning"
          disabled={!allAnswered}
          onPress={() => nav.replace({ name: 'thinking', checkIn: { ...checkIn, confirmations: answers } })}
        />
      }
    >
      <TopBar title="Quick check" onBack={nav.back} />
      <Basil say={line}>{line}</Basil>
      {unsure.map((item) => (
        <Card key={item.id} tone="peach">
          <H2>
            {ingredient(item.id).emoji} {item.question}
          </H2>
          <Row>
            <Button style={{ flex: 1 }} kind={answers[item.id] === true ? 'primary' : 'secondary'} label="Yes" onPress={() => setAnswers({ ...answers, [item.id]: true })} />
            <Button style={{ flex: 1 }} kind={answers[item.id] === false ? 'primary' : 'secondary'} label="No / not sure" onPress={() => setAnswers({ ...answers, [item.id]: false })} />
          </Row>
        </Card>
      ))}
      <P soft>If you’re not sure, I’ll treat it as missing so you don’t end up without it.</P>
    </Screen>
  );
}

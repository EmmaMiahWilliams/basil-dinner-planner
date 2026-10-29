// End of week: Plan-to-Plate score, celebration at 80%, small milestones.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { planToPlate } from '../agent/planner';
import { dish } from '../data/dishes';
import { useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, H1, H2, P, ProgressBar, Row, Screen, TopBar } from '../ui/components';
import { colors, font, space } from '../ui/theme';

export function Progress() {
  const { state, finishWeek } = useStore();
  const nav = useNav();
  const week = state.week!;
  const score = planToPlate(week.cooked.map((c) => c === true));
  const pct = Math.round(score.rate * 100);
  let streak = 0;
  let best = 0;
  for (const c of week.cooked) {
    streak = c ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  const milestones = [
    { emoji: '🍳', label: 'First dinner cooked', done: score.cooked >= 1 },
    { emoji: '🔥', label: '3 nights in a row', done: best >= 3 },
    { emoji: '🏆', label: 'Plan-to-Plate goal (4 of 5)', done: score.success },
    { emoji: '📊', label: 'Logged glucose 3 times', done: week.inRange.filter((r) => r != null).length >= 3 },
  ];
  const line = score.success
    ? `You cooked ${score.cooked} of ${score.planned} planned dinners. That’s your Plan-to-Plate goal. I’m proud of you.`
    : `You cooked ${score.cooked} of ${score.planned} planned dinners. Next week I’ll make things a little easier.`;

  return (
    <Screen
      footer={
        <Button
          label="Done, see you Saturday"
          onPress={() => {
            finishWeek();
            nav.home();
          }}
        />
      }
    >
      <TopBar title="Your week" onBack={nav.back} />
      {score.success ? <Confetti /> : null}
      <View style={{ alignItems: 'center', gap: space(1) }}>
        <Text style={{ fontSize: 64, fontWeight: '900', color: score.success ? colors.sage : colors.peach }}>{pct}%</Text>
        <H1>Plan-to-Plate</H1>
      </View>
      <ProgressBar value={score.rate} color={score.success ? colors.sage : colors.peach} />
      <Basil say={line}>{line}</Basil>
      <Card>
        {week.meals.map((m, i) => (
          <Row key={m.day} style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: font.body, color: colors.ink, flex: 1 }}>
              {week.cooked[i] ? '✅' : '➖'} {m.day} · {dish(m.dishId).name}
            </Text>
            <Text>{week.inRange[i] == null ? '' : week.inRange[i] ? '👍 in range' : '👎 out of range'}</Text>
          </Row>
        ))}
      </Card>
      <H2>Milestones</H2>
      <Row>
        {milestones.map((ms) => (
          <Card key={ms.label} tone={ms.done ? 'sage' : undefined} style={{ width: '47%', alignItems: 'center', opacity: ms.done ? 1 : 0.45 }}>
            <Text style={{ fontSize: 30 }}>{ms.emoji}</Text>
            <Text style={{ textAlign: 'center', fontWeight: '700', color: colors.ink }}>{ms.label}</Text>
          </Card>
        ))}
      </Row>
      {week.inRange.some((r) => r === false) ? (
        <P soft>Next week I’ll suggest smaller carb portions for the dinners you marked 👎, or swap them out.</P>
      ) : null}
    </Screen>
  );
}

function Confetti() {
  const pieces = ['🎉', '✨', '🥦', '🎊', '🫐', '⭐', '🥕', '🎉'];
  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      90,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })),
    ).start();
  }, [anims]);
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'space-around', height: 40 }}>
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            fontSize: 26,
            opacity: anims[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [-30, 10] }) },
              { rotate: anims[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${i % 2 ? 200 : -200}deg`] }) },
            ],
          }}
        >
          {p}
        </Animated.Text>
      ))}
    </View>
  );
}

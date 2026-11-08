// Basil Plus paywall and plan management. Demo billing only: no card is taken and nothing is charged.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FREE_FEATURES, PLANS, PLUS_FEATURES, PlanId, TRIAL_DAYS, firstCharge, startTrial } from '../data/plans';
import { useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, H1, H2, P, Row, Screen, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export function Subscription() {
  const { state, setSubscription, logEvent } = useStore();
  const nav = useNav();
  const [plan, setPlan] = useState<PlanId>('monthly');
  const sub = state.subscription;

  if (sub && !sub.cancelled) {
    return (
      <Screen footer={<Button label="Done" onPress={nav.back} />}>
        <TopBar title="Basil Plus" onBack={nav.back} />
        <Basil>You’re on Basil Plus. Thanks for backing Basil.</Basil>
        <Card tone="sage">
          <H2>✅ Free trial active</H2>
          <P>
            {PLANS.find((p) => p.id === sub.plan)!.label} plan. Your trial runs until {day(sub.trialEndsAt)}.
          </P>
          <P soft>After that it would be {firstCharge(sub.plan)}. You can cancel any time before then.</P>
        </Card>
        <DemoNotice />
        <Button
          kind="ghost"
          label="Cancel subscription"
          onPress={() => {
            setSubscription({ ...sub, cancelled: true });
            logEvent({ type: 'subscription_cancelled', plan: sub.plan });
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label={`Start ${TRIAL_DAYS}-day free trial`}
          onPress={() => {
            setSubscription(startTrial(plan));
            logEvent({ type: 'subscription_started', plan });
          }}
        />
      }
    >
      <TopBar title="Basil Plus" onBack={nav.back} />
      <H1>Dinner, handled 🌿</H1>
      <Basil>Try everything free for {TRIAL_DAYS} days. Cancel any time before it ends and you won’t pay a thing.</Basil>

      {PLANS.map((p) => {
        const on = p.id === plan;
        return (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setPlan(p.id)}
            style={{
              borderWidth: 2,
              borderColor: on ? colors.sage : colors.line,
              backgroundColor: on ? colors.sageSoft : colors.card,
              borderRadius: radius.md,
              padding: space(4),
              gap: space(1),
            }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: font.large, fontWeight: '800', color: colors.ink }}>
                {on ? '◉' : '○'} {p.label}
              </Text>
              {p.badge ? (
                <Text
                  style={{
                    backgroundColor: colors.peachSoft,
                    color: colors.ink,
                    fontWeight: '700',
                    fontSize: font.small,
                    paddingHorizontal: space(2),
                    paddingVertical: 2,
                    borderRadius: radius.sm,
                  }}
                >
                  {p.badge}
                </Text>
              ) : null}
            </Row>
            <Text style={{ fontSize: font.title, fontWeight: '900', color: colors.ink }}>{p.price}</Text>
            <P soft>{p.sub}</P>
          </Pressable>
        );
      })}

      <Card>
        <H2>Basil Plus adds</H2>
        {PLUS_FEATURES.map((f) => (
          <P key={f}>✨ {f}</P>
        ))}
        <View style={{ height: space(2) }} />
        <P soft>Always free: {FREE_FEATURES.join(' · ')}</P>
      </Card>

      {sub?.cancelled ? <P soft>Your earlier trial was cancelled. You can start again whenever you like.</P> : null}
      <DemoNotice />
      <Button kind="ghost" label="Not now" onPress={nav.back} />
    </Screen>
  );
}

function DemoNotice() {
  return (
    <Card tone="berry">
      <Text style={{ fontSize: font.small, fontWeight: '800', color: colors.berry, letterSpacing: 0.5 }}>DEMO BILLING</Text>
      <P>This is a preview of pricing. No card is taken and nothing is charged during the pilot.</P>
    </Card>
  );
}

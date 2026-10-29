// First-time triage: one question per screen to set the user's baseline.
// The same steps are reused one at a time when the user amends an answer on a Saturday.

import { ReactNode, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { INGREDIENTS } from '../data/ingredients';
import {
  ALLERGEN_OPTIONS,
  AVOID_OPTIONS,
  CALORIE_OPTIONS,
  DEMO_PROFILE,
  GOAL_OPTIONS,
  NEED_OPTIONS,
  PREFERRED_OPTIONS,
  Profile,
} from '../data/profile';
import { TriageStep, useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, Chip, H1, H2, P, ProgressBar, Row, Screen, Segmented, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';
import { BaselineSummary } from './Baseline';

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const STEP_ORDER: TriageStep[] = ['name', 'diet', 'needs', 'allergens', 'avoid', 'preferred', 'timing', 'activity', 'goals'];

const BLANK: Profile = {
  ...DEMO_PROFILE,
  name: '',
  needs: [],
  calorieTarget: null,
  allergens: [],
  avoid: [],
  preferred: [],
  goals: [],
};

type StepDef = { say: string; hint?: string; body: ReactNode; valid?: boolean };

function stepContent(key: TriageStep, p: Profile, set: (patch: Partial<Profile>) => void): StepDef {
  switch (key) {
    case 'name':
      return {
        say: 'What should I call you?',
        valid: p.name.trim().length > 0,
        body: (
          <TextInput
            value={p.name}
            onChangeText={(name) => set({ name })}
            placeholder="Your first name"
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="Your first name"
            style={{ backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), fontSize: font.large, color: colors.ink }}
            autoFocus
          />
        ),
      };
    case 'diet':
      return {
        say: 'How do you like to eat?',
        hint: 'Plant-forward means mostly plants, with chicken, turkey or fish now and then. No red meat.',
        body: (
          <View style={{ gap: space(2) }}>
            {(
              [
                ['plant-forward', '🥦 Plant-forward', 'Mostly plants, some chicken, turkey or fish'],
                ['vegetarian', '🥚 Vegetarian', 'No meat or fish'],
                ['vegan', '🌱 Vegan', 'Plants only'],
              ] as const
            ).map(([value, label, sub]) => (
              <Option key={value} label={label} sub={sub} on={p.diet === value} onPress={() => set({ diet: value })} />
            ))}
          </View>
        ),
      };
    case 'needs':
      return {
        say: 'Which of these matter for how you manage your diabetes?',
        hint: 'Pick any that your care team has suggested. I use them to choose dinners, not to give medical advice.',
        body: (
          <View style={{ gap: space(4) }}>
            <Row>
              {NEED_OPTIONS.map((n) => (
                <Chip key={n} label={n} selected={p.needs.includes(n)} onPress={() => set({ needs: toggle(p.needs, n) })} />
              ))}
            </Row>
            <View style={{ gap: space(2) }}>
              <Text style={labelStyle}>Daily calorie target, if you have one</Text>
              <Row>
                {CALORIE_OPTIONS.map((c) => (
                  <Chip key={String(c)} label={c ? `${c.toLocaleString('en-GB')} kcal` : 'Not sure'} selected={p.calorieTarget === c} onPress={() => set({ calorieTarget: c })} />
                ))}
              </Row>
            </View>
          </View>
        ),
      };
    case 'allergens':
      return {
        say: 'Do you have any food allergies?',
        hint: 'These are hard rules. I will never put them in a dinner or your cart. Leave all unticked if you have none.',
        body: (
          <Row>
            {ALLERGEN_OPTIONS.map((a) => (
              <Chip key={a} label={a} tone="danger" selected={p.allergens.includes(a)} onPress={() => set({ allergens: toggle(p.allergens, a) })} />
            ))}
          </Row>
        ),
      };
    case 'avoid':
      return {
        say: 'Anything you’d rather not eat?',
        hint: 'Not allergies, just foods you don’t like or don’t want this season.',
        body: (
          <Row>
            {AVOID_OPTIONS.map((a) => (
              <Chip
                key={a}
                label={`${INGREDIENTS[a].emoji} ${INGREDIENTS[a].name}`}
                tone="peach"
                selected={p.avoid.includes(a)}
                onPress={() => set({ avoid: toggle(p.avoid, a) })}
              />
            ))}
          </Row>
        ),
      };
    case 'preferred':
      return {
        say: 'Which kinds of dinners do you enjoy?',
        hint: 'I’ll pick these more often.',
        body: (
          <Row>
            {PREFERRED_OPTIONS.map((a) => (
              <Chip key={a} label={a} selected={p.preferred.includes(a)} onPress={() => set({ preferred: toggle(p.preferred, a) })} />
            ))}
          </Row>
        ),
      };
    case 'timing':
      return {
        say: 'When do you usually eat dinner, and how early should I remind you to start cooking?',
        body: (
          <View style={{ gap: space(3) }}>
            <Text style={labelStyle}>Dinner time</Text>
            <Segmented value={p.dinnerTime} onChange={(dinnerTime) => set({ dinnerTime })} options={['17:30', '18:00', '18:30', '19:30'].map((t) => ({ value: t, label: t }))} />
            <Text style={labelStyle}>Remind me</Text>
            <Segmented
              value={p.reminderMinutesBefore}
              onChange={(reminderMinutesBefore) => set({ reminderMinutesBefore })}
              options={[30, 45, 60].map((m) => ({ value: m, label: `${m} min`, sub: 'before' }))}
            />
          </View>
        ),
      };
    case 'activity':
      return {
        say: 'How active are you on a normal day?',
        body: (
          <View style={{ gap: space(2) }}>
            {(
              [
                ['low', '🛋️ Mostly sitting', 'Desk work, little walking'],
                ['moderate', '🚶 Some movement', 'Walking, on my feet some of the day'],
                ['high', '🏃 Very active', 'Exercise most days or a physical job'],
              ] as const
            ).map(([value, label, sub]) => (
              <Option key={value} label={label} sub={sub} on={p.activity === value} onPress={() => set({ activity: value })} />
            ))}
          </View>
        ),
      };
    case 'goals':
      return {
        say: 'Last one. What would make the biggest difference for you right now?',
        body: (
          <Row>
            {GOAL_OPTIONS.map((g) => (
              <Chip key={g} label={g} selected={p.goals.includes(g)} onPress={() => set({ goals: toggle(p.goals, g) })} />
            ))}
          </Row>
        ),
      };
  }
}

function Option({ label, sub, on, onPress }: { label: string; sub: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ padding: space(4), borderRadius: radius.md, borderWidth: 2, borderColor: on ? colors.sage : colors.line, backgroundColor: on ? colors.sageSoft : colors.card }}
    >
      <Text style={{ fontSize: font.large, fontWeight: '700', color: colors.ink }}>
        {on ? '✓ ' : ''}
        {label}
      </Text>
      <Text style={{ fontSize: font.small, color: colors.inkSoft, marginTop: 2 }}>{sub}</Text>
    </Pressable>
  );
}

/** First-time flow: welcome, nine questions, then a summary to confirm. */
export function Triage() {
  const { setProfile } = useStore();
  const nav = useNav();
  const [p, setP] = useState<Profile>(BLANK);
  const [step, setStep] = useState(-1); // -1 welcome, STEP_ORDER.length = summary
  const [fromSummary, setFromSummary] = useState(false);
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch }));

  const save = (profile: Profile) => {
    const now = new Date().toISOString();
    setProfile({ ...profile, name: profile.name.trim(), createdAt: now, reviewedAt: now });
    nav.replace({ name: 'home' });
  };

  if (step === -1) {
    const line = 'Hi, I’m Basil. I help you plan five simple dinners each Saturday that fit your diabetes goals and your energy. First, a few quick questions so I know what works for you.';
    return (
      <Screen
        footer={
          <View style={{ gap: space(2) }}>
            <Button label="Let’s start" onPress={() => setStep(0)} />
            <Button kind="ghost" label="Skip with the demo profile (Alex)" onPress={() => save(DEMO_PROFILE)} />
          </View>
        }
      >
        <View style={{ alignItems: 'center', marginTop: space(8), gap: space(2) }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 52 }}>🌿</Text>
          </View>
          <H1>Dinner, sorted.</H1>
        </View>
        <Basil say={line}>{line}</Basil>
        <Card tone="sky">
          <P>⏱ 9 questions, about 2 minutes</P>
          <P>✏️ You can change any answer on a Saturday before you plan</P>
          <P>🔒 Stays on this device. No health records needed</P>
        </Card>
      </Screen>
    );
  }

  if (step === STEP_ORDER.length) {
    const line = `Thanks, ${p.name.trim()}. Here’s what I’ll use every week. Tap Change on anything that isn’t right.`;
    return (
      <Screen footer={<Button label="This is me, let’s go" onPress={() => save(p)} />}>
        <TopBar title="Your baseline" onBack={() => setStep(step - 1)} />
        <Basil say={line}>{line}</Basil>
        <BaselineSummary
          profile={p}
          onEdit={(key) => {
            setFromSummary(true);
            setStep(STEP_ORDER.indexOf(key));
          }}
        />
      </Screen>
    );
  }

  const key = STEP_ORDER[step];
  const content = stepContent(key, p, set);
  const optional = key !== 'name' && key !== 'diet' && key !== 'timing' && key !== 'activity';
  return (
    <Screen
      footer={
        <Button
          label={fromSummary ? 'Back to summary' : step === STEP_ORDER.length - 1 ? 'Review my answers' : 'Next'}
          disabled={content.valid === false}
          onPress={() => setStep(fromSummary ? STEP_ORDER.length : step + 1)}
        />
      }
    >
      <TopBar
        title={`Question ${step + 1} of ${STEP_ORDER.length}`}
        onBack={() => setStep(fromSummary ? STEP_ORDER.length : step - 1)}
        right={
          optional && !fromSummary ? (
            <Pressable onPress={() => setStep(step + 1)} hitSlop={10}>
              <Text style={{ color: colors.inkSoft, fontWeight: '600', textAlign: 'right' }}>Skip</Text>
            </Pressable>
          ) : undefined
        }
      />
      <ProgressBar value={(step + 1) / STEP_ORDER.length} />
      <Basil say={content.say}>{content.say}</Basil>
      <Card>{content.body}</Card>
      {content.hint ? <P soft>{content.hint}</P> : null}
    </Screen>
  );
}

/** Amend a single answer from the Saturday review. Removing an allergy asks for confirmation first. */
export function TriageEdit({ step }: { step: TriageStep }) {
  const { state, setProfile } = useStore();
  const nav = useNav();
  const before = state.profile!;
  const [p, setP] = useState<Profile>(before);
  const [confirming, setConfirming] = useState(false);
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch }));
  const content = stepContent(step, p, set);
  const removedAllergens = before.allergens.filter((a) => !p.allergens.includes(a));

  const save = () => {
    if (removedAllergens.length && !confirming) {
      setConfirming(true);
      return;
    }
    setProfile({ ...p, name: p.name.trim() });
    nav.back();
  };

  return (
    <Screen
      footer={
        confirming ? (
          <View style={{ gap: space(2) }}>
            <Button kind="danger" label={`Yes, remove ${removedAllergens.join(', ')}`} onPress={save} />
            <Button kind="ghost" label="Keep it as an allergy" onPress={() => { set({ allergens: [...p.allergens, ...removedAllergens] }); setConfirming(false); }} />
          </View>
        ) : (
          <Button label="Save" disabled={content.valid === false} onPress={save} />
        )
      }
    >
      <TopBar title="Change answer" onBack={nav.back} />
      <Basil say={content.say}>{content.say}</Basil>
      <Card>{content.body}</Card>
      {content.hint ? <P soft>{content.hint}</P> : null}
      {confirming ? (
        <Card tone="danger">
          <H2>Are you sure?</H2>
          <P>
            You’re removing {removedAllergens.join(', ')} from your allergies. From next week I may suggest dinners that contain {removedAllergens.length > 1 ? 'them' : 'it'}.
          </P>
        </Card>
      ) : null}
    </Screen>
  );
}

const labelStyle = { fontSize: 12, fontWeight: '800' as const, color: colors.inkSoft, textTransform: 'uppercase' as const, letterSpacing: 1 };

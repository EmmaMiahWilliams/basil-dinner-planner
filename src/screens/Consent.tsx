// Supervised pilot consent. Shown once before onboarding, and again from "Pilot & privacy" on the
// home screen, where the participant can also leave the pilot. Bump CONSENT_VERSION when the text
// changes so everyone is asked again.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNav } from '../nav';
import { deleteMyExport, signOut, useAuth } from '../pilot/backend';
import { useStore } from '../state/store';
import { Basil, Button, Card, H1, H2, P, Screen, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

export const CONSENT_VERSION = 1;

const AGREE = [
  'I’m taking part in a small, supervised test of Basil, not using a finished product.',
  'Basil is not medical advice. I’ll keep following my care team’s guidance.',
  'I choose every meal, swap and shopping item. Basil never checks out or pays for anything.',
  'The pilot team can see how I use Basil and the feedback I send, linked to a pilot code.',
];

export function Consent({ mode }: { mode: 'first' | 'view' }) {
  const { state, giveConsent, withdraw } = useStore();
  const auth = useAuth();
  const nav = useNav();
  const [ticks, setTicks] = useState<boolean[]>(AGREE.map(() => mode === 'view'));
  const [confirmLeave, setConfirmLeave] = useState(false);
  const all = ticks.every(Boolean);
  const line = 'Before we start, here’s what this pilot involves. It takes a minute to read.';

  return (
    <Screen
      footer={
        mode === 'first' ? (
          <Button label="I agree, let’s start" disabled={!all} onPress={() => giveConsent(CONSENT_VERSION)} />
        ) : (
          <Button label="Done" onPress={nav.back} />
        )
      }
    >
      {mode === 'view' ? <TopBar title="Pilot & privacy" onBack={nav.back} /> : <H1>Welcome to the Basil pilot</H1>}
      {mode === 'first' ? <Basil say={line}>{line}</Basil> : null}

      <Card>
        <H2>What the pilot is</H2>
        <P>A small group of up to 10 people tries Basil for a few weeks while the pilot team checks in on how it’s going. It helps us find what to fix before anyone else uses it.</P>
      </Card>

      <Card>
        <H2>What we collect</H2>
        <P>• How you use Basil: dinners you swap and why, steps and videos you finish, allergy warnings, dinners cooked, and whether a dinner kept you in range (yes/no only).</P>
        <P>• The feedback you choose to send.</P>
        <P>• If you sign in: your email address, so only you can use your account.</P>
        <H2>What we don’t collect</H2>
        <P>Your glucose numbers, health records, payment details or grocery-store password. Your profile and pantry stay on your device.</P>
      </Card>

      <Card>
        <H2>Your choices</H2>
        <P>Taking part is up to you. You can skip any question, and you can leave at any time from Pilot & privacy on the home screen. Leaving deletes everything on this device and the pilot record you’ve uploaded. Ask the pilot team to delete anything you sent as a file.</P>
        <P>If a meal ever includes something you’re allergic to, stop and tell the pilot team straight away.</P>
      </Card>

      <View style={{ gap: space(2) }}>
        {AGREE.map((text, i) => (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ticks[i] }}
            disabled={mode === 'view'}
            onPress={() => setTicks((t) => t.map((x, j) => (j === i ? !x : x)))}
            style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-start', padding: space(3), borderRadius: radius.md, borderWidth: 1.5, borderColor: ticks[i] ? colors.sage : colors.line, backgroundColor: ticks[i] ? colors.sageSoft : colors.card }}
          >
            <Text style={{ fontSize: 20, color: colors.sage, width: 24 }}>{ticks[i] ? '☑' : '☐'}</Text>
            <Text style={{ flex: 1, fontSize: font.body, lineHeight: 23, color: colors.ink }}>{text}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'view' ? (
        <>
          <P soft>
            Pilot code {state.participantId}
            {state.consent ? ` · agreed ${state.consent.at.slice(0, 10)}` : ''}
          </P>
          {confirmLeave ? (
            <Card tone="danger">
              <H2>Leave the pilot?</H2>
              <P>This deletes your profile, plans and pilot record from this device. It can’t be undone.</P>
              <Button
                kind="danger"
                label="Yes, leave and delete"
                onPress={async () => {
                  await deleteMyExport().catch(() => {});
                  await signOut().catch(() => {});
                  withdraw();
                }}
              />
              <Button kind="ghost" label="Cancel" onPress={() => setConfirmLeave(false)} />
            </Card>
          ) : (
            <>
              {auth.session ? <Button kind="secondary" label={`Sign out (${auth.email})`} onPress={() => signOut()} /> : null}
              <Button kind="ghost" label="Leave the pilot" onPress={() => setConfirmLeave(true)} />
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

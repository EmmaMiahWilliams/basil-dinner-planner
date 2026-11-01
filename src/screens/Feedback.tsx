// Supervised pilot: one-click feedback. Three questions on one screen, then one tap sends the
// participant's answers and anonymous usage signals to the Product Manager.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import appJson from '../../app.json';
import { useNav } from '../nav';
import { uploadExport, useAuth } from '../pilot/backend';
import { sharePilotExport } from '../pilot/share';
import { buildExport } from '../pilot/signals';
import { useStore } from '../state/store';
import { Basil, Button, Card, H2, P, Screen, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

const input = {
  backgroundColor: colors.card,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.line,
  padding: space(3),
  fontSize: font.body,
  color: colors.ink,
} as const;

export function Feedback({ after }: { after: string }) {
  const { state, addFeedback, logEvent } = useStore();
  const nav = useNav();
  const { session } = useAuth();
  const [likedMost, setLikedMost] = useState('');
  const [likedLeast, setLikedLeast] = useState('');
  const [improvements, setImprovements] = useState<[string, string, string]>(['', '', '']);
  const [stage, setStage] = useState<'ask' | 'sent'>('ask');
  const [note, setNote] = useState('');

  const anything = [likedMost, likedLeast, ...improvements].some((t) => t.trim());
  const setImprovement = (i: number, v: string) => setImprovements((cur) => cur.map((x, j) => (j === i ? v : x)) as [string, string, string]);

  const send = async (includeCurrent: boolean) => {
    const response = { likedMost: likedMost.trim(), likedLeast: likedLeast.trim(), improvements: improvements.map((t) => t.trim()) as [string, string, string], after };
    if (includeCurrent) addFeedback(response);
    const feedback = includeCurrent ? [...state.feedback, { ...response, at: new Date().toISOString() }] : state.feedback;
    const data = buildExport(state.participantId, state.events, feedback, appJson.expo.version);
    try {
      if (await uploadExport(data)) {
        logEvent({ type: 'feedback_sent' });
        setNote('Sent to the pilot team. Thank you!');
        setStage('sent');
        return;
      }
      const how = await sharePilotExport(data);
      logEvent({ type: 'feedback_sent' });
      setNote(how === 'downloaded' ? 'A file has downloaded. Please send it to the pilot team (email or message is fine).' : how === 'shared' ? 'Sent. Thank you!' : 'Saved on this device. You can send it any time from the home screen.');
    } catch {
      setNote('Saved on this device. You can send it any time from the home screen.');
    }
    setStage('sent');
  };

  if (stage === 'sent') {
    return (
      <Screen footer={<Button label="Back to my week" onPress={nav.home} />}>
        <TopBar title="Thank you" />
        <View style={{ alignItems: 'center', marginTop: space(6), gap: space(3) }}>
          <Text style={{ fontSize: 56 }}>💚</Text>
          <H2>Thanks for helping shape Basil</H2>
          <P style={{ textAlign: 'center' }}>{note}</P>
          <P soft style={{ textAlign: 'center' }}>Your pilot code is {state.participantId}.</P>
        </View>
      </Screen>
    );
  }

  const line = 'Three quick questions. Short answers are perfect, and you can skip any of them.';
  return (
    <Screen
      footer={
        <View style={{ gap: space(2) }}>
          <Button label="Send my feedback" disabled={!anything} onPress={() => send(true)} />
          {state.events.length && !session ? <Button kind="ghost" label="Just send my usage data" onPress={() => send(false)} /> : null}
        </View>
      }
    >
      <TopBar title="Your feedback" onBack={nav.back} />
      <Basil say={line}>{line}</Basil>

      <Card>
        <H2>What did you like most?</H2>
        <TextInput value={likedMost} onChangeText={setLikedMost} placeholder="e.g. not having to think about what to cook" placeholderTextColor={colors.inkSoft} accessibilityLabel="What did you like most" multiline style={[input, { minHeight: 64 }]} />
      </Card>

      <Card>
        <H2>What did you like least?</H2>
        <TextInput value={likedLeast} onChangeText={setLikedLeast} placeholder="e.g. the cooking steps were too long" placeholderTextColor={colors.inkSoft} accessibilityLabel="What did you like least" multiline style={[input, { minHeight: 64 }]} />
      </Card>

      <Card>
        <H2>Top three things to improve</H2>
        {improvements.map((v, i) => (
          <TextInput
            key={i}
            value={v}
            onChangeText={(t) => setImprovement(i, t)}
            placeholder={`${i + 1}.`}
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel={`Improvement ${i + 1}`}
            style={input}
          />
        ))}
      </Card>

      <Card tone="danger">
        <P>⚠️ If a meal ever included something you’re allergic to, please say so here and tell the pilot team straight away.</P>
      </Card>

      <P soft>
        Sent with your answers: your pilot code ({state.participantId}) and how you used Basil (meals swapped, cooking steps finished, allergy warnings, dinners cooked and whether they kept you in range). Not sent: your name, your profile, or anything about payment.
      </P>
    </Screen>
  );
}

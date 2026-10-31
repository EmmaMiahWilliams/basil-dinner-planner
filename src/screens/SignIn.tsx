// Pilot sign-in: email, then a 6-digit code from the email. No passwords to remember.

import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { sendCode, verifyCode } from '../pilot/backend';
import { Basil, Button, Card, H1, P, Screen } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

const input = { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), fontSize: font.large, color: colors.ink } as const;

export function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>, next?: () => void) => {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else next?.();
  };

  const line =
    stage === 'email'
      ? 'Sign in with the email address you gave the pilot team. I’ll send you a 6-digit code. No password needed.'
      : `I’ve sent a code to ${email.trim()}. It can take a minute to arrive.`;

  return (
    <Screen
      footer={
        stage === 'email' ? (
          <Button label={busy ? 'Sending…' : 'Send my code'} disabled={busy || !/\S+@\S+\.\S+/.test(email)} onPress={() => run(() => sendCode(email), () => setStage('code'))} />
        ) : (
          <View style={{ gap: space(2) }}>
            <Button label={busy ? 'Checking…' : 'Sign in'} disabled={busy || code.trim().length < 6} onPress={() => run(() => verifyCode(email, code))} />
            <Button kind="ghost" label="Use a different email" onPress={() => { setStage('email'); setCode(''); setError(null); }} />
          </View>
        )
      }
    >
      <H1>Sign in to Basil</H1>
      <Basil say={line}>{line}</Basil>
      {stage === 'email' ? (
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.inkSoft}
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={input}
          autoFocus
        />
      ) : (
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          placeholderTextColor={colors.inkSoft}
          accessibilityLabel="6-digit code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          style={[input, { letterSpacing: 8, textAlign: 'center', fontSize: font.title }]}
          autoFocus
        />
      )}
      {error ? (
        <Card tone="danger">
          <P>{error}</P>
        </Card>
      ) : null}
      <P soft>Only people invited to the pilot can sign in.</P>
    </Screen>
  );
}

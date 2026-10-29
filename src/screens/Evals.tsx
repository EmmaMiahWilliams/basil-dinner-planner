// "Behind the scenes": runs the Capstone test set (T1–T5) and the extra safety checks live against the agent.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { EvalGroup, runEvals } from '../agent/evals';
import { useNav } from '../nav';
import { Button, Card, H1, H2, P, Row, Screen, TopBar } from '../ui/components';
import { colors, font, space } from '../ui/theme';

const GROUP_INTRO: Record<EvalGroup, string> = {
  'Capstone test set': 'Five scenarios from the PRD. Each one walks the real agent through a whole week: plan, review, cart, cooking and Plan-to-Plate.',
  'Extra safety checks': 'Smaller checks on unclear photos, allergies, time limits, portions and the hand-off to the demo store.',
};

export function Evals() {
  const nav = useNav();
  const [results, setResults] = useState(() => runEvals());
  const [open, setOpen] = useState<string | null>('T1');
  const passed = results.filter((r) => r.pass).length;
  const groups = [...new Set(results.map((r) => r.group))];

  return (
    <Screen footer={<Button kind="secondary" label="Run again" onPress={() => setResults(runEvals())} />}>
      <TopBar title="Agent tests" onBack={nav.back} />
      <H1>
        {passed}/{results.length} passing
      </H1>
      <P soft>Everything runs on synthetic data, on this device, each time you open this screen.</P>
      {groups.map((g) => {
        const rows = results.filter((r) => r.group === g);
        return (
          <View key={g} style={{ gap: space(3) }}>
            <H2>
              {g} · {rows.filter((r) => r.pass).length}/{rows.length}
            </H2>
            <P soft>{GROUP_INTRO[g]}</P>
            {rows.map((r) => {
              const steps = 'steps' in r ? r.steps : undefined;
              const expanded = open === r.id;
              return (
                <Card key={r.id} tone={r.pass ? undefined : 'danger'}>
                  <Pressable accessibilityRole="button" disabled={!steps} onPress={() => setOpen(expanded ? null : r.id)}>
                    <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                      <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink, flex: 1 }}>
                        {r.pass ? '✅' : '❌'} {r.id} · {r.title}
                      </Text>
                      {steps ? <Text style={{ color: colors.inkSoft, fontSize: 18 }}>{expanded ? '▴' : '▾'}</Text> : null}
                    </Row>
                  </Pressable>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.sage, textTransform: 'uppercase', letterSpacing: 1 }}>{r.kind}</Text>
                  <P soft>Expect: {r.expectation}</P>
                  <View style={{ backgroundColor: colors.bg, borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: font.small, color: colors.ink }}>{r.detail}</Text>
                  </View>
                  {steps && expanded ? (
                    <View style={{ gap: 6, marginTop: space(1) }}>
                      {steps.map((st, i) => {
                        const isCheck = st.startsWith('✓') || st.startsWith('✗');
                        const num = steps.slice(0, i + 1).filter((x) => !x.startsWith('✓') && !x.startsWith('✗')).length;
                        return (
                        <Text
                          key={i}
                          style={{
                            fontSize: font.small,
                            lineHeight: 20,
                            color: st.startsWith('✗') ? colors.danger : st.startsWith('✓') ? colors.sage : colors.ink,
                            fontWeight: st.startsWith('✓') || st.startsWith('✗') ? '700' : '400',
                          }}
                        >
                          {isCheck ? st : `${num}. ${st}`}
                        </Text>
                        );
                      })}
                    </View>
                  ) : steps ? (
                    <Pressable accessibilityRole="button" onPress={() => setOpen(r.id)} hitSlop={8}>
                      <Text style={{ color: colors.sage, fontWeight: '700', fontSize: font.small }}>Show the {steps.length} steps</Text>
                    </Pressable>
                  ) : null}
                </Card>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

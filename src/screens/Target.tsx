// Target hand-off. The shopper uses their own Target.com account: Basil opens Target's page for each
// item, the shopper adds the real product to their Target cart, and ticks it off here. Basil never
// signs in to Target, never sees the account, and stops before checkout. Paying is the shopper's.

import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { targetTotals, usd } from '../agent/target';
import { ingredient } from '../data/ingredients';
import { TARGET } from '../data/target';
import { useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, H1, H2, P, Row, Screen, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

type Stage = 'account' | 'no_account' | 'list' | 'stop';

const open = (url: string) => Linking.openURL(url).catch(() => {});

export function Target({ initial }: { initial: 'account' | 'list' }) {
  const { state, updateWeek, logEvent, setTargetAccount } = useStore();
  const nav = useNav();
  const week = state.week!;
  const list = week.targetList!;
  const added = week.targetAdded ?? [];
  const [stage, setStage] = useState<Stage>(initial);
  const t = targetTotals(list, added);

  if (stage === 'account') {
    const line = 'To shop at Target you need your own Target.com account. Do you have one?';
    return (
      <Screen
        footer={
          <View style={{ gap: space(2) }}>
            <Button label="Yes, I have a Target account" onPress={() => { setTargetAccount(true); setStage('list'); }} />
            <Button kind="secondary" label="Not yet" onPress={() => { setTargetAccount(false); setStage('no_account'); }} />
          </View>
        }
      >
        <TopBar title="Shop at Target" onBack={nav.home} />
        <Basil say={line}>{line}</Basil>
        <Card tone="sky">
          <P>🔒 You sign in on Target’s own site or app, not in Basil. Basil never sees your Target password, payment details or orders.</P>
        </Card>
      </Screen>
    );
  }

  if (stage === 'no_account') {
    const line = 'No problem. You can make a free account on Target, then come back here. Or use the practice store for now.';
    return (
      <Screen
        footer={
          <View style={{ gap: space(2) }}>
            <Button label="I’ve made one, carry on" onPress={() => { setTargetAccount(true); setStage('list'); }} />
            <Button kind="secondary" label="Go back to my cart" onPress={() => { updateWeek((w) => ({ ...w, cartApproved: false, retailer: undefined, targetList: undefined, targetAdded: undefined })); nav.replace({ name: 'cart' }); }} />
          </View>
        }
      >
        <TopBar title="Shop at Target" onBack={nav.home} />
        <Basil say={line}>{line}</Basil>
        <Button kind="ghost" label="Open Target to create an account ↗" onPress={() => open(TARGET.accountUrl)} />
      </Screen>
    );
  }

  if (stage === 'stop') {
    return (
      <Screen footer={<Button label="Back to my week" onPress={nav.home} />}>
        <TopBar title="" onBack={() => setStage('list')} />
        <View style={{ alignItems: 'center', gap: space(3), marginTop: space(6) }}>
          <Text style={{ fontSize: 56 }}>🛑</Text>
          <H1>Basil stops here</H1>
          <P style={{ textAlign: 'center' }}>
            Your Target cart is open in Target. Check the items and prices, choose pickup, drive up or delivery, and pay there if you want to. Basil hasn’t placed an order and can’t.
          </P>
          <Button kind="secondary" label="Open my Target cart again ↗" onPress={() => open(TARGET.cartUrl)} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  const toggle = (id: string) => {
    const on = added.includes(id);
    logEvent({ type: 'target_item', action: on ? 'unticked' : 'added', ingredientId: id });
    updateWeek((w) => ({ ...w, targetAdded: on ? (w.targetAdded ?? []).filter((x) => x !== id) : [...(w.targetAdded ?? []), id] }));
  };
  const next = list.lines.find((l) => !added.includes(l.ingredientId));
  const line = next
    ? `Tap Find it for each item to open Target, pick the one you like, and add it to your Target cart. Then tick it here. ${t.added} of ${t.items} done.`
    : 'Everything’s ticked off. Open your Target cart to check it. You decide whether to check out.';

  return (
    <Screen
      footer={
        <View style={{ gap: space(2) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <P soft>
              {t.added} of {t.items} added
            </P>
            <Text style={{ fontSize: font.large, fontWeight: '800', color: colors.ink }}>≈ {usd(t.estimateUsd)}</Text>
          </Row>
          <Button
            label="Open my Target cart ↗"
            onPress={() => {
              logEvent({ type: 'checkout_reached', retailer: 'target' });
              open(TARGET.cartUrl);
              setStage('stop');
            }}
          />
        </View>
      }
    >
      <View style={{ gap: space(2) }}>
        <TopBar title="" onBack={nav.home} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: '#CC0000', borderRadius: radius.md, padding: space(4) }}>
          <Text style={{ fontSize: 32 }}>{TARGET.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: font.large, fontWeight: '800' }}>Your Target list</Text>
            <Text style={{ color: '#FBE3E3', fontSize: font.small }}>You add items in your own Target account</Text>
          </View>
        </View>
      </View>
      <Basil say={line}>{line}</Basil>
      {list.lines.map((l) => {
        const ing = ingredient(l.ingredientId);
        const on = added.includes(l.ingredientId);
        return (
          <Card key={l.ingredientId} tone={on ? 'sage' : undefined}>
            <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 26 }}>{ing.emoji}</Text>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>{ing.name}</Text>
                <Text style={{ fontSize: font.small, color: colors.inkSoft }}>Look for: {l.search}</Text>
                <Text style={{ fontSize: font.small, color: colors.inkSoft }}>
                  {l.priceKind === 'checked' ? `${usd(l.usd)} at Target on ${l.checkedOn}` : `About ${usd(l.usd)} · Target shows the real price`}
                </Text>
                {l.checkLabelFor.length ? (
                  <Text style={{ fontSize: font.small, color: colors.danger, fontWeight: '700' }}>⚠️ Check the label for {l.checkLabelFor.join(', ')}</Text>
                ) : null}
              </View>
            </Row>
            <Row style={{ flexWrap: 'nowrap' }}>
              <Button
                style={{ flex: 1 }}
                kind="secondary"
                label="Find it ↗"
                onPress={() => {
                  logEvent({ type: 'target_item', action: 'opened', ingredientId: l.ingredientId });
                  open(l.url);
                }}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(l.ingredientId)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 2, borderColor: on ? colors.sage : colors.line, backgroundColor: on ? colors.sageSoft : colors.card, paddingVertical: space(3) }}
              >
                <Text style={{ fontWeight: '700', color: on ? colors.sage : colors.inkSoft }}>{on ? '✓ In my cart' : 'I added it'}</Text>
              </Pressable>
            </Row>
          </Card>
        );
      })}
      <H2>How this works</H2>
      <P soft>
        Target doesn’t let other apps fill your cart or read its prices, so you add each item yourself on Target. Prices here are Basil’s rough guide in US dollars; your Target cart shows the
        real price. Basil never signs in to your account, checks out or pays.
      </P>
    </Screen>
  );
}

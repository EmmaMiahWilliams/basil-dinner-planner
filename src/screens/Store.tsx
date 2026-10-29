// Handoff to the demo online store: send the approved cart, ask before any substitution,
// show the store's cart, and stop at its checkout. Nothing is ever bought.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { answerSubstitution, pendingQuestions, totals } from '../agent/retailer';
import { ingredient } from '../data/ingredients';
import { DELIVERY_SLOTS, RETAILER } from '../data/store';
import { useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, Chip, H1, H2, P, Row, Screen, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

type Stage = 'sending' | 'questions' | 'store' | 'checkout';

const SENDING_LINES = [`Opening your ${RETAILER.name} cart…`, 'Adding your approved items…', 'Checking what’s in stock…'];

export function Store({ initial }: { initial: 'sending' | 'store' }) {
  const { state, updateWeek } = useStore();
  const nav = useNav();
  const week = state.week!;
  const cart = week.storeCart!;
  const cartReady = pendingQuestions(cart).length === 0;
  const [stage, setStage] = useState<Stage>(initial === 'store' ? (cartReady ? 'store' : 'questions') : 'sending');
  const [shown, setShown] = useState(1);
  const pending = pendingQuestions(cart);
  const t = totals(cart);

  useEffect(() => {
    if (stage !== 'sending') return;
    const timers = SENDING_LINES.slice(1).map((_, i) => setTimeout(() => setShown(i + 2), 600 * (i + 1)));
    timers.push(setTimeout(() => setStage('questions'), 600 * SENDING_LINES.length + 300));
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const answer = (id: string, accept: boolean) => updateWeek((w) => ({ ...w, storeCart: answerSubstitution(w.storeCart!, id, accept) }));

  if (stage === 'sending') {
    return (
      <Screen>
        <TopBar title={`Sending to ${RETAILER.name}`} />
        <View style={{ alignItems: 'center', marginTop: space(10), gap: space(3) }}>
          <Text style={{ fontSize: 56 }}>{RETAILER.emoji}</Text>
          {SENDING_LINES.slice(0, shown).map((l) => (
            <P key={l}>{l}</P>
          ))}
        </View>
      </Screen>
    );
  }

  if (stage === 'questions') {
    const leftOut = cart.lines.filter((l) => l.status === 'left_out');
    const line = pending.length
      ? `${pending.length === 1 ? 'One item is' : `${pending.length} items are`} out of stock. I won’t swap anything without your OK.`
      : `Everything’s in your ${RETAILER.name} cart. Have a look before you check out.`;
    return (
      <Screen footer={<Button label={`Open my ${RETAILER.name} cart`} disabled={pending.length > 0} onPress={() => setStage('store')} />}>
        <TopBar title="Before you shop" onBack={nav.home} />
        <Basil say={line}>{line}</Basil>
        {cart.lines
          .filter((l) => l.status === 'needs_your_ok' || l.status === 'substituted' || (l.status === 'left_out' && l.note))
          .map((l) => (
            <Card key={l.ingredientId} tone={l.status === 'needs_your_ok' ? 'peach' : l.status === 'left_out' ? 'danger' : 'sage'}>
              <H2>
                {ingredient(l.ingredientId).emoji} {ingredient(l.ingredientId).name}
              </H2>
              <P>{l.note}</P>
              {l.status === 'needs_your_ok' && l.substitute ? (
                <Row style={{ flexWrap: 'nowrap' }}>
                  <Button style={{ flex: 1 }} kind="secondary" label={`Yes, swap (£${l.substitute.price.toFixed(2)})`} onPress={() => answer(l.ingredientId, true)} />
                  <Button style={{ flex: 1 }} kind="secondary" label="No, leave it out" onPress={() => answer(l.ingredientId, false)} />
                </Row>
              ) : null}
            </Card>
          ))}
        <P soft>
          {t.items} items are in your cart. {leftOut.length ? `${leftOut.length} left out.` : ''}
        </P>
      </Screen>
    );
  }

  if (stage === 'checkout') {
    return (
      <Screen footer={<Button label="Back to my week" onPress={nav.home} />}>
        <StoreHeader />
        <View style={{ alignItems: 'center', gap: space(3), marginTop: space(6) }}>
          <Text style={{ fontSize: 56 }}>🧾</Text>
          <H1>Checkout</H1>
          <P style={{ textAlign: 'center' }}>
            This is where you’d review and pay in {RETAILER.name}’s own checkout. Basil never sees your payment details and never places an order.
          </P>
          <Card tone="sky" style={{ alignSelf: 'stretch' }}>
            <P>🧪 Demo store: no order has been placed and nothing was charged.</P>
          </Card>
        </View>
      </Screen>
    );
  }

  // stage === 'store': the demo store's own cart page
  return (
    <Screen footer={<Button label="Go to checkout" disabled={!week.deliverySlot || t.items === 0} onPress={() => setStage('checkout')} />}>
      <StoreHeader />
      <H2>Your cart · {t.items} items</H2>
      <Card style={{ gap: 0, paddingVertical: space(1) }}>
        {cart.lines.map((l, i) => {
          const inCart = l.status === 'added' || l.status === 'substituted';
          return (
            <View
              key={l.ingredientId}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3), borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, opacity: inCart ? 1 : 0.45 }}
            >
              <Text style={{ fontSize: 24 }}>{ingredient(l.ingredientId).emoji}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink, textDecorationLine: inCart ? 'none' : 'line-through' }}>{l.title}</Text>
                <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                  {l.sku}
                  {l.status === 'substituted' ? ' · substitute you approved' : l.status === 'left_out' ? ' · not in cart' : ''}
                </Text>
              </View>
              <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>{inCart ? `£${l.price.toFixed(2)}` : '—'}</Text>
            </View>
          );
        })}
      </Card>
      <H2>Delivery slot</H2>
      <Row>
        {DELIVERY_SLOTS.map((s) => (
          <Chip key={s} label={s} selected={week.deliverySlot === s} onPress={() => updateWeek((w) => ({ ...w, deliverySlot: s }))} />
        ))}
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <P soft>Subtotal</P>
          <P>£{t.subtotal.toFixed(2)}</P>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <P soft>Delivery</P>
          <P>£{t.delivery.toFixed(2)}</P>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontSize: font.large, fontWeight: '800', color: colors.ink }}>Total</Text>
          <Text style={{ fontSize: font.large, fontWeight: '800', color: colors.ink }}>£{t.total.toFixed(2)}</Text>
        </Row>
      </Card>
      {!week.deliverySlot ? <P soft>Pick a delivery slot to continue.</P> : null}
    </Screen>
  );
}

/** Marks the screen as the store's page, clearly labelled as a demo. */
function StoreHeader() {
  const nav = useNav();
  return (
    <View style={{ gap: space(2) }}>
      <TopBar title="" onBack={nav.home} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.ink, borderRadius: radius.md, padding: space(4) }}>
        <Text style={{ fontSize: 32 }}>{RETAILER.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: font.large, fontWeight: '800' }}>{RETAILER.name}</Text>
          <Text style={{ color: '#D9E2DC', fontSize: font.small }}>{RETAILER.tagline}</Text>
        </View>
        <View style={{ backgroundColor: colors.peach, borderRadius: 999, paddingHorizontal: space(3), paddingVertical: 4 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 12 }}>DEMO</Text>
        </View>
      </View>
    </View>
  );
}

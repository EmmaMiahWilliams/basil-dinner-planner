// Draft cart: only the missing ingredients. The user edits and approves, then it goes to the demo store.
// The app never checks out.

import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { buildCart } from '../agent/planner';
import { sendToStore } from '../agent/retailer';
import { dish } from '../data/dishes';
import { INGREDIENTS, ingredient } from '../data/ingredients';
import { useNav } from '../nav';
import { RETAILER } from '../data/store';
import { useStore } from '../state/store';
import { Basil, Button, Card, H1, H2, P, Row, Screen, TopBar } from '../ui/components';
import { colors, font, space } from '../ui/theme';

export function Cart() {
  const { state, updateWeek, logEvent } = useStore();
  const nav = useNav();
  const week = state.week!;
  const profile = state.profile!;
  const cart = buildCart(week.meals);
  const kept = cart.filter((c) => !week.cartRemoved.includes(c.ingredientId));
  const total = kept.reduce((s, c) => s + c.price, 0);
  const clashes = kept.filter((c) => INGREDIENTS[c.ingredientId].allergens?.some((a) => profile.allergens.includes(a)) || profile.avoid.includes(c.ingredientId));

  const clashKey = clashes.map((c) => c.ingredientId).join(',');
  useEffect(() => {
    if (clashKey) logEvent({ type: 'allergen_alert', where: 'cart', items: clashKey.split(',') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clashKey]);

  const toggle = (id: string) =>
    updateWeek((w) => ({ ...w, cartRemoved: w.cartRemoved.includes(id) ? w.cartRemoved.filter((x) => x !== id) : [...w.cartRemoved, id] }));

  const line = `Here’s your shopping list. It only has things you don’t already have. Remove anything you don’t want. I won’t buy anything for you.`;
  return (
    <Screen
      footer={
        <View style={{ gap: space(2) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <P soft>
              {kept.length} items
            </P>
            <Text style={{ fontSize: font.large, fontWeight: '800', color: colors.ink }}>£{total.toFixed(2)}</Text>
          </Row>
          <Button
            label={`Approve & send to ${RETAILER.name}`}
            disabled={clashes.length > 0}
            onPress={() => {
              const storeCart = sendToStore(cart, week.cartRemoved, profile);
              const blocked = storeCart.lines.filter((l) => l.status === 'left_out').map((l) => l.ingredientId);
              logEvent({ type: 'cart_approved', items: kept.length });
              if (blocked.length) logEvent({ type: 'allergen_alert', where: 'store_substitute', items: blocked });
              updateWeek((w) => ({ ...w, cartApproved: true, today: 0, storeCart, deliverySlot: undefined }));
              nav.replace({ name: 'store', stage: 'sending' });
            }}
          />
        </View>
      }
    >
      <TopBar title="Draft cart" onBack={nav.back} />
      <Basil say={line}>{line}</Basil>
      <Card tone={clashes.length ? 'danger' : 'sage'}>
        <P>
          {clashes.length
            ? `⚠️ ${clashes.map((c) => c.label).join(', ')} may clash with your allergies or avoidances. Please remove it before approving.`
            : '🛡️ Checked: nothing here clashes with your allergies or foods you avoid.'}
        </P>
      </Card>
      {cart.length === 0 ? (
        <Card>
          <H2>Nothing to buy 🎉</H2>
          <P>You already have everything for this week’s dinners.</P>
        </Card>
      ) : null}
      {cart.map((c) => {
        const removed = week.cartRemoved.includes(c.ingredientId);
        const ing = ingredient(c.ingredientId);
        return (
          <Card key={c.ingredientId} style={removed ? { opacity: 0.5 } : undefined}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <Text style={{ fontSize: 28 }}>{ing.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink, textDecorationLine: removed ? 'line-through' : 'none' }}>{c.label}</Text>
                <Text style={{ fontSize: font.small, color: colors.inkSoft }}>For {c.forDishes.map((id) => dish(id).name).join(', ')}</Text>
              </View>
              <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>£{c.price.toFixed(2)}</Text>
            </Row>
            <Pressable accessibilityRole="button" onPress={() => toggle(c.ingredientId)} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ color: removed ? colors.sage : colors.danger, fontWeight: '700' }}>{removed ? 'Put back' : 'Remove'}</Text>
            </Pressable>
          </Card>
        );
      })}
      <P soft>Prices are made up. In this supervised pilot {RETAILER.name} is a pretend store: no real grocery account is connected, and Basil never checks out or pays.</P>
    </Screen>
  );
}

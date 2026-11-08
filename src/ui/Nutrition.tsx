// Per-meal nutrition table: amount and % of the user's day. Calories turn red over 1,000 kcal.

import { Text, View } from 'react-native';
import type { Dish } from '../data/dishes';
import { MEAL_KCAL_LIMIT, basisNote, mealNutrition, overMealLimit } from '../data/nutrition';
import type { Profile } from '../data/profile';
import { colors, font, space } from './theme';

const fmt = (n: number, unit: 'kcal' | 'g') => (unit === 'kcal' ? `${Math.round(n)} kcal` : `${Number.isInteger(n) ? n : n.toFixed(1)}g`);

export function NutritionFacts({ dish, profile }: { dish: Dish; profile: Profile }) {
  const lines = mealNutrition(dish, profile);
  const over = overMealLimit(dish);
  return (
    <View accessibilityLabel={`Nutrition for ${dish.name}`}>
      <View style={{ flexDirection: 'row', paddingBottom: space(1), borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Text style={[head, { flex: 1 }]}>Per meal</Text>
        <Text style={[head, cellAmount]}>Amount</Text>
        <Text style={[head, cellPct]}>% of day</Text>
      </View>
      {lines.map((l) => {
        const red = l.key === 'kcal' && over;
        const tone = red ? colors.danger : colors.ink;
        return (
          <View key={l.key} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ flex: 1, fontSize: font.small, color: red ? colors.danger : l.sub ? colors.inkSoft : colors.ink, paddingLeft: l.sub ? space(3) : 0, fontWeight: l.key === 'kcal' ? '700' : '400' }}>
              {l.label}
            </Text>
            <Text style={[cellAmount, { fontSize: font.small, color: tone, fontWeight: l.key === 'kcal' ? '700' : '400' }]}>{fmt(l.amount, l.unit)}</Text>
            <Text style={[cellPct, { fontSize: font.small, color: red ? colors.danger : colors.inkSoft }]}>{l.percent}%</Text>
          </View>
        );
      })}
      {over ? (
        <Text style={{ fontSize: font.small, color: colors.danger, marginTop: space(2), fontWeight: '700' }}>
          Over {MEAL_KCAL_LIMIT.toLocaleString('en-GB')} kcal for one meal.
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: space(2) }}>
        {basisNote(profile)} Estimates per serving, not medical advice.
      </Text>
    </View>
  );
}

/** Short calorie label for list rows; red over the per-meal limit. */
export function KcalText({ dish }: { dish: Pick<Dish, 'kcal'> }) {
  const over = overMealLimit(dish);
  return <Text style={{ color: over ? colors.danger : colors.inkSoft, fontWeight: over ? '700' : '400' }}>{dish.kcal} kcal</Text>;
}

const head = { fontSize: 12, fontWeight: '800' as const, color: colors.inkSoft, textTransform: 'uppercase' as const, letterSpacing: 1 };
const cellAmount = { width: 80, textAlign: 'right' as const };
const cellPct = { width: 72, textAlign: 'right' as const };

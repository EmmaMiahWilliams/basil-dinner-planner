// The user's baseline at a glance. Shown at the end of the first triage, before planning each Saturday,
// and from the Profile link. Each row can be changed on its own.

import { Pressable, Text, View } from 'react-native';
import { INGREDIENTS } from '../data/ingredients';
import { DIET_LABEL, Profile } from '../data/profile';
import { TriageStep, useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, P, Screen, TopBar } from '../ui/components';
import { colors, font, space } from '../ui/theme';

const ACTIVITY_LABEL: Record<Profile['activity'], string> = { low: 'Mostly sitting', moderate: 'Some movement', high: 'Very active' };

function rows(p: Profile): { key: TriageStep; label: string; value: string; danger?: boolean }[] {
  const list = (xs: string[], none: string) => (xs.length ? xs.join(', ') : none);
  return [
    { key: 'name', label: 'Name', value: p.name || '—' },
    { key: 'diet', label: 'Eating style', value: DIET_LABEL[p.diet] },
    {
      key: 'needs',
      label: 'Diabetes-friendly aims',
      value: `${list(p.needs, 'None picked')}${p.calorieTarget ? ` · ${p.calorieTarget.toLocaleString('en-GB')} kcal a day` : ''}`,
    },
    { key: 'allergens', label: 'Allergies (never included)', value: list(p.allergens, 'None'), danger: p.allergens.length > 0 },
    { key: 'avoid', label: 'Rather not eat', value: list(p.avoid.map((id) => INGREDIENTS[id]?.name ?? id), 'Nothing') },
    { key: 'preferred', label: 'Favourite kinds of dinner', value: list(p.preferred, 'No favourites yet') },
    { key: 'timing', label: 'Dinner time', value: `${p.dinnerTime}, reminder ${p.reminderMinutesBefore} min before` },
    { key: 'activity', label: 'Activity', value: ACTIVITY_LABEL[p.activity] },
    { key: 'goals', label: 'What matters most', value: list(p.goals, 'Nothing picked') },
  ];
}

export function BaselineSummary({ profile, onEdit }: { profile: Profile; onEdit: (key: TriageStep) => void }) {
  return (
    <Card style={{ gap: 0, paddingVertical: space(1) }}>
      {rows(profile).map((r, i) => (
        <View
          key={r.key}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3), borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: r.danger ? colors.danger : colors.inkSoft, textTransform: 'uppercase', letterSpacing: 1 }}>{r.label}</Text>
            <Text style={{ fontSize: font.body, color: colors.ink, marginTop: 2 }}>{r.value}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Change ${r.label}`} onPress={() => onEdit(r.key)} hitSlop={10}>
            <Text style={{ color: colors.sage, fontWeight: '700', fontSize: font.body }}>Change</Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

function lastReviewed(iso?: string): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Saturday: "Has anything changed?" before the check-in. Also the Profile screen (view mode). */
export function Baseline({ mode }: { mode: 'saturday' | 'view' }) {
  const { state, setProfile } = useStore();
  const nav = useNav();
  const profile = state.profile!;
  const when = lastReviewed(profile.reviewedAt);

  const confirm = () => {
    setProfile({ ...profile, reviewedAt: new Date().toISOString() });
    if (mode === 'saturday') nav.replace({ name: 'checkin' });
    else nav.back();
  };

  const line =
    mode === 'saturday'
      ? `Before we plan next week, has anything changed? A new allergy, foods you’re off, a different dinner time?`
      : 'This is what I use to plan your dinners. Change anything, any time.';

  return (
    <Screen footer={<Button label={mode === 'saturday' ? 'All good, plan my week' : 'Done'} onPress={confirm} />}>
      <TopBar title={mode === 'saturday' ? 'Quick check-in' : 'Your profile'} onBack={nav.back} />
      <Basil say={line}>{line}</Basil>
      <BaselineSummary profile={profile} onEdit={(step) => nav.go({ name: 'triage', mode: 'edit', step })} />
      {when ? <P soft>Last checked {when}.</P> : null}
    </Screen>
  );
}

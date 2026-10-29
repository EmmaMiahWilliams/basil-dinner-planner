import * as Speech from 'expo-speech';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, space } from './theme';

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={styles.footer}>
          <View style={styles.column}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.back}>{right}</View>
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, styles[`btn_${kind}`], disabled && { opacity: 0.4 }, pressed && { opacity: 0.8 }, style]}
    >
      <Text style={[styles.btnText, kind === 'primary' || kind === 'danger' ? { color: '#fff' } : { color: colors.sage }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, tone = 'sage' }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'sage' | 'danger' | 'peach' }) {
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'peach' ? colors.peachSoft : colors.sageSoft;
  const fg = tone === 'danger' ? colors.danger : tone === 'peach' ? '#8A4B12' : colors.sage;
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : undefined}
      accessibilityState={onPress ? { checked: !!selected } : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, { backgroundColor: selected === false ? colors.card : bg, borderColor: selected ? fg : colors.line }]}
    >
      <Text style={[styles.chipText, { color: selected === false ? colors.inkSoft : fg }]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: 'sage' | 'peach' | 'berry' | 'danger' | 'sky' }) {
  const bg = tone ? { sage: colors.sageSoft, peach: colors.peachSoft, berry: colors.berrySoft, danger: colors.dangerSoft, sky: colors.skySoft }[tone] : colors.card;
  return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function P({ children, soft, style }: { children: ReactNode; soft?: boolean; style?: object }) {
  return <Text style={[styles.p, soft && { color: colors.inkSoft }, style]}>{children}</Text>;
}

/** The app's friendly guide. Tapping the speaker reads the line aloud in a calm voice. */
export function Basil({ children, say }: { children: ReactNode; say?: string }) {
  return (
    <View style={styles.basil}>
      <View style={styles.basilAvatar}>
        <Text style={{ fontSize: 28 }}>🌿</Text>
      </View>
      <View style={styles.basilBubble}>
        <Text style={styles.basilText}>{children}</Text>
        {say ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read aloud"
            onPress={() => {
              Speech.stop();
              Speech.speak(say, { rate: 0.9, pitch: 1.0 });
            }}
            hitSlop={10}
            style={styles.speak}
          >
            <Text style={{ fontSize: 16 }}>🔊</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string; sub?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentLabel, on && { color: '#fff' }]}>{o.label}</Text>
            {o.sub ? <Text style={[styles.segmentSub, on && { color: '#E9F3EC' }]}>{o.sub}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** A plate split into veg / protein / carb so portions can be judged by eye instead of a scale. */
export function Plate({ veg, protein, carb, size = 132 }: { veg: number; protein: number; carb: number; size?: number }) {
  const inner = size - 20;
  return (
    <View style={{ alignItems: 'center', gap: space(2) }}>
      <View style={[styles.plateRim, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: inner * veg, height: inner, backgroundColor: '#7FB77E' }} />
          <View style={{ width: inner * (protein + carb), height: inner }}>
            <View style={{ height: (inner * protein) / (protein + carb), backgroundColor: '#E9A178' }} />
            {carb > 0 ? <View style={{ height: (inner * carb) / (protein + carb), backgroundColor: '#E8D28A' }} /> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space(3), flexWrap: 'wrap', justifyContent: 'center' }}>
        <Legend color="#7FB77E" label={`Veg ${Math.round(veg * 100)}%`} />
        <Legend color="#E9A178" label={`Protein ${Math.round(protein * 100)}%`} />
        {carb > 0 ? <Legend color="#E8D28A" label={`Carbs ${Math.round(carb * 100)}%`} /> : null}
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text style={{ fontSize: font.small, color: colors.inkSoft }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.sage }: { value: number; color?: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(2), flexWrap: 'wrap' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space(4), paddingBottom: space(10) },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: space(4) },
  footer: { padding: space(4), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minWidth: 72 },
  backText: { color: colors.sage, fontSize: font.body, fontWeight: '600' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: font.body, fontWeight: '700', color: colors.ink },
  btn: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(5) },
  btn_primary: { backgroundColor: colors.sage },
  btn_secondary: { backgroundColor: colors.sageSoft },
  btn_ghost: { backgroundColor: 'transparent' },
  btn_danger: { backgroundColor: colors.danger },
  btnText: { fontSize: font.large, fontWeight: '700' },
  chip: { borderRadius: 999, borderWidth: 1.5, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipText: { fontSize: font.small, fontWeight: '600' },
  card: { borderRadius: radius.lg, padding: space(4), gap: space(2), borderWidth: 1, borderColor: colors.line },
  h1: { fontSize: font.title, fontWeight: '800', color: colors.ink },
  h2: { fontSize: font.large, fontWeight: '700', color: colors.ink },
  p: { fontSize: font.body, lineHeight: 23, color: colors.ink },
  basil: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  basilAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  basilBubble: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderTopLeftRadius: 4, padding: space(3), paddingRight: space(10), borderWidth: 1, borderColor: colors.line },
  basilText: { fontSize: font.body, lineHeight: 23, color: colors.ink },
  speak: { position: 'absolute', right: space(3), top: space(3) },
  segment: { flexDirection: 'row', gap: space(2) },
  segmentItem: { flex: 1, minHeight: 64, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', padding: space(2) },
  segmentOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  segmentLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  segmentSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2, textAlign: 'center' },
  plateRim: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
});

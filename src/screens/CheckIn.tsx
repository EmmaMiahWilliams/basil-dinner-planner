// Saturday check-in: what's in the kitchen (ticked by the participant, or a sample photo), energy level,
// time limit. Then the agent runs.

import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, Text, View } from 'react-native';
import { ENERGY_LABEL, Energy, TraceStep, planWeek } from '../agent/planner';
import { FoodGroup, INGREDIENTS, ingredient } from '../data/ingredients';
import { MY_KITCHEN, PANTRY_PHOTOS, inventoryFor } from '../data/pantries';
import { CheckIn as CheckInData, useNav } from '../nav';
import { Unavailable, photoReadingPossible, readPantryPhoto } from '../pilot/recognize';
import { EMPTY_READING, PhotoReading, applyReading, mergeReadings } from '../state/photoReading';
import { AddResult, usePantryPhotos } from '../state/photos';
import { MAX_PHOTOS_PER_WEEK, PantryPhotoShot, discardBy } from '../state/photoRules';
import { useStore } from '../state/store';
import { Basil, Button, Card, Chip, H2, P, Row, Screen, Segmented, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

const SHELVES: { label: string; groups: FoodGroup[] }[] = [
  { label: 'Beans, lentils & protein', groups: ['beans', 'protein'] },
  { label: 'Veg & greens', groups: ['greens', 'cruciferous', 'mushroom', 'onion', 'veg'] },
  { label: 'Dairy', groups: ['dairy'] },
  { label: 'Rice, grains & noodles', groups: ['grain'] },
  { label: 'Nuts, seeds & berries', groups: ['nutsSeeds', 'berries'] },
  { label: 'Cupboard basics', groups: ['pantry'] },
];

export function CheckIn() {
  const nav = useNav();
  const { state, setMyPantry } = useStore();
  const [pantryId, setPantryId] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<string[]>(state.myPantry);
  const [energy, setEnergy] = useState<Energy>('ok');
  const [maxMinutes, setMaxMinutes] = useState(30);
  const mine = pantryId === MY_KITCHEN;
  const toggleItem = (id: string) => setMyItems((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const [reading, setReading] = useState<PhotoReading>(EMPTY_READING);
  const onReading = (r: PhotoReading) => {
    setReading((cur) => mergeReadings(cur, r));
    setMyItems((cur) => applyReading(cur, r));
  };

  return (
    <Screen
      footer={
        <Button
          label="Plan my week"
          disabled={!pantryId || (mine && myItems.length === 0)}
          onPress={() => {
            if (mine) setMyPantry(myItems);
            nav.go({ name: 'thinking', checkIn: { pantryId: pantryId!, energy, maxMinutes, confirmations: {}, myItems: mine ? myItems : undefined } });
          }}
        />
      }
    >
      <TopBar title="Saturday check-in" onBack={nav.back} />
      <Basil say="First, what's in your fridge and cupboard? Tick what you have, or try a sample kitchen.">
        <Text style={{ fontWeight: '700' }}>1.</Text> What’s in your fridge and cupboard?
      </Basil>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: mine }}
        onPress={() => setPantryId(MY_KITCHEN)}
        style={{ padding: space(4), borderRadius: radius.lg, borderWidth: 2, borderColor: mine ? colors.sage : colors.line, backgroundColor: mine ? colors.sageSoft : colors.card, gap: 2 }}
      >
        <Text style={{ fontWeight: '700', fontSize: font.large, color: colors.ink }}>{mine ? '✓ ' : ''}🧺 Tick what’s in my kitchen</Text>
        <Text style={{ color: colors.inkSoft, fontSize: font.small }}>
          {state.myPantry.length ? `Last time you had ${state.myPantry.length} things. Just change what’s different.` : 'About a minute. Only tick what you’re sure of.'}
        </Text>
      </Pressable>
      {mine ? (
        <View style={{ gap: space(3) }}>
          <MyPhotos onReading={onReading} />
          <FromPhotos reading={reading} ticked={myItems} toggle={toggleItem} />
          {SHELVES.map((sh) => (
            <Card key={sh.label}>
              <H2>{sh.label}</H2>
              <Row>
                {Object.values(INGREDIENTS)
                  .filter((i) => sh.groups.includes(i.group))
                  .map((i) => (
                    <Chip key={i.id} label={`${i.emoji} ${i.name}`} selected={myItems.includes(i.id)} onPress={() => toggleItem(i.id)} />
                  ))}
              </Row>
            </Card>
          ))}
          <P soft>{myItems.length} ticked. Anything you don’t tick, I’ll add to your shopping list if a dinner needs it.</P>
        </View>
      ) : null}
      <P soft>Or try Basil with a sample kitchen:</P>
      <View style={{ gap: space(3) }}>
        {PANTRY_PHOTOS.map((ph) => {
          const on = pantryId === ph.id;
          return (
            <Pressable
              key={ph.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setPantryId(ph.id)}
              style={{
                flexDirection: 'row',
                gap: space(3),
                alignItems: 'center',
                padding: space(3),
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: on ? colors.sage : colors.line,
                backgroundColor: on ? colors.sageSoft : colors.card,
              }}
            >
              <View style={{ backgroundColor: '#EDE7DC', borderRadius: radius.sm, padding: space(2), width: 150 }}>
                {ph.shelves.map((s, i) => (
                  <Text key={i} style={{ fontSize: 15, borderBottomWidth: 2, borderBottomColor: '#D6CCBC', textAlign: 'center' }}>
                    {s}
                  </Text>
                ))}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '700', fontSize: font.body, color: colors.ink }}>
                  {on ? '✓ ' : ''}
                  {ph.title}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: font.small }}>{ph.caption}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Basil say="How much energy do you have this week? Be honest, there's no wrong answer.">
        <Text style={{ fontWeight: '700' }}>2.</Text> How much energy do you have this week? No wrong answer.
      </Basil>
      <Segmented
        value={energy}
        onChange={setEnergy}
        options={[
          { value: 'low', label: '🪫 Low', sub: 'easiest only' },
          { value: 'ok', label: '🔋 Some', sub: 'a bit of chopping' },
          { value: 'good', label: '⚡ Good', sub: 'up for more' },
        ]}
      />
      <Basil say="And the longest you want to spend cooking on a weeknight?">
        <Text style={{ fontWeight: '700' }}>3.</Text> Longest you want to cook on a weeknight?
      </Basil>
      <Segmented
        value={maxMinutes}
        onChange={setMaxMinutes}
        options={[15, 20, 30].map((m) => ({ value: m, label: `${m} min` }))}
      />
    </Screen>
  );
}

const PHOTO_MESSAGE: Record<Exclude<AddResult, 'added' | 'cancelled'>, string> = {
  limit: `That’s your ${MAX_PHOTOS_PER_WEEK} photos for this week. You can still tick the list.`,
  no_permission: 'Basil needs permission to use the camera or photos. You can turn it on in your phone’s settings, or just tick the list.',
  failed: 'That photo didn’t save. Try again, or just tick the list.',
};

const READ_MESSAGE: Record<Unavailable, string> = {
  local: 'Photo reading isn’t available in this version. Tick what you see below.',
  not_set_up: 'Photo reading isn’t switched on for the pilot yet. Tick what you see below.',
  signed_out: 'Sign in to the pilot to let Basil read your photos. For now, tick what you see below.',
  busy: 'Basil is busy right now. Try “Read my photos” again in a minute, or tick the list.',
  unreadable: 'I couldn’t read that photo clearly. Try a brighter, closer photo, or tick what you see.',
  offline: 'No connection, so I couldn’t read the photo. Tick what you see, or try again later.',
};

/**
 * Up to 5 photos of the participant's own fridge and cupboard. They stay on this device and are
 * deleted at the end of the weekly planning cycle. With photo reading turned on, each one is also sent
 * once to Claude, and what it sees clearly is ticked on the list below.
 */
function MyPhotos({ onReading }: { onReading: (r: PhotoReading) => void }) {
  const { cycle, left, add, remove } = usePantryPhotos();
  const { state, setReadPhotos, logEvent } = useStore();
  const [busy, setBusy] = useState<null | 'saving' | 'reading'>(null);
  const [note, setNote] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const by = discardBy(cycle);
  const reads = photoReadingPossible && state.readPhotos;

  const readAll = async (photos: PantryPhotoShot[]) => {
    setBusy('reading');
    let found = 0;
    for (const p of photos) {
      const r = await readPantryPhoto(p.uri);
      logEvent({ type: 'pantry_read', outcome: r.ok ? 'ok' : r.why, sure: r.ok ? r.reading.sure.length : 0, unsure: r.ok ? r.reading.unsure.length : 0 });
      if (!r.ok) {
        setNote(READ_MESSAGE[r.why]);
        break;
      }
      setRead((cur) => [...cur, p.id]);
      onReading(r.reading);
      found += r.reading.sure.length + r.reading.unsure.length;
    }
    setBusy(null);
    return found;
  };

  const take = async (source: 'camera' | 'library') => {
    setBusy('saving');
    setNote(null);
    const { result, photo } = await add(source);
    setBusy(null);
    if (result !== 'added' && result !== 'cancelled') setNote(PHOTO_MESSAGE[result]);
    if (result === 'added' && photo && reads) {
      const found = await readAll([photo]);
      if (found === 0) setNote((n) => n ?? 'I couldn’t spot anything from Basil’s list in that one. Tick what you see, or try another angle.');
    }
  };
  const unread = cycle.photos.filter((p) => !read.includes(p.id));
  const viewed = cycle.photos.find((p) => p.id === viewing);

  return (
    <Card>
      <H2>📸 Photos of my fridge and cupboard (optional)</H2>
      <P soft>
        {reads ? 'Snap your shelves and I’ll tick what I can see. ' : 'Snap your shelves, then tick the list below while looking at them. '}
        Up to {MAX_PHOTOS_PER_WEEK} a week. They’re kept on this device and deleted when this week’s plan ends
        {by ? ` (by ${by.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} at the latest)` : ''}.
      </P>
      {photoReadingPossible ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: state.readPhotos }}
          onPress={() => {
            setNote(null);
            setReadPhotos(!state.readPhotos);
          }}
          style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-start', padding: space(3), borderRadius: radius.md, borderWidth: 1.5, borderColor: state.readPhotos ? colors.sage : colors.line, backgroundColor: state.readPhotos ? colors.sageSoft : colors.card }}
        >
          <Text style={{ fontSize: 20, color: colors.sage, width: 24 }}>{state.readPhotos ? '☑' : '☐'}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontWeight: '700', fontSize: font.body, color: colors.ink }}>Let Basil read my photos</Text>
            <Text style={{ color: colors.inkSoft, fontSize: font.small, lineHeight: 20 }}>
              Each photo is sent once to Claude, an AI made by Anthropic, to spot food. Basil doesn’t keep a copy anywhere but this device. Keep people and papers out of the shot. You can turn this off any time.
            </Text>
          </View>
        </Pressable>
      ) : null}
      {cycle.photos.length ? (
        <Row>
          {cycle.photos.map((p) => (
            <View key={p.id}>
              <Pressable accessibilityRole="imagebutton" accessibilityLabel="View photo larger" onPress={() => setViewing(p.id)}>
                <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: radius.sm, backgroundColor: colors.line }} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={8}
                onPress={() => remove(p.id)}
                style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(31,42,36,0.75)', borderRadius: 999, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>×</Text>
              </Pressable>
            </View>
          ))}
        </Row>
      ) : null}
      <Row style={{ flexWrap: 'nowrap' }}>
        <Button
          style={{ flex: 1 }}
          kind="secondary"
          label={busy === 'saving' ? 'Saving…' : busy === 'reading' ? 'Reading…' : '📷 Camera'}
          disabled={!!busy || left === 0}
          onPress={() => take('camera')}
        />
        <Button style={{ flex: 1 }} kind="secondary" label="🖼️ My photos" disabled={!!busy || left === 0} onPress={() => take('library')} />
      </Row>
      {reads && unread.length && !busy ? (
        <Button kind="ghost" label={`🔍 Read my ${unread.length === 1 ? 'photo' : `${unread.length} photos`}`} onPress={() => { setNote(null); readAll(unread); }} />
      ) : null}
      <P soft>
        {left} of {MAX_PHOTOS_PER_WEEK} photos left this week.
        {reads ? ' I only tick what I can see clearly, so check the list before planning.' : ' You tick what you see.'}
      </P>
      {note ? <P style={{ color: colors.danger }}>{note}</P> : null}
      <Modal visible={!!viewed} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable accessibilityLabel="Close photo" onPress={() => setViewing(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: space(4) }}>
          {viewed ? <Image source={{ uri: viewed.uri }} resizeMode="contain" style={{ width: '100%', height: '85%' }} /> : null}
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: space(3), fontSize: font.body }}>Tap to close</Text>
        </Pressable>
      </Modal>
    </Card>
  );
}

/** What Claude saw: clear items are already ticked; unsure ones are offered for the participant to confirm. */
function FromPhotos({ reading, ticked, toggle }: { reading: PhotoReading; ticked: string[]; toggle: (id: string) => void }) {
  if (!reading.sure.length && !reading.unsure.length && !reading.other.length) return null;
  return (
    <Card tone="peach">
      <H2>🔍 From your photos</H2>
      {reading.sure.length ? (
        <P>
          I ticked {reading.sure.length} {reading.sure.length === 1 ? 'thing' : 'things'} I could see clearly: {reading.sure.map((id) => ingredient(id).name).join(', ')}. Untick anything that’s wrong or nearly used up.
        </P>
      ) : null}
      {reading.unsure.length ? (
        <>
          <P>I’m not sure about these. Tap the ones you have:</P>
          <Row>
            {reading.unsure.map((id) => (
              <Chip key={id} label={`${ingredient(id).emoji} ${ingredient(id).name}`} selected={ticked.includes(id)} onPress={() => toggle(id)} />
            ))}
          </Row>
        </>
      ) : null}
      {reading.other.length ? <P soft>Also spotted (not in Basil’s list yet): {reading.other.join(', ')}.</P> : null}
    </Card>
  );
}

/** Shows the agent's observe/decide/act/check loop step by step, then hands over to the result. */
export function Thinking({ checkIn }: { checkIn: CheckInData }) {
  const nav = useNav();
  const { state, setWeek, logEvent } = useStore();
  const [shown, setShown] = useState<TraceStep[]>([]);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const result = planWeek({
      profile: state.profile!,
      inventory: inventoryFor(checkIn.pantryId, checkIn.myItems).items,
      confirmations: checkIn.confirmations,
      energy: checkIn.energy,
      maxMinutes: checkIn.maxMinutes,
      history: state.history,
      rejected: [],
      learned: state.learned,
    });
    const timers: ReturnType<typeof setTimeout>[] = [];
    result.trace.forEach((t, i) => timers.push(setTimeout(() => setShown((s) => [...s, t]), 450 + i * 650)));
    timers.push(
      setTimeout(() => {
        if (result.status === 'needs_clarification') {
          nav.replace({ name: 'clarify', checkIn });
          return;
        }
        logEvent({ type: 'week_started', pantryId: checkIn.pantryId, energy: checkIn.energy, maxMinutes: checkIn.maxMinutes });
        setWeek({
          pantryId: checkIn.pantryId,
          myItems: checkIn.myItems,
          confirmations: checkIn.confirmations,
          energy: checkIn.energy,
          maxMinutes: checkIn.maxMinutes,
          meals: result.meals,
          rejected: [],
          cartRemoved: [],
          planApproved: false,
          cartApproved: false,
          cooked: result.meals.map(() => null),
          inRange: result.meals.map(() => null),
          today: 0,
        });
        nav.replace({ name: 'plan' });
      }, 450 + result.trace.length * 650 + 900),
    );
    Animated.loop(Animated.sequence([Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(fade, { toValue: 0.3, duration: 700, useNativeDriver: true })])).start();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icon = { observe: '👀', decide: '🤔', act: '📝', check: '🛡️' };
  return (
    <Screen>
      <TopBar title="Planning" />
      <Animated.View style={{ alignSelf: 'center', opacity: fade, marginVertical: space(4) }}>
        <Text style={{ fontSize: 64 }}>🌿</Text>
      </Animated.View>
      <H2>Basil is planning your week…</H2>
      <P soft>
        {ENERGY_LABEL[checkIn.energy]} · up to {checkIn.maxMinutes} min · {inventoryFor(checkIn.pantryId, checkIn.myItems).title}
      </P>
      <View style={{ gap: space(2) }}>
        {shown.map((t, i) => (
          <Card key={i} style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 22 }}>{icon[t.phase]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.sage, textTransform: 'uppercase', letterSpacing: 1 }}>{t.phase}</Text>
              <P>{t.text}</P>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

/** The agent stopped because the photo was unclear. The user answers before anything is planned. */
export function Clarify({ checkIn }: { checkIn: CheckInData }) {
  const nav = useNav();
  const unsure = inventoryFor(checkIn.pantryId, checkIn.myItems).items.filter((i) => i.confidence === 'unsure');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const allAnswered = unsure.every((i) => answers[i.id] !== undefined);
  const line = 'Before I plan anything, I need to check a couple of things I couldn’t see clearly. I’d rather ask than guess.';

  return (
    <Screen
      footer={
        <Button
          label="Carry on planning"
          disabled={!allAnswered}
          onPress={() => nav.replace({ name: 'thinking', checkIn: { ...checkIn, confirmations: answers } })}
        />
      }
    >
      <TopBar title="Quick check" onBack={nav.back} />
      <Basil say={line}>{line}</Basil>
      {unsure.map((item) => (
        <Card key={item.id} tone="peach">
          <H2>
            {ingredient(item.id).emoji} {item.question}
          </H2>
          <Row>
            <Button style={{ flex: 1 }} kind={answers[item.id] === true ? 'primary' : 'secondary'} label="Yes" onPress={() => setAnswers({ ...answers, [item.id]: true })} />
            <Button style={{ flex: 1 }} kind={answers[item.id] === false ? 'primary' : 'secondary'} label="No / not sure" onPress={() => setAnswers({ ...answers, [item.id]: false })} />
          </Row>
        </Card>
      ))}
      <P soft>If you’re not sure, I’ll treat it as missing so you don’t end up without it.</P>
    </Screen>
  );
}

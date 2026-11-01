// Dinner time: portion picture, one step at a time, video link, then "Did you cook this dinner?"

import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { dish, videoSearchUrl } from '../data/dishes';
import { ingredient } from '../data/ingredients';
import { videoFor } from '../data/videos';
import { VideoPlayer } from '../ui/VideoPlayer';
import { useNav } from '../nav';
import { useStore } from '../state/store';
import { Basil, Button, Card, H1, H2, P, Plate, ProgressBar, Row, Screen, TopBar } from '../ui/components';
import { colors, font, radius, space } from '../ui/theme';

export function Cook({ index }: { index: number }) {
  const { state, logEvent } = useStore();
  const nav = useNav();
  const meal = state.week!.meals[index];
  const d = dish(meal.dishId);
  const [step, setStep] = useState(-1); // -1 = overview
  const [asking, setAsking] = useState(false);

  // Pilot signal: how far through the steps the participant got before leaving this screen.
  const furthest = useRef({ step: -1, finished: false });
  furthest.current.step = Math.max(furthest.current.step, step);
  useEffect(
    () => () => {
      const f = furthest.current;
      if (f.step >= 0) logEvent({ type: 'cooking_session', dishId: d.id, stepReached: f.step + 1, totalSteps: d.steps.length, finished: f.finished });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onLast = step === d.steps.length - 1;
  return (
    <Screen
      footer={
        step === -1 ? (
          <View style={{ gap: space(2) }}>
            <Button label="Start step 1" onPress={() => setStep(0)} />
            <Button kind="ghost" label="I’m not cooking tonight" onPress={() => setAsking(true)} />
          </View>
        ) : (
          <Row style={{ flexWrap: 'nowrap' }}>
            <Button style={{ flex: 1 }} kind="secondary" label="Back" onPress={() => setStep(step - 1)} />
            <Button style={{ flex: 2 }} label={onLast ? 'Done! 🍽️' : 'Next step'} onPress={() => { if (onLast) { furthest.current.finished = true; setAsking(true); } else setStep(step + 1); }} />
          </Row>
        )
      }
    >
      <TopBar title={`${meal.day} dinner`} onBack={nav.back} />
      <H1>
        {d.emoji} {d.name}
      </H1>
      {step === -1 ? (
        <>
          <Basil say={`Tonight is ${d.name}. It takes about ${d.minutes} minutes. Get your ingredients out first, then we'll go one step at a time.`}>
            About {d.minutes} minutes{d.onePan ? ', one pan' : ''}. Get everything out first, then we’ll go one step at a time.
          </Basil>
          <Card>
            <H2>What your plate should look like</H2>
            <Plate {...d.plate} />
            <P soft style={{ textAlign: 'center' }}>
              {d.portionTip}
            </P>
            {meal.notes.map((n) => (
              <P key={n}>💡 {n}</P>
            ))}
          </Card>
          <Card>
            <H2>Get these out</H2>
            {d.ingredients.map((id) => (
              <P key={id}>
                {ingredient(id).emoji} {ingredient(id).name}
              </P>
            ))}
          </Card>
          <VideoPlayer
            video={videoFor(d.id)}
            searchUrl={videoSearchUrl(d)}
            onOpened={() => logEvent({ type: 'video_opened', dishId: d.id })}
            onWatched={(w) => logEvent({ type: 'video_watched', dishId: d.id, ...w })}
          />
        </>
      ) : (
        <>
          <ProgressBar value={(step + 1) / d.steps.length} />
          <P soft>
            Step {step + 1} of {d.steps.length}
          </P>
          <Card style={{ minHeight: 180, justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, lineHeight: 34, color: colors.ink, fontWeight: '600' }}>{d.steps[step]}</Text>
          </Card>
        </>
      )}
      <FeedbackModal index={index} visible={asking} onClose={() => setAsking(false)} onDone={nav.home} />
    </Screen>
  );
}

/** The PRD's after-dinner popup: cooked yes/no, then a simple glucose yes/no. */
export function FeedbackModal({ index, visible, onClose, onDone }: { index: number; visible: boolean; onClose: () => void; onDone: () => void }) {
  const { state, updateWeek, recordFeedback, logEvent } = useStore();
  const [stage, setStage] = useState<'cooked' | 'glucose' | 'thanks'>('cooked');
  const [cooked, setCooked] = useState<boolean | null>(null);
  const week = state.week!;
  const meal = week.meals[index];
  const d = dish(meal.dishId);
  const cookedSoFar = week.cooked.filter((c, i) => c === true && i !== index).length + (cooked ? 1 : 0);

  const finish = (inRange: boolean | null) => {
    updateWeek((w) => ({
      ...w,
      cooked: w.cooked.map((c, i) => (i === index ? cooked : c)),
      inRange: w.inRange.map((r, i) => (i === index ? inRange : r)),
      today: Math.max(w.today, index + 1),
    }));
    recordFeedback(meal.dishId, { cooked: cooked ?? undefined, inRange: inRange ?? undefined });
    logEvent({ type: 'meal_outcome', dishId: meal.dishId, cooked: cooked === true, inRange });
    setStage('thanks');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,30,25,0.45)', justifyContent: 'center', padding: space(4) }}>
        <View style={{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: space(5), gap: space(4), width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          {stage === 'cooked' ? (
            <>
              <Text style={{ fontSize: 44, textAlign: 'center' }}>{d.emoji}</Text>
              <H2>Did you cook this dinner?</H2>
              <P soft>{d.name}</P>
              <Row style={{ flexWrap: 'nowrap' }}>
                <Button style={{ flex: 1 }} label="✅ Yes" onPress={() => { setCooked(true); setStage('glucose'); }} />
                <Button style={{ flex: 1 }} kind="secondary" label="Not tonight" onPress={() => { setCooked(false); finishLater(false); }} />
              </Row>
              <Pressable onPress={onClose} style={{ alignSelf: 'center' }}>
                <Text style={{ color: colors.inkSoft }}>Ask me later</Text>
              </Pressable>
            </>
          ) : null}
          {stage === 'glucose' ? (
            <>
              <H2>Check your glucose monitor</H2>
              <P>Did this meal keep you between 70 and 140 mg/dL?</P>
              <Row style={{ flexWrap: 'nowrap' }}>
                <Button style={{ flex: 1 }} kind="secondary" label="👍 Yes" onPress={() => finish(true)} />
                <Button style={{ flex: 1 }} kind="secondary" label="👎 No" onPress={() => finish(false)} />
              </Row>
              <Pressable onPress={() => finish(null)} style={{ alignSelf: 'center' }}>
                <Text style={{ color: colors.inkSoft }}>Skip</Text>
              </Pressable>
              <P soft style={{ fontSize: font.small }}>
                This only helps me plan portions. It isn’t medical advice. If your readings worry you, contact your care team.
              </P>
            </>
          ) : null}
          {stage === 'thanks' ? (
            <>
              <Text style={{ fontSize: 44, textAlign: 'center' }}>{cooked ? '🌟' : '💚'}</Text>
              <H2>{cooked ? 'Nice one!' : 'That’s okay.'}</H2>
              <P>
                {cooked
                  ? `That’s ${cookedSoFar} of ${week.meals.length} this week.${cookedSoFar >= 4 ? ' You’ve hit your goal!' : ''}`
                  : 'Tomorrow is a fresh start. I’ve kept tonight’s ingredients in mind.'}
              </P>
              <Button label="Close" onPress={() => { setStage('cooked'); onClose(); onDone(); }} />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  function finishLater(c: boolean) {
    updateWeek((w) => ({
      ...w,
      cooked: w.cooked.map((x, i) => (i === index ? c : x)),
      today: Math.max(w.today, index + 1),
    }));
    recordFeedback(meal.dishId, { cooked: c });
    logEvent({ type: 'meal_outcome', dishId: meal.dishId, cooked: c, inRange: null });
    setStage('thanks');
  }
}

import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavProvider, useNav } from './src/nav';
import { Baseline } from './src/screens/Baseline';
import { Cart } from './src/screens/Cart';
import { CONSENT_VERSION, Consent } from './src/screens/Consent';
import { CheckIn, Clarify, Thinking } from './src/screens/CheckIn';
import { Cook } from './src/screens/Cook';
import { Evals } from './src/screens/Evals';
import { Feedback } from './src/screens/Feedback';
import { Home } from './src/screens/Home';
import { Plan } from './src/screens/Plan';
import { Progress } from './src/screens/Progress';
import { Store } from './src/screens/Store';
import { Triage, TriageEdit } from './src/screens/Triage';
import { AuthProvider, useAuth } from './src/pilot/backend';
import { PilotSync } from './src/pilot/PilotSync';
import { SignIn } from './src/screens/SignIn';
import { StoreProvider, useStore } from './src/state/store';
import { colors } from './src/ui/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <PilotSync />
          <Root />
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { state, ready } = useStore();
  const auth = useAuth();
  if (!ready || !auth.ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.sage} />
      </View>
    );
  }
  // Pilot consent comes before anything else, and again whenever the consent text changes.
  if (!state.consent || state.consent.version < CONSENT_VERSION) {
    return (
      <NavProvider key="consent" initial={{ name: 'home' }}>
        <Consent mode="first" />
      </NavProvider>
    );
  }
  // With the pilot backend switched on, only invited, signed-in participants get past this point.
  if (auth.enabled && !auth.session) return <SignIn />;
  // Remount navigation when the profile appears or is reset so the stack starts in the right place.
  return (
    <NavProvider key={state.profile ? 'app' : 'triage'} initial={state.profile ? { name: 'home' } : { name: 'triage', mode: 'first' }}>
      <Router />
    </NavProvider>
  );
}

function Router() {
  const { route } = useNav();
  const { state, logEvent } = useStore();
  // Pilot signal: which screens are reached, so the PM can see where a workflow was abandoned.
  useEffect(() => {
    logEvent({ type: 'screen', screen: route.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);
  switch (route.name) {
    case 'triage':
      return route.mode === 'first' ? <Triage /> : <TriageEdit key={route.step} step={route.step} />;
    case 'baseline':
      return <Baseline mode={route.mode} />;
    case 'checkin':
      return <CheckIn />;
    case 'thinking':
      return <Thinking checkIn={route.checkIn} />;
    case 'clarify':
      return <Clarify checkIn={route.checkIn} />;
    case 'evals':
      return <Evals />;
    case 'feedback':
      return <Feedback after={route.after} />;
    case 'consent':
      return <Consent mode="view" />;
  }
  // Every other screen needs a week in progress.
  if (!state.week) return <Home />;
  switch (route.name) {
    case 'plan':
      return <Plan />;
    case 'cart':
      return <Cart />;
    case 'store':
      return <Store initial={route.stage} />;
    case 'cook':
      return <Cook index={route.index} />;
    case 'progress':
      return <Progress />;
    default:
      return <Home />;
  }
}

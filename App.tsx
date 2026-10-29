import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavProvider, useNav } from './src/nav';
import { Baseline } from './src/screens/Baseline';
import { Cart } from './src/screens/Cart';
import { CheckIn, Clarify, Thinking } from './src/screens/CheckIn';
import { Cook } from './src/screens/Cook';
import { Evals } from './src/screens/Evals';
import { Home } from './src/screens/Home';
import { Plan } from './src/screens/Plan';
import { Progress } from './src/screens/Progress';
import { Store } from './src/screens/Store';
import { Triage, TriageEdit } from './src/screens/Triage';
import { StoreProvider, useStore } from './src/state/store';
import { colors } from './src/ui/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { state, ready } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.sage} />
      </View>
    );
  }
  // Remount navigation when the profile appears or is reset so the stack starts in the right place.
  return (
    <NavProvider key={state.profile ? 'app' : 'triage'} initial={state.profile ? { name: 'home' } : { name: 'triage', mode: 'first' }}>
      <Router />
    </NavProvider>
  );
}

function Router() {
  const { route } = useNav();
  const { state } = useStore();
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

// While a participant is signed in, keep their pilot record in the backend up to date: a few seconds
// after anything new is logged, upload the latest export. Renders nothing.

import { useEffect } from 'react';
import appJson from '../../app.json';
import { useStore } from '../state/store';
import { uploadExport, useAuth } from './backend';
import { buildExport } from './signals';

export function PilotSync() {
  const { state } = useStore();
  const { session } = useAuth();
  const count = state.events.length + state.feedback.length;

  useEffect(() => {
    if (!session || !state.participantId || count === 0) return;
    const t = setTimeout(() => {
      uploadExport(buildExport(state.participantId, state.events, state.feedback, appJson.expo.version)).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, count]);

  return null;
}

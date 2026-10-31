/// <reference types="node" />
// PM only: download every participant's latest pilot export from Supabase into pilot-data/, ready for
// `npm run pilot:report`. Needs the service-role key, which must never be committed or put in the app:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run pilot:pull

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { isPilotExport } from '../src/pilot/signals';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase > Project Settings > API).');
  process.exit(1);
}

(async () => {
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from('pilot_exports').select('participant_id, export, updated_at');
  if (error) throw new Error(error.message);
  const dir = process.argv[2] ?? 'pilot-data';
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const row of data ?? []) {
    if (!isPilotExport(row.export)) continue;
    writeFileSync(join(dir, `basil-pilot-${row.participant_id}.json`), JSON.stringify(row.export, null, 2));
    n++;
  }
  console.log(`Saved ${n} participant export(s) to ${dir}/. Next: npm run pilot:report`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

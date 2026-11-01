// Hands the participant's pilot export to them so they can send it to the Product Manager.
// Web: downloads a .json file. iOS/Android: opens the share sheet (email, Messages, Drive...).

import { Platform, Share } from 'react-native';
import { PilotExport } from './signals';

export function exportFileName(data: PilotExport): string {
  return `basil-pilot-${data.participantId}-${data.exportedAt.slice(0, 10)}.json`;
}

export async function sharePilotExport(data: PilotExport): Promise<'downloaded' | 'shared' | 'dismissed'> {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(data);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  }
  const res = await Share.share({ title: exportFileName(data), message: json });
  return res.action === Share.sharedAction ? 'shared' : 'dismissed';
}

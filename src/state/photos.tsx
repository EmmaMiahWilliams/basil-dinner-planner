// The participant's own fridge and cupboard photos for this week's check-in.
//
// Photos are kept on this device, never put in the pilot export, and kept apart from the main app state.
// If the participant turns on photo reading, each photo is also sent once to Basil's recognize-pantry
// function to be read by Claude (src/pilot/recognize.ts); it isn't stored there. Up to 5 can be taken per weekly planning cycle, and all of them
// are discarded when the cycle ends (see photoRules.ts).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useStore } from './store';
import { PantryPhotoShot, PhotoCycle, addPhoto, cycleEnded, cycleKey, emptyCycle, photosLeft, removePhoto } from './photoRules';

const KEY = 'dinner-planner/pantry-photos/v1';
/** Long edge after resizing: plenty to read labels, small enough (~100–200 KB) to keep 5 on the device. */
const MAX_EDGE = 1280;

export type AddResult = 'added' | 'limit' | 'cancelled' | 'no_permission' | 'failed';

type Ctx = {
  cycle: PhotoCycle;
  left: number;
  /** Takes or picks a photo. On 'added', also returns the saved photo so it can be read. */
  add: (source: 'camera' | 'library') => Promise<{ result: AddResult; photo?: PantryPhotoShot }>;
  remove: (id: string) => void;
};

const PhotosContext = createContext<Ctx | null>(null);

/** Best effort: delete the picker's and resizer's temporary files on phones. Web has none to delete. */
function deleteTemp(...uris: (string | undefined)[]) {
  if (Platform.OS === 'web') return;
  for (const uri of uris) {
    if (!uri || uri.startsWith('data:')) continue;
    try {
      new File(uri).delete();
    } catch {
      // Already gone, or in a folder the OS clears itself.
    }
  }
}

export function PhotosProvider({ children }: { children: ReactNode }) {
  const { state, ready: storeReady, logEvent } = useStore();
  const key = cycleKey(state.participantId, state.pastWeeks.length, !!state.profile);
  const [cycle, setCycle] = useState<PhotoCycle>(emptyCycle(key));
  const [loaded, setLoaded] = useState(false);
  const cycleRef = useRef(cycle);
  cycleRef.current = cycle;

  const discard = (reason: string) => {
    const had = cycleRef.current.photos.length;
    setCycle(emptyCycle(key));
    AsyncStorage.removeItem(KEY).catch(() => {});
    if (had) logEvent({ type: 'pantry_photo', action: 'discarded', count: had, reason });
  };

  // Load once the main store knows who this is, and discard straight away if the cycle has ended.
  useEffect(() => {
    if (!storeReady || loaded) return;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved: PhotoCycle | null = raw ? JSON.parse(raw) : null;
        if (saved && !cycleEnded(saved, key, new Date())) setCycle(saved);
        else if (saved) {
          AsyncStorage.removeItem(KEY).catch(() => {});
          if (saved.photos.length) logEvent({ type: 'pantry_photo', action: 'discarded', count: saved.photos.length, reason: 'cycle_ended' });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeReady]);

  // The week was finished, or the participant started over or left the pilot: discard this cycle.
  useEffect(() => {
    if (loaded && cycle.key !== key) discard('week_ended');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loaded]);

  // Seven days after the first photo, discard even if the week was never finished. Checked hourly
  // while the app is open, and on every launch above.
  useEffect(() => {
    if (!loaded) return;
    const t = setInterval(() => {
      if (cycleEnded(cycleRef.current, key, new Date())) discard('cycle_ended');
    }, 60 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, key]);

  useEffect(() => {
    if (!loaded) return;
    if (cycle.startedAt) AsyncStorage.setItem(KEY, JSON.stringify(cycle)).catch(() => {});
  }, [cycle, loaded]);

  const value = useMemo<Ctx>(
    () => ({
      cycle,
      left: photosLeft(cycle),
      add: async (source) => {
        if (photosLeft(cycleRef.current) === 0) return { result: 'limit' };
        try {
          if (Platform.OS !== 'web') {
            const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) return { result: 'no_permission' };
          }
          const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, exif: false };
          const picked = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
          if (picked.canceled || !picked.assets[0]) return { result: 'cancelled' };
          const asset = picked.assets[0];
          const landscape = (asset.width ?? 0) > (asset.height ?? 0);
          const ref = await ImageManipulator.manipulate(asset.uri)
            .resize(landscape ? { width: MAX_EDGE } : { height: MAX_EDGE })
            .renderAsync();
          const out = await ref.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
          deleteTemp(asset.uri, out.uri);
          if (!out.base64) return { result: 'failed' };
          const at = new Date().toISOString();
          const photo = { id: `ph-${Date.now()}`, uri: `data:image/jpeg;base64,${out.base64}`, at };
          const next = addPhoto(cycleRef.current, photo);
          if (!next) return { result: 'limit' };
          setCycle(next);
          logEvent({ type: 'pantry_photo', action: 'added', count: next.photos.length });
          return { result: 'added', photo };
        } catch {
          return { result: 'failed' };
        }
      },
      remove: (id) => {
        setCycle((c) => removePhoto(c, id));
        logEvent({ type: 'pantry_photo', action: 'removed', count: cycleRef.current.photos.length - 1 });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle],
  );

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePantryPhotos(): Ctx {
  const ctx = useContext(PhotosContext);
  if (!ctx) throw new Error('usePantryPhotos outside PhotosProvider');
  return ctx;
}

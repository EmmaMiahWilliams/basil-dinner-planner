// iOS/Android: open the dish's video (or a search, if none is set yet) in the YouTube app or browser.
// The web build (VideoPlayer.web.tsx) plays it inside Basil instead, so watch-time can be measured.

import { Linking } from 'react-native';
import { DishVideo, linkFor } from '../data/videos';
import { Button } from './components';

export type VideoPlayerProps = {
  video: DishVideo | null;
  searchUrl: string;
  onOpened: () => void;
  onWatched: (w: { watchedSeconds: number; durationSeconds: number; completed: boolean }) => void;
};

export { linkFor };

export function VideoPlayer({ video, searchUrl, onOpened }: VideoPlayerProps) {
  return (
    <Button
      kind="secondary"
      label={video ? `▶ ${video.title}` : '▶ Find a short video'}
      onPress={() => {
        onOpened();
        Linking.openURL(linkFor(video, searchUrl));
      }}
    />
  );
}

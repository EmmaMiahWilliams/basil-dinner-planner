// Web: play the dish's video inside Basil and measure how much of it was watched, so the pilot can
// see video drop-off. YouTube videos use the YouTube IFrame API; .mp4 links use a plain <video>.

import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, P } from './components';
import { radius } from './theme';
import { VideoPlayerProps, linkFor } from './VideoPlayer';

type Watch = { max: number; duration: number; ended: boolean };

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<any> | null = null;
function loadYouTube(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytReady) {
    ytReady = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return ytReady;
}

export { linkFor };

export function VideoPlayer({ video, searchUrl, onOpened, onWatched }: VideoPlayerProps) {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement | null>(null);
  const watch = useRef<Watch>({ max: 0, duration: 0, ended: false });

  // Report once, when the player closes or the participant leaves the screen.
  const report = () => {
    const w = watch.current;
    if (w.max > 0) onWatched({ watchedSeconds: Math.round(w.max), durationSeconds: Math.round(w.duration), completed: w.ended || (w.duration > 0 && w.max >= 0.9 * w.duration) });
    watch.current = { max: 0, duration: 0, ended: false };
  };

  useEffect(() => {
    if (!open || !video || !('youtubeId' in video) || !host.current) return;
    let player: any;
    let timer: ReturnType<typeof setInterval>;
    let cancelled = false;
    const el = document.createElement('div');
    host.current.appendChild(el);
    loadYouTube().then((YT) => {
      if (cancelled) return;
      player = new YT.Player(el, {
        videoId: video.youtubeId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.ENDED) watch.current.ended = true;
          },
        },
      });
      timer = setInterval(() => {
        if (!player?.getCurrentTime) return;
        watch.current.max = Math.max(watch.current.max, player.getCurrentTime() || 0);
        watch.current.duration = player.getDuration() || watch.current.duration;
      }, 1000);
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      report();
      player?.destroy?.();
      el.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // mp4: report on close/unmount too.
  useEffect(() => {
    if (!open || !video || 'youtubeId' in video) return;
    return report;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!video) {
    return (
      <Button
        kind="secondary"
        label="▶ Find a short video"
        onPress={() => {
          onOpened();
          Linking.openURL(linkFor(video, searchUrl));
        }}
      />
    );
  }

  if (!open) {
    return (
      <Button
        kind="secondary"
        label={`▶ ${video.title}`}
        onPress={() => {
          onOpened();
          setOpen(true);
        }}
      />
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' }}>
        {'youtubeId' in video ? (
          <div ref={host} style={{ width: '100%', height: '100%' }} />
        ) : (
          <video
            src={video.mp4Url}
            controls
            playsInline
            style={{ width: '100%', height: '100%' }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              watch.current.max = Math.max(watch.current.max, v.currentTime);
              watch.current.duration = v.duration || 0;
            }}
            onEnded={() => (watch.current.ended = true)}
          />
        )}
      </View>
      <P soft>{video.title}</P>
      <Button kind="ghost" label="Close video" onPress={() => setOpen(false)} />
    </View>
  );
}

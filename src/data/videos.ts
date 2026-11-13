// Real cooking videos, one per dish. Each one is played inside Basil (web) so the pilot can measure
// where people stop watching. The Product Manager vets every video before it goes in: it must cook the
// same dish with the same ingredients, and must not add anything a participant could be allergic to
// that isn't already in Basil's recipe.
//
// To add one: remove the `//` at the start of the dish's line and paste the YouTube link exactly as you
// copied it (youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…, with or without a start time like
// &t=45s). A direct .mp4 link you host yourself also works. Dishes without a link fall back to a
// YouTube search link, as before. `npm run features:check` flags any link Basil can't read.

export type DishVideo =
  | { youtubeId: string; title: string; startSeconds?: number }
  | { mp4Url: string; title: string };

/** What goes in the list below: the link as pasted, and the title shown on the button. */
export type VettedVideo = { url: string; title: string };

export const DISH_VIDEOS: Record<string, VettedVideo> = {
  // chickpea_spinach_curry: { url: 'PASTE LINK HERE', title: 'Chickpea & spinach curry' },
  tofu_broccoli_stirfry: { url: 'https://youtube.com/shorts/Bnw1QM0aS04?si=Tz1SsC7pqkEb4K-S', title: 'Tofu & broccoli stir-fry' },
  lentil_soup: { url: 'https://youtube.com/shorts/xGEr3FPUJ84?si=SqL6UOCJ1w4DxOKO', title: 'Red lentil & tomato soup' },
  // salmon_traybake: { url: 'PASTE LINK HERE', title: 'Salmon & greens traybake' },
  turkey_chilli: { url: 'https://youtube.com/shorts/hD_TqTHWbPs?si=0a1svvGVcpwdcPgK', title: 'Turkey & black bean chilli' },
  // egg_veg_frittata: { url: 'PASTE LINK HERE', title: 'Spinach & mushroom frittata' },
  // chicken_fajita_wraps: { url: 'PASTE LINK HERE', title: 'Chicken fajita wraps' },
  bean_quinoa_bowl: { url: 'https://youtube.com/shorts/xsikb5VYi1k?si=3HhvJHjmCZeTvZAd', title: 'No-cook bean & quinoa bowl' },
  // cauli_dal: { url: 'PASTE LINK HERE', title: 'Cauliflower & lentil dal' },
  edamame_soba: { url: 'https://youtube.com/shorts/_qwBuuWunBo?si=RphNxVqTocuzdZ6z', title: 'Edamame soba with greens' },
  // stuffed_sweet_potato: { url: 'PASTE LINK HERE', title: 'Black bean stuffed sweet potato' },
  // peanut_noodles: { url: 'PASTE LINK HERE', title: 'Peanut satay noodles' },
  // beef_bolognese: { url: 'PASTE LINK HERE', title: 'Beef bolognese' },
  // prawn_stirfry: { url: 'PASTE LINK HERE', title: 'Garlic prawn stir-fry' },
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** "45", "45s", "1m30s", "1h2m3s" → seconds. */
function parseStart(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (!m) return undefined;
  const s = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return s > 0 ? s : undefined;
}

/** Turns a pasted link into something the player can use, or null if Basil can't read it. */
export function parseVideoLink(url: string, title: string): DishVideo | null {
  const raw = url.trim();
  if (YT_ID.test(raw)) return { youtubeId: raw, title };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = /^\/(?:shorts|embed|live)\/([^/]+)/.exec(u.pathname);
      id = m ? m[1] : null;
    }
  } else if (/\.mp4$/i.test(u.pathname)) return { mp4Url: raw, title };
  if (!id || !YT_ID.test(id)) return null;
  const startSeconds = parseStart(u.searchParams.get('t') ?? u.searchParams.get('start'));
  return startSeconds ? { youtubeId: id, title, startSeconds } : { youtubeId: id, title };
}

export function videoFor(dishId: string): DishVideo | null {
  const v = DISH_VIDEOS[dishId];
  return v ? parseVideoLink(v.url, v.title) : null;
}

/** Where the phone app (and the no-video fallback) sends people: the video on YouTube, or a search. */
export function linkFor(video: DishVideo | null, searchUrl: string): string {
  if (!video) return searchUrl;
  if (!('youtubeId' in video)) return video.mp4Url;
  return `https://www.youtube.com/watch?v=${video.youtubeId}${video.startSeconds ? `&t=${video.startSeconds}s` : ''}`;
}

// Real cooking videos, one per dish. Each one is played inside Basil so the pilot can measure where
// people stop watching. The Product Manager vets every video before it goes in: it must cook the same
// dish with the same ingredients, and must not add anything a participant could be allergic to that
// isn't already in Basil's recipe.
//
// To add one: paste the YouTube video id (the part after "v=" in the link), or a direct .mp4 link
// you host yourself. Dishes without an entry fall back to a YouTube search link, as before.

export type DishVideo = { youtubeId: string; title: string } | { mp4Url: string; title: string };

export const DISH_VIDEOS: Record<string, DishVideo> = {
  // chickpea_spinach_curry: { youtubeId: 'XXXXXXXXXXX', title: 'Chickpea & spinach curry in 20 minutes' },
};

export function videoFor(dishId: string): DishVideo | null {
  return DISH_VIDEOS[dishId] ?? null;
}

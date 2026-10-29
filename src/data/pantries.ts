// Fixed synthetic pantry/fridge "photos". Each has a known inventory so the demo and evals are repeatable.

export type InventoryItem = {
  id: string;
  /** "unsure" means the photo could not identify the item clearly; the agent must ask. */
  confidence: 'sure' | 'unsure';
  /** Shown to the user when the item is unsure. */
  question?: string;
};

export type PantryPhoto = {
  id: string;
  title: string;
  caption: string;
  /** Emoji rows that stand in for the photo on screen. */
  shelves: string[];
  items: InventoryItem[];
};

const sure = (...ids: string[]): InventoryItem[] => ids.map((id) => ({ id, confidence: 'sure' as const }));

export const PANTRY_PHOTOS: PantryPhoto[] = [
  {
    id: 'stocked',
    title: 'Well-stocked kitchen',
    caption: 'Fridge and cupboard after last week’s shop',
    shelves: ['🥬 🥦 🍄 🧅 🧄', '🥚 🧈 🧀 🍋 🍅', '🥫 🥫 🫘 🍚 🌻', '🫒 🍛 🍶 🥥 🧂'],
    items: sure(
      'spinach', 'broccoli', 'mushrooms', 'onion', 'garlic',
      'eggs', 'tofu', 'feta', 'lemon', 'cherry_tomatoes',
      'chickpeas', 'tomatoes', 'lentils', 'brown_rice', 'pumpkin_seeds',
      'olive_oil', 'curry_paste', 'soy_sauce', 'coconut_milk', 'spices',
    ),
  },
  {
    id: 'sparse',
    title: 'Nearly empty fridge',
    caption: 'End of the week, not much left',
    shelves: ['🧅 🧄 🥚', '🥫 🫒 🧂', '🍶'],
    items: sure('onion', 'garlic', 'eggs', 'tomatoes', 'olive_oil', 'spices', 'soy_sauce'),
  },
  {
    id: 'unclear',
    title: 'Blurry fridge photo',
    caption: 'Taken in a hurry, some things are hard to see',
    shelves: ['🥬 ❓ 🧅 🧄', '🥫 🫘 ❓', '🫒 🧂 🍛'],
    items: [
      ...sure('kale', 'onion', 'garlic', 'black_beans', 'lentils', 'olive_oil', 'spices', 'curry_paste'),
      { id: 'greek_yogurt', confidence: 'unsure', question: 'Is the white tub plain Greek yogurt?' },
      { id: 'chickpeas', confidence: 'unsure', question: 'Is the second tin chickpeas?' },
    ],
  },
];

export function pantry(id: string): PantryPhoto {
  const found = PANTRY_PHOTOS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown pantry photo: ${id}`);
  return found;
}

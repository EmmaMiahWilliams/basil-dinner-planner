// Synthetic ingredient and grocery catalogue. All prices are made up for the demo.

export type FoodGroup =
  | 'mushroom'
  | 'onion'
  | 'beans'
  | 'greens'
  | 'cruciferous'
  | 'berries'
  | 'nutsSeeds'
  | 'protein'
  | 'grain'
  | 'veg'
  | 'dairy'
  | 'pantry';

export type Ingredient = {
  id: string;
  name: string;
  emoji: string;
  group: FoodGroup;
  /** Synthetic grocery product used when the item is missing. */
  product: { label: string; price: number };
  /** Allergen tags this ingredient carries. */
  allergens?: string[];
};

const list: Ingredient[] = [
  { id: 'chickpeas', name: 'Chickpeas (tin)', emoji: '🥫', group: 'beans', product: { label: 'Chickpeas 400g tin', price: 0.85 } },
  { id: 'black_beans', name: 'Black beans (tin)', emoji: '🥫', group: 'beans', product: { label: 'Black beans 400g tin', price: 0.95 } },
  { id: 'lentils', name: 'Red lentils', emoji: '🫘', group: 'beans', product: { label: 'Red lentils 500g', price: 1.6 } },
  { id: 'edamame', name: 'Frozen edamame', emoji: '🫛', group: 'beans', product: { label: 'Frozen edamame 400g', price: 2.2 } },
  { id: 'tofu', name: 'Firm tofu', emoji: '🧈', group: 'protein', product: { label: 'Firm tofu 280g', price: 1.9 }, allergens: ['soy'] },
  { id: 'eggs', name: 'Eggs', emoji: '🥚', group: 'protein', product: { label: 'Free-range eggs x6', price: 1.95 }, allergens: ['egg'] },
  { id: 'salmon', name: 'Salmon fillets', emoji: '🐟', group: 'protein', product: { label: 'Salmon fillets x2', price: 4.5 }, allergens: ['fish'] },
  { id: 'chicken', name: 'Chicken breast', emoji: '🍗', group: 'protein', product: { label: 'Chicken breast 300g', price: 3.4 } },
  { id: 'turkey_mince', name: 'Turkey mince', emoji: '🦃', group: 'protein', product: { label: 'Lean turkey mince 400g', price: 3.8 } },
  { id: 'beef_mince', name: 'Beef mince', emoji: '🥩', group: 'protein', product: { label: 'Beef mince 500g', price: 4.2 } },
  { id: 'prawns', name: 'Prawns', emoji: '🦐', group: 'protein', product: { label: 'King prawns 200g', price: 4.0 }, allergens: ['shellfish'] },
  { id: 'greek_yogurt', name: 'Plain Greek yogurt', emoji: '🥣', group: 'dairy', product: { label: 'Greek yogurt 500g', price: 1.8 }, allergens: ['milk'] },
  { id: 'feta', name: 'Feta', emoji: '🧀', group: 'dairy', product: { label: 'Feta 200g', price: 1.75 }, allergens: ['milk'] },
  { id: 'spinach', name: 'Spinach', emoji: '🥬', group: 'greens', product: { label: 'Baby spinach 200g', price: 1.25 } },
  { id: 'kale', name: 'Kale', emoji: '🥬', group: 'greens', product: { label: 'Kale 200g', price: 1.1 } },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦', group: 'cruciferous', product: { label: 'Broccoli head', price: 0.79 } },
  { id: 'cauliflower', name: 'Cauliflower', emoji: '🥦', group: 'cruciferous', product: { label: 'Cauliflower', price: 1.0 } },
  { id: 'cabbage', name: 'Red cabbage', emoji: '🥬', group: 'cruciferous', product: { label: 'Red cabbage', price: 0.9 } },
  { id: 'mushrooms', name: 'Mushrooms', emoji: '🍄', group: 'mushroom', product: { label: 'Chestnut mushrooms 250g', price: 1.15 } },
  { id: 'onion', name: 'Onion', emoji: '🧅', group: 'onion', product: { label: 'Brown onions x3', price: 0.75 } },
  { id: 'garlic', name: 'Garlic', emoji: '🧄', group: 'onion', product: { label: 'Garlic bulb', price: 0.4 } },
  { id: 'peppers', name: 'Bell peppers', emoji: '🫑', group: 'veg', product: { label: 'Mixed peppers x3', price: 1.6 } },
  { id: 'courgette', name: 'Courgette', emoji: '🥒', group: 'veg', product: { label: 'Courgettes x2', price: 1.0 } },
  { id: 'tomatoes', name: 'Chopped tomatoes (tin)', emoji: '🥫', group: 'veg', product: { label: 'Chopped tomatoes 400g', price: 0.6 } },
  { id: 'cherry_tomatoes', name: 'Cherry tomatoes', emoji: '🍅', group: 'veg', product: { label: 'Cherry tomatoes 250g', price: 1.2 } },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒', group: 'veg', product: { label: 'Cucumber', price: 0.7 } },
  { id: 'sweet_potato', name: 'Sweet potato', emoji: '🍠', group: 'veg', product: { label: 'Sweet potatoes 1kg', price: 1.5 } },
  { id: 'quinoa', name: 'Quinoa', emoji: '🌾', group: 'grain', product: { label: 'Quinoa 300g', price: 2.0 } },
  { id: 'brown_rice', name: 'Brown rice (microwave pouch)', emoji: '🍚', group: 'grain', product: { label: 'Brown rice pouch x2', price: 1.4 } },
  { id: 'wholewheat_wrap', name: 'Wholemeal wraps', emoji: '🫓', group: 'grain', product: { label: 'Wholemeal wraps x6', price: 1.3 }, allergens: ['gluten'] },
  { id: 'soba', name: 'Buckwheat soba noodles', emoji: '🍜', group: 'grain', product: { label: 'Soba noodles 250g', price: 1.9 } },
  { id: 'peanut_butter', name: 'Peanut butter', emoji: '🥜', group: 'nutsSeeds', product: { label: 'Peanut butter 340g', price: 2.0 }, allergens: ['peanut'] },
  { id: 'walnuts', name: 'Walnuts', emoji: '🌰', group: 'nutsSeeds', product: { label: 'Walnuts 100g', price: 1.9 }, allergens: ['tree nut'] },
  { id: 'pumpkin_seeds', name: 'Pumpkin seeds', emoji: '🌻', group: 'nutsSeeds', product: { label: 'Pumpkin seeds 150g', price: 1.5 } },
  { id: 'chia', name: 'Chia seeds', emoji: '🌱', group: 'nutsSeeds', product: { label: 'Chia seeds 150g', price: 1.8 } },
  { id: 'berries', name: 'Mixed berries (frozen)', emoji: '🫐', group: 'berries', product: { label: 'Frozen mixed berries 500g', price: 2.0 } },
  { id: 'dark_choc', name: 'Dark chocolate 85%', emoji: '🍫', group: 'pantry', product: { label: 'Dark chocolate 85% 100g', price: 1.7 } },
  { id: 'olive_oil', name: 'Olive oil', emoji: '🫒', group: 'pantry', product: { label: 'Olive oil 500ml', price: 3.5 } },
  { id: 'curry_paste', name: 'Curry paste', emoji: '🍛', group: 'pantry', product: { label: 'Mild curry paste jar', price: 1.6 } },
  { id: 'soy_sauce', name: 'Reduced-salt soy sauce', emoji: '🍶', group: 'pantry', product: { label: 'Reduced-salt soy sauce', price: 1.3 }, allergens: ['soy'] },
  { id: 'coconut_milk', name: 'Light coconut milk', emoji: '🥥', group: 'pantry', product: { label: 'Light coconut milk 400ml', price: 1.1 } },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', group: 'pantry', product: { label: 'Lemons x2', price: 0.6 } },
  { id: 'spices', name: 'Cumin & paprika', emoji: '🧂', group: 'pantry', product: { label: 'Cumin + smoked paprika', price: 1.8 } },
];

export const INGREDIENTS: Record<string, Ingredient> = Object.fromEntries(list.map((i) => [i.id, i]));

export const PLANT_CHECK_GROUPS: { group: FoodGroup; label: string; emoji: string }[] = [
  { group: 'mushroom', label: 'Mushrooms', emoji: '🍄' },
  { group: 'onion', label: 'Onions & garlic', emoji: '🧅' },
  { group: 'beans', label: 'Beans & lentils', emoji: '🫘' },
  { group: 'greens', label: 'Leafy greens', emoji: '🥬' },
  { group: 'cruciferous', label: 'Cruciferous veg', emoji: '🥦' },
  { group: 'berries', label: 'Berries', emoji: '🫐' },
  { group: 'nutsSeeds', label: 'Nuts & seeds', emoji: '🌰' },
];

export function ingredient(id: string): Ingredient {
  const found = INGREDIENTS[id];
  if (!found) throw new Error(`Unknown ingredient: ${id}`);
  return found;
}

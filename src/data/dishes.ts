// Pre-populated dish library (synthetic). Every dish is a dinner for one with leftovers optional.

export type ProteinSource = 'plant' | 'poultry' | 'fish' | 'red_meat' | 'shellfish';

export type Dish = {
  id: string;
  name: string;
  emoji: string;
  minutes: number;
  /** 1 = low energy friendly, 2 = some chopping, 3 = needs focus. */
  effort: 1 | 2 | 3;
  onePan: boolean;
  protein: ProteinSource;
  kcal: number;
  fibreG: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
  /** Fractions of the plate, used for the portion picture. */
  plate: { veg: number; protein: number; carb: number };
  portionTip: string;
};

export const DISHES: Dish[] = [
  {
    id: 'chickpea_spinach_curry',
    name: 'Chickpea & spinach curry',
    emoji: '🍛',
    minutes: 20,
    effort: 1,
    onePan: true,
    protein: 'plant',
    kcal: 480,
    fibreG: 15,
    tags: ['curry', 'vegan'],
    ingredients: ['chickpeas', 'spinach', 'onion', 'garlic', 'tomatoes', 'curry_paste', 'coconut_milk', 'brown_rice'],
    steps: [
      'Soften a chopped onion and garlic in one pan for 5 minutes.',
      'Stir in 1 tbsp curry paste, the tin of tomatoes and half the coconut milk.',
      'Add drained chickpeas and simmer 10 minutes.',
      'Wilt in two big handfuls of spinach.',
      'Serve over half a pouch of brown rice.',
    ],
    plate: { veg: 0.5, protein: 0.25, carb: 0.25 },
    portionTip: 'Rice: half a pouch, about the size of your fist.',
  },
  {
    id: 'tofu_broccoli_stirfry',
    name: 'Tofu & broccoli stir-fry',
    emoji: '🥢',
    minutes: 20,
    effort: 2,
    onePan: true,
    protein: 'plant',
    kcal: 450,
    fibreG: 10,
    tags: ['stir-fry', 'vegan'],
    ingredients: ['tofu', 'broccoli', 'peppers', 'mushrooms', 'garlic', 'soy_sauce', 'soba', 'pumpkin_seeds'],
    steps: [
      'Cube the tofu and brown it in a hot pan with a little oil.',
      'Add broccoli florets, sliced pepper and mushrooms. Stir-fry 5 minutes.',
      'Cook soba noodles for 4 minutes while the veg cooks.',
      'Toss everything with garlic and 1 tbsp reduced-salt soy sauce.',
      'Sprinkle with pumpkin seeds.',
    ],
    plate: { veg: 0.5, protein: 0.25, carb: 0.25 },
    portionTip: 'Noodles: one small nest (about 50g dry).',
  },
  {
    id: 'lentil_soup',
    name: 'Red lentil & tomato soup',
    emoji: '🍲',
    minutes: 25,
    effort: 1,
    onePan: true,
    protein: 'plant',
    kcal: 390,
    fibreG: 14,
    tags: ['soup', 'vegan', 'batch'],
    ingredients: ['lentils', 'onion', 'garlic', 'tomatoes', 'spices', 'kale', 'pumpkin_seeds'],
    steps: [
      'Soften onion and garlic in a pot for 3 minutes.',
      'Add 80g lentils, the tomatoes, spices and 600ml water.',
      'Simmer 18 minutes until the lentils are soft.',
      'Stir in a handful of kale for the last 2 minutes.',
      'Top with pumpkin seeds. Freeze any extra.',
    ],
    plate: { veg: 0.55, protein: 0.35, carb: 0.1 },
    portionTip: 'One big bowl (about 2 ladles).',
  },
  {
    id: 'salmon_traybake',
    name: 'Salmon & greens traybake',
    emoji: '🐟',
    minutes: 25,
    effort: 1,
    onePan: true,
    protein: 'fish',
    kcal: 520,
    fibreG: 9,
    tags: ['traybake', 'fish'],
    ingredients: ['salmon', 'broccoli', 'cherry_tomatoes', 'lemon', 'olive_oil', 'quinoa'],
    steps: [
      'Heat oven to 200°C / 400°F.',
      'Put salmon, broccoli and cherry tomatoes on one tray with a drizzle of oil.',
      'Bake 18 minutes. Microwave a portion of quinoa meanwhile.',
      'Squeeze lemon over everything.',
    ],
    plate: { veg: 0.5, protein: 0.25, carb: 0.25 },
    portionTip: 'Salmon: one fillet, the size of your palm.',
  },
  {
    id: 'turkey_chilli',
    name: 'Turkey & black bean chilli',
    emoji: '🌶️',
    minutes: 30,
    effort: 2,
    onePan: true,
    protein: 'poultry',
    kcal: 510,
    fibreG: 16,
    tags: ['chilli', 'batch'],
    ingredients: ['turkey_mince', 'black_beans', 'onion', 'peppers', 'tomatoes', 'spices', 'mushrooms'],
    steps: [
      'Brown the turkey mince with chopped onion in one pan.',
      'Add sliced pepper, chopped mushrooms and spices. Cook 3 minutes.',
      'Add tomatoes and drained black beans. Simmer 15 minutes.',
      'Serve one portion, freeze the rest.',
    ],
    plate: { veg: 0.45, protein: 0.35, carb: 0.2 },
    portionTip: 'One bowl. Skip rice: the beans are your carbs.',
  },
  {
    id: 'egg_veg_frittata',
    name: 'Spinach & mushroom frittata',
    emoji: '🍳',
    minutes: 15,
    effort: 1,
    onePan: true,
    protein: 'plant',
    kcal: 410,
    fibreG: 6,
    tags: ['eggs', 'vegetarian'],
    ingredients: ['eggs', 'spinach', 'mushrooms', 'onion', 'feta', 'cherry_tomatoes'],
    steps: [
      'Fry sliced mushrooms and onion for 4 minutes.',
      'Add spinach until wilted.',
      'Pour over 3 beaten eggs and crumble on a little feta.',
      'Cook on low 6 minutes with a lid on. Serve with cherry tomatoes.',
    ],
    plate: { veg: 0.6, protein: 0.4, carb: 0 },
    portionTip: 'Half the frittata. Feta: a matchbox-sized piece.',
  },
  {
    id: 'chicken_fajita_wraps',
    name: 'Chicken fajita wraps',
    emoji: '🌯',
    minutes: 20,
    effort: 2,
    onePan: true,
    protein: 'poultry',
    kcal: 530,
    fibreG: 10,
    tags: ['wraps'],
    ingredients: ['chicken', 'peppers', 'onion', 'spices', 'wholewheat_wrap', 'greek_yogurt', 'cabbage'],
    steps: [
      'Slice chicken, pepper and onion into strips.',
      'Fry together with spices for 10 minutes.',
      'Warm one wholemeal wrap.',
      'Fill with chicken mix, shredded red cabbage and a spoon of yogurt.',
    ],
    plate: { veg: 0.5, protein: 0.3, carb: 0.2 },
    portionTip: 'One wrap, generously filled with veg.',
  },
  {
    id: 'bean_quinoa_bowl',
    name: 'No-cook bean & quinoa bowl',
    emoji: '🥗',
    minutes: 10,
    effort: 1,
    onePan: true,
    protein: 'plant',
    kcal: 460,
    fibreG: 17,
    tags: ['bowl', 'vegan', 'no-cook'],
    ingredients: ['black_beans', 'quinoa', 'cherry_tomatoes', 'cucumber', 'spinach', 'lemon', 'olive_oil', 'pumpkin_seeds'],
    steps: [
      'Microwave a portion of quinoa (or use pre-cooked).',
      'Rinse half a tin of black beans.',
      'Pile into a bowl with spinach, tomatoes and cucumber.',
      'Dress with lemon and a teaspoon of olive oil. Add seeds.',
    ],
    plate: { veg: 0.5, protein: 0.25, carb: 0.25 },
    portionTip: 'Quinoa: a cupped handful.',
  },
  {
    id: 'cauli_dal',
    name: 'Cauliflower & lentil dal',
    emoji: '🥘',
    minutes: 30,
    effort: 2,
    onePan: true,
    protein: 'plant',
    kcal: 430,
    fibreG: 15,
    tags: ['curry', 'vegan', 'batch'],
    ingredients: ['lentils', 'cauliflower', 'onion', 'garlic', 'curry_paste', 'spinach', 'coconut_milk'],
    steps: [
      'Soften onion and garlic, stir in curry paste.',
      'Add lentils, small cauliflower florets and 500ml water.',
      'Simmer 20 minutes, stirring now and then.',
      'Stir in a splash of coconut milk and a handful of spinach.',
    ],
    plate: { veg: 0.55, protein: 0.3, carb: 0.15 },
    portionTip: 'One bowl, about 2 ladles.',
  },
  {
    id: 'edamame_soba',
    name: 'Edamame soba with greens',
    emoji: '🍜',
    minutes: 12,
    effort: 1,
    onePan: false,
    protein: 'plant',
    kcal: 440,
    fibreG: 11,
    tags: ['noodles', 'vegan'],
    ingredients: ['soba', 'edamame', 'kale', 'garlic', 'soy_sauce', 'pumpkin_seeds'],
    steps: [
      'Boil soba and edamame together for 4 minutes.',
      'Add shredded kale for the last minute. Drain.',
      'Toss with grated garlic and 1 tbsp reduced-salt soy sauce.',
      'Top with seeds.',
    ],
    plate: { veg: 0.45, protein: 0.3, carb: 0.25 },
    portionTip: 'Noodles: one small nest (about 50g dry).',
  },
  {
    id: 'stuffed_sweet_potato',
    name: 'Black bean stuffed sweet potato',
    emoji: '🍠',
    minutes: 15,
    effort: 1,
    onePan: false,
    protein: 'plant',
    kcal: 470,
    fibreG: 16,
    tags: ['vegetarian'],
    ingredients: ['sweet_potato', 'black_beans', 'greek_yogurt', 'spinach', 'spices'],
    steps: [
      'Prick a small sweet potato and microwave 8 minutes.',
      'Warm half a tin of black beans with spices.',
      'Split the potato and fill with beans and spinach.',
      'Top with a spoon of yogurt.',
    ],
    plate: { veg: 0.4, protein: 0.3, carb: 0.3 },
    portionTip: 'One small sweet potato, about the size of your fist.',
  },
  // Dishes below exist to test the agent's boundaries.
  {
    id: 'peanut_noodles',
    name: 'Peanut satay noodles',
    emoji: '🥜',
    minutes: 15,
    effort: 1,
    onePan: false,
    protein: 'plant',
    kcal: 560,
    fibreG: 8,
    tags: ['noodles', 'vegan'],
    ingredients: ['soba', 'peanut_butter', 'broccoli', 'soy_sauce', 'garlic'],
    steps: ['Cook noodles and broccoli.', 'Whisk peanut butter, soy and garlic.', 'Toss together.'],
    plate: { veg: 0.4, protein: 0.25, carb: 0.35 },
    portionTip: 'One small nest of noodles.',
  },
  {
    id: 'beef_bolognese',
    name: 'Beef bolognese',
    emoji: '🍝',
    minutes: 40,
    effort: 3,
    onePan: false,
    protein: 'red_meat',
    kcal: 680,
    fibreG: 6,
    tags: ['pasta'],
    ingredients: ['beef_mince', 'onion', 'tomatoes', 'garlic', 'mushrooms'],
    steps: ['Brown the mince.', 'Add veg and tomatoes.', 'Simmer 30 minutes.'],
    plate: { veg: 0.3, protein: 0.35, carb: 0.35 },
    portionTip: 'One bowl.',
  },
  {
    id: 'prawn_stirfry',
    name: 'Garlic prawn stir-fry',
    emoji: '🦐',
    minutes: 15,
    effort: 2,
    onePan: true,
    protein: 'shellfish',
    kcal: 420,
    fibreG: 7,
    tags: ['stir-fry'],
    ingredients: ['prawns', 'broccoli', 'peppers', 'garlic', 'soy_sauce', 'brown_rice'],
    steps: ['Fry prawns and garlic.', 'Add veg.', 'Serve with rice.'],
    plate: { veg: 0.5, protein: 0.25, carb: 0.25 },
    portionTip: 'A palm-sized pile of prawns.',
  },
];

export type Dessert = { id: string; name: string; emoji: string; portion: string; ingredients: string[] };

export const DESSERTS: Dessert[] = [
  { id: 'berry_yogurt', name: 'Berries & Greek yogurt', emoji: '🫐', portion: 'A cupped handful of berries on 3 tbsp yogurt', ingredients: ['berries', 'greek_yogurt'] },
  { id: 'dark_choc_walnuts', name: 'Dark chocolate & walnuts', emoji: '🍫', portion: '2 squares of 85% chocolate + 3 walnut halves', ingredients: ['dark_choc', 'walnuts'] },
  { id: 'chia_pudding', name: 'Berry chia pot', emoji: '🥄', portion: 'One small ramekin (2 tbsp chia, splash of milk, berries)', ingredients: ['chia', 'berries'] },
];

export function dish(id: string): Dish {
  const found = DISHES.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown dish: ${id}`);
  return found;
}

export function videoSearchUrl(d: Dish): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`easy ${d.name} recipe`)}`;
}

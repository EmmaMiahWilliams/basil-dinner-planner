// Target (target.com, US) hand-off data.
//
// Target has no public API that lets an outside app read a signed-in shopper's cart, add to it, or
// fetch live prices, and its terms of use forbid scraping and any shopping agent that Target has not
// approved. So Basil never signs in to Target, never touches the shopper's account and never reads
// target.com. Instead, for each item on the approved list it opens Target's own search (or a product
// page, once a product id is pinned below) in the shopper's browser or Target app. The shopper picks
// the real product, sees Target's real price, and taps Target's own "Add to cart". Basil stops there:
// checkout, payment and the order are entirely the shopper's, on Target.
//
// estimateUsd is a rough guide for the running total only, NOT Target's price. Target's page always
// shows the real, local price. To pin an exact product, add its Target product id (the "TCIN", the
// number after "A-" in a target.com/p/... link) with the price you saw and the date you checked it.

export const TARGET = {
  name: 'Target',
  emoji: '🎯',
  cartUrl: 'https://www.target.com/cart',
  /** Target's own sign-in / create-account page. */
  accountUrl: 'https://www.target.com/account',
};

export type TargetProduct = {
  /** What to search for on target.com, in US grocery terms. */
  search: string;
  /** Rough USD guide for the running total. Target shows the real price. */
  estimateUsd: number;
  /** Optional pinned product: Target product id, the price seen and when it was checked (YYYY-MM-DD). */
  tcin?: string;
  checkedUsd?: number;
  checkedOn?: string;
};

export const TARGET_PRODUCTS: Record<string, TargetProduct> = {
  chickpeas: { search: 'Good & Gather garbanzo beans 15 oz', estimateUsd: 0.99 },
  black_beans: { search: 'Good & Gather black beans 15 oz', estimateUsd: 0.99 },
  lentils: { search: 'red lentils 16 oz', estimateUsd: 2.49 },
  edamame: { search: 'frozen shelled edamame', estimateUsd: 2.79 },
  tofu: { search: 'firm tofu 14 oz', estimateUsd: 2.49 },
  eggs: { search: 'Good & Gather cage free large eggs 12 ct', estimateUsd: 3.99 },
  salmon: { search: 'Good & Gather frozen Atlantic salmon fillets', estimateUsd: 8.99 },
  chicken: { search: 'Good & Gather boneless skinless chicken breast', estimateUsd: 6.99 },
  turkey_mince: { search: '93% lean ground turkey 1 lb', estimateUsd: 5.49 },
  beef_mince: { search: '90% lean ground beef 1 lb', estimateUsd: 6.99 },
  prawns: { search: 'Good & Gather frozen raw shrimp', estimateUsd: 8.99 },
  greek_yogurt: { search: 'Good & Gather plain nonfat Greek yogurt 32 oz', estimateUsd: 4.99 },
  feta: { search: 'Good & Gather crumbled feta cheese', estimateUsd: 3.49 },
  spinach: { search: 'Good & Gather baby spinach 5 oz', estimateUsd: 2.99 },
  kale: { search: 'chopped kale bag', estimateUsd: 2.99 },
  broccoli: { search: 'broccoli crowns', estimateUsd: 2.49 },
  cauliflower: { search: 'cauliflower head', estimateUsd: 3.49 },
  cabbage: { search: 'red cabbage', estimateUsd: 1.99 },
  mushrooms: { search: 'baby bella mushrooms 8 oz', estimateUsd: 2.99 },
  onion: { search: 'yellow onions 3 lb bag', estimateUsd: 3.49 },
  garlic: { search: 'garlic bulb', estimateUsd: 0.79 },
  peppers: { search: 'mixed bell peppers 3 pack', estimateUsd: 4.49 },
  courgette: { search: 'zucchini squash', estimateUsd: 1.49 },
  tomatoes: { search: 'Good & Gather diced tomatoes no salt added 14.5 oz', estimateUsd: 0.99 },
  cherry_tomatoes: { search: 'cherry tomatoes 10 oz', estimateUsd: 3.29 },
  carrot: { search: 'carrots 2 lb bag', estimateUsd: 1.49 },
  celery: { search: 'celery hearts', estimateUsd: 2.49 },
  cucumber: { search: 'cucumber', estimateUsd: 0.79 },
  sweet_potato: { search: 'sweet potatoes 3 lb', estimateUsd: 3.99 },
  quinoa: { search: 'Good & Gather organic quinoa', estimateUsd: 4.49 },
  brown_rice: { search: 'Good & Gather microwavable brown rice', estimateUsd: 2.49 },
  wholewheat_wrap: { search: 'whole wheat tortillas', estimateUsd: 2.99 },
  soba: { search: 'buckwheat soba noodles', estimateUsd: 3.99 },
  peanut_butter: { search: 'Good & Gather creamy peanut butter 16 oz', estimateUsd: 2.29 },
  walnuts: { search: 'Good & Gather chopped walnuts', estimateUsd: 5.49 },
  pumpkin_seeds: { search: 'pepitas pumpkin seeds', estimateUsd: 4.29 },
  sesame_seeds: { search: 'toasted sesame seeds', estimateUsd: 3.49 },
  chia: { search: 'Good & Gather chia seeds', estimateUsd: 4.49 },
  berries: { search: 'Good & Gather frozen mixed berries', estimateUsd: 4.99 },
  dark_choc: { search: '85% dark chocolate bar', estimateUsd: 3.49 },
  olive_oil: { search: 'Good & Gather extra virgin olive oil 16.9 oz', estimateUsd: 7.99 },
  curry_paste: { search: 'mild curry paste', estimateUsd: 3.99 },
  soy_sauce: { search: 'reduced sodium soy sauce', estimateUsd: 2.99 },
  coconut_milk: { search: 'Good & Gather light coconut milk 13.5 oz', estimateUsd: 2.29 },
  lemon: { search: 'lemons', estimateUsd: 0.79 },
  black_vinegar: { search: 'Chinkiang black vinegar', estimateUsd: 3.99 },
  sesame_oil: { search: 'toasted sesame oil', estimateUsd: 4.49 },
  veg_stock: { search: 'low sodium vegetable broth 32 oz', estimateUsd: 2.49 },
  herbs: { search: 'dried rosemary and bay leaves', estimateUsd: 5.98 },
  spices: { search: 'ground cumin smoked paprika', estimateUsd: 5.98 },
};

export function targetProduct(id: string): TargetProduct {
  const p = TARGET_PRODUCTS[id];
  if (!p) throw new Error(`No Target search set for ingredient: ${id}`);
  return p;
}

/** Target's own page for the item: the pinned product if there is one, otherwise Target's search. */
export function targetUrl(p: TargetProduct): string {
  return p.tcin ? `https://www.target.com/p/-/A-${p.tcin}` : `https://www.target.com/s?searchTerm=${encodeURIComponent(p.search)}`;
}

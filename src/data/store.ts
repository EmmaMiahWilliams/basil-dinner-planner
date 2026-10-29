// A made-up online grocery store for the demo. It stands in for a real retailer's cart: no real
// store, account, API or payment is involved. Change RETAILER to rename it in a local build.

export const RETAILER = {
  name: 'Corner Market',
  tagline: 'Demo online grocery store',
  emoji: '🏪',
};

export type StoreProduct = { sku: string; title: string; price: number; allergens?: string[] };

/**
 * Products the demo store is "out of" this week, each with the substitute the store would suggest.
 * Chosen so the stocked-kitchen demo hits two substitutions, and one substitute carries allergens
 * to prove the agent never offers an unsafe swap.
 */
export const OUT_OF_STOCK: Record<string, StoreProduct> = {
  soba: { sku: 'CM-RICE-NOODLE', title: 'Brown rice noodles 250g', price: 1.8 },
  cauliflower: { sku: 'CM-FRZ-CAULI', title: 'Frozen cauliflower florets 500g', price: 1.25 },
  pumpkin_seeds: { sku: 'CM-NUT-MIX', title: 'Mixed nuts & seeds 150g', price: 2.1, allergens: ['peanut', 'tree nut'] },
  black_beans: { sku: 'CM-KIDNEY', title: 'Kidney beans 400g tin', price: 0.85 },
};

export const DELIVERY_SLOTS = ['Sat 4–6pm', 'Sat 6–8pm', 'Sun 10am–12pm', 'Sun 2–4pm'];
export const DELIVERY_FEE = 2.5;

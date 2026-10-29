// Mock retailer handoff: the agent sends the approved draft cart to the demo store, asks before any
// substitution, and stops at the store's checkout. It has no way to place an order or take payment.

import { ingredient } from '../data/ingredients';
import { Profile } from '../data/profile';
import { DELIVERY_FEE, OUT_OF_STOCK, RETAILER, StoreProduct } from '../data/store';
import { CartItem } from './planner';

export type StoreLine = {
  ingredientId: string;
  sku: string;
  title: string;
  price: number;
  status: 'added' | 'needs_your_ok' | 'substituted' | 'left_out';
  /** Store's suggested swap when the item is out of stock and the swap is safe for this user. */
  substitute?: StoreProduct;
  note?: string;
};

export type StoreCart = {
  retailer: string;
  lines: StoreLine[];
  /** Always "draft": the store cart waits for the user to check out in the store. */
  status: 'draft';
};

function skuFor(id: string): string {
  return `CM-${id.toUpperCase().replace(/_/g, '-')}`;
}

/** Why a store product isn't safe for this user, or null. Substitutes get the same check as the plan. */
export function productConflict(p: StoreProduct, profile: Profile): string | null {
  const hit = p.allergens?.find((a) => profile.allergens.includes(a));
  return hit ? `contains ${hit}` : null;
}

/** Send the approved items (removed ones excluded) to the store. Out-of-stock items wait for the user's OK. */
export function sendToStore(items: CartItem[], removed: string[], profile: Profile): StoreCart {
  const lines: StoreLine[] = items
    .filter((c) => !removed.includes(c.ingredientId))
    .map((c) => {
      const sub = OUT_OF_STOCK[c.ingredientId];
      const base = { ingredientId: c.ingredientId, sku: skuFor(c.ingredientId), title: c.label, price: c.price };
      if (!sub) return { ...base, status: 'added' as const };
      const conflict = productConflict(sub, profile);
      if (conflict) {
        return {
          ...base,
          status: 'left_out' as const,
          note: `Out of stock. The store’s swap (${sub.title}) ${conflict}, so I left it out. You could pick it up elsewhere.`,
        };
      }
      return { ...base, status: 'needs_your_ok' as const, substitute: sub, note: `Out of stock. ${RETAILER.name} suggests ${sub.title}.` };
    });
  return { retailer: RETAILER.name, lines, status: 'draft' };
}

/** The user's answer to a suggested substitution. Nothing is swapped without it. */
export function answerSubstitution(cart: StoreCart, ingredientId: string, accept: boolean): StoreCart {
  return {
    ...cart,
    lines: cart.lines.map((l) => {
      if (l.ingredientId !== ingredientId || l.status !== 'needs_your_ok' || !l.substitute) return l;
      return accept
        ? { ...l, status: 'substituted', sku: l.substitute.sku, title: l.substitute.title, price: l.substitute.price, note: `Swapped for ${ingredient(ingredientId).name}, with your OK.` }
        : { ...l, status: 'left_out', note: 'Out of stock. You said no to the swap, so it’s left out.' };
    }),
  };
}

export function pendingQuestions(cart: StoreCart): StoreLine[] {
  return cart.lines.filter((l) => l.status === 'needs_your_ok');
}

export function totals(cart: StoreCart): { items: number; subtotal: number; delivery: number; total: number } {
  const inCart = cart.lines.filter((l) => l.status === 'added' || l.status === 'substituted');
  const subtotal = inCart.reduce((s, l) => s + l.price, 0);
  const delivery = inCart.length ? DELIVERY_FEE : 0;
  return { items: inCart.length, subtotal, delivery, total: subtotal + delivery };
}

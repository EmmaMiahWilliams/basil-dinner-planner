// Target hand-off: turns the approved draft cart into a Target shopping list. Each line links to
// Target's own page for the item; the shopper adds it to their own Target cart themselves and ticks
// it off here. Basil has no access to the shopper's Target account and no way to check out or pay.

import { Profile } from '../data/profile';
import { TargetProduct, targetProduct, targetUrl } from '../data/target';
import { CartItem } from './planner';

export type TargetLine = {
  ingredientId: string;
  search: string;
  url: string;
  /** USD shown in Basil: the checked price of a pinned product, otherwise a rough estimate. */
  usd: number;
  priceKind: 'checked' | 'estimate';
  checkedOn?: string;
  /** The shopper's allergens, to check on the real product's label. */
  checkLabelFor: string[];
};

export type TargetList = { lines: TargetLine[]; status: 'handed_off' };

function usdFor(p: TargetProduct): { usd: number; priceKind: TargetLine['priceKind']; checkedOn?: string } {
  return p.tcin && p.checkedUsd !== undefined ? { usd: p.checkedUsd, priceKind: 'checked', checkedOn: p.checkedOn } : { usd: p.estimateUsd, priceKind: 'estimate' };
}

/** Approved items (removed ones excluded), each with Target's own link and a USD guide price. */
export function buildTargetList(items: CartItem[], removed: string[], profile: Profile): TargetList {
  const lines = items
    .filter((c) => !removed.includes(c.ingredientId))
    .map((c) => {
      const p = targetProduct(c.ingredientId);
      return {
        ingredientId: c.ingredientId,
        search: p.search,
        url: targetUrl(p),
        ...usdFor(p),
        // A real product can carry allergens Basil's generic ingredient doesn't (e.g. "may contain
        // peanuts"), so the shopper always checks the label for every allergen in their profile.
        checkLabelFor: [...profile.allergens],
      };
    });
  return { lines, status: 'handed_off' };
}

export function targetTotals(list: TargetList, added: string[]): { items: number; added: number; estimateUsd: number; addedUsd: number } {
  const inCart = list.lines.filter((l) => added.includes(l.ingredientId));
  return {
    items: list.lines.length,
    added: inCart.length,
    estimateUsd: list.lines.reduce((s, l) => s + l.usd, 0),
    addedUsd: inCart.reduce((s, l) => s + l.usd, 0),
  };
}

export const usd = (n: number) => `$${n.toFixed(2)}`;

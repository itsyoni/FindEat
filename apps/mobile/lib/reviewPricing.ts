import type { ReviewDishDraft } from "@findeat/types/review";

export function calculateReviewBill(items: ReviewDishDraft[]) {
  const prices = items
    .map((item) => item.customPrice ?? item.menuItemPrice)
    .filter(
      (price): price is number =>
        typeof price === "number" && Number.isFinite(price) && price >= 0,
    );

  if (!prices.length) return undefined;
  return Math.round(prices.reduce((total, price) => total + price, 0) * 100) / 100;
}

import type { SelectedAddress } from "@findeat/types";

const pendingSelections = new Map<string, SelectedAddress>();

export function setPendingListLocation(
  listId: string,
  location: SelectedAddress,
  kind: "destination" | "stay" = "destination",
) {
  pendingSelections.set(`${listId}:${kind}`, location);
}

export function consumePendingListLocation(
  listId: string,
  kind: "destination" | "stay" = "destination",
) {
  const key = `${listId}:${kind}`;
  const location = pendingSelections.get(key) ?? null;
  pendingSelections.delete(key);
  return location;
}

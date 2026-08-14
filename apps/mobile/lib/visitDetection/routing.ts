export function visitCreationRoute(
  kind: "content" | "review",
  restaurantId: string,
) {
  return {
    pathname: kind === "content" ? "/create/content" : "/create/review",
    params: { restaurantId },
  } as const;
}

export function visitReminderRoute(data?: Record<string, unknown>) {
  const type = typeof data?.type === "string" ? data.type : null;
  const restaurantId =
    typeof data?.restaurantId === "string" && data.restaurantId.trim()
      ? data.restaurantId
      : null;
  const visitCandidateId =
    typeof data?.visitCandidateId === "string" && data.visitCandidateId.trim()
      ? data.visitCandidateId
      : null;
  if (
    type !== "RESTAURANT_VISIT_REMINDER" ||
    !restaurantId ||
    !visitCandidateId
  ) {
    return null;
  }
  return {
    pathname: "/visit-reminder",
    params: { restaurantId, visitCandidateId },
  } as const;
}

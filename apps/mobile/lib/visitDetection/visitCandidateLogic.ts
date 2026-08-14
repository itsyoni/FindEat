import type { RestaurantVisitCandidate } from "@findeat/types";
import type { VisitDetectionMode } from "@findeat/types";
import {
  VISIT_CANDIDATE_STALE_MS,
  VISIT_CANDIDATE_RETENTION_MS,
  VISIT_DWELL_THRESHOLD_MS,
  VISIT_MAX_REMINDER_RETRIES,
  VISIT_PROMPT_COOLDOWN_MS,
  VISIT_RESTAURANT_COOLDOWN_MS,
  VISIT_REMINDER_STALE_MS,
} from "./config";

type EnterInput = {
  candidates: RestaurantVisitCandidate[];
  userId: string;
  restaurantId: string;
  restaurantName: string;
  now: number;
  enabled: boolean;
  muted: boolean;
};

export function resolveVisitDetectionMode(input: {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  backgroundAvailable: boolean;
}): VisitDetectionMode {
  if (input.backgroundGranted && input.backgroundAvailable) return "FULL";
  if (input.foregroundGranted) return "FOREGROUND";
  return "UNAVAILABLE";
}

export function isVisitDetectionPromptEligible(input: {
  enabled: boolean;
  promptSuppressed?: boolean;
  promptDismissedAt?: number;
  sessions: number;
  restaurantViews: number;
  usedMap: boolean;
  accountCreatedAt: number;
  now: number;
}) {
  if (input.enabled || input.promptSuppressed) return false;
  if (
    input.promptDismissedAt &&
    input.now - input.promptDismissedAt < VISIT_PROMPT_COOLDOWN_MS
  ) {
    return false;
  }
  return (
    input.now - input.accountCreatedAt >= 3 * 24 * 60 * 60 * 1_000 &&
    input.sessions >= 3 &&
    input.restaurantViews >= 2 &&
    input.usedMap
  );
}

export function enterRestaurantVisit(input: EnterInput) {
  const candidates = discardStaleDwelling(input.candidates, input.now);
  if (!input.enabled || input.muted) return candidates;
  const existingActive = candidates.find(
    (candidate) =>
      candidate.restaurantId === input.restaurantId &&
      candidate.status === "DWELLING",
  );
  if (existingActive) return candidates;
  const inCooldown = candidates.some(
    (candidate) =>
      candidate.restaurantId === input.restaurantId &&
      candidate.status !== "DWELLING" &&
      input.now - candidate.updatedAt < VISIT_RESTAURANT_COOLDOWN_MS,
  );
  if (inCooldown) return candidates;

  return [
    ...candidates,
    {
      id: `${input.restaurantId}:${input.now}`,
      userId: input.userId,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      enteredAt: input.now,
      status: "DWELLING" as const,
      reminderCount: 0,
      updatedAt: input.now,
    },
  ];
}

export function exitRestaurantVisit(
  candidates: RestaurantVisitCandidate[],
  restaurantId: string,
  now: number,
  dwellThresholdMs = VISIT_DWELL_THRESHOLD_MS,
) {
  let qualified: RestaurantVisitCandidate | null = null;
  const next: RestaurantVisitCandidate[] = [];
  for (const candidate of discardStaleDwelling(candidates, now)) {
    if (
      candidate.restaurantId !== restaurantId ||
      candidate.status !== "DWELLING"
    ) {
      next.push(candidate);
      continue;
    }
    const durationMs = Math.max(0, now - candidate.enteredAt);
    if (durationMs < dwellThresholdMs) continue;
    qualified = {
      ...candidate,
      exitedAt: now,
      durationMs,
      status: "PENDING",
      updatedAt: now,
    };
    next.push(qualified);
  }
  return { candidates: next, qualified };
}

export function remindVisitLater(
  candidate: RestaurantVisitCandidate,
  now: number,
  retryLimit = VISIT_MAX_REMINDER_RETRIES,
) {
  if (candidate.reminderCount >= retryLimit) {
    return { ...candidate, status: "DISMISSED" as const, updatedAt: now };
  }
  return {
    ...candidate,
    status: "REMIND_LATER" as const,
    reminderCount: candidate.reminderCount + 1,
    updatedAt: now,
  };
}

export function updateVisitStatus(
  candidate: RestaurantVisitCandidate,
  status: "DISMISSED" | "COMPLETED",
  now: number,
) {
  return { ...candidate, status, updatedAt: now };
}

export function discardStaleDwelling(
  candidates: RestaurantVisitCandidate[],
  now: number,
) {
  return candidates.filter(
    (candidate) => {
      if (candidate.status === "DWELLING") {
        return now - candidate.enteredAt <= VISIT_CANDIDATE_STALE_MS;
      }
      return now - candidate.updatedAt <= VISIT_CANDIDATE_RETENTION_MS;
    },
  );
}

export function isVisitCandidateActionable(
  candidate: RestaurantVisitCandidate | null | undefined,
  now = Date.now(),
) {
  return (
    !!candidate &&
    (candidate.status === "PENDING" || candidate.status === "REMIND_LATER") &&
    now - candidate.updatedAt <= VISIT_REMINDER_STALE_MS
  );
}

import assert from "node:assert/strict";
import test from "node:test";
import type { RestaurantVisitCandidate } from "../packages/types";
import {
  discardStaleDwelling,
  enterRestaurantVisit,
  exitRestaurantVisit,
  isVisitDetectionPromptEligible,
  isVisitCandidateActionable,
  remindVisitLater,
  resolveVisitDetectionMode,
  updateVisitStatus,
} from "../apps/mobile/lib/visitDetection/visitCandidateLogic";
import {
  visitCreationRoute,
  visitReminderRoute,
} from "../apps/mobile/lib/visitDetection/routing";

const userId = "user-1";
const restaurantId = "restaurant-1";
const enteredAt = 1_000;

function enter(
  candidates: RestaurantVisitCandidate[] = [],
  overrides: Partial<Parameters<typeof enterRestaurantVisit>[0]> = {},
) {
  return enterRestaurantVisit({
    candidates,
    userId,
    restaurantId,
    restaurantName: "FindEat Cafe",
    now: enteredAt,
    enabled: true,
    muted: false,
    ...overrides,
  });
}

test("a long visit becomes a reminder candidate", () => {
  const result = exitRestaurantVisit(
    enter(),
    restaurantId,
    enteredAt + 61 * 60_000,
  );
  assert.equal(result.qualified?.status, "PENDING");
  assert.equal(result.qualified?.durationMs, 61 * 60_000);
});

test("a short visit is discarded", () => {
  const result = exitRestaurantVisit(
    enter(),
    restaurantId,
    enteredAt + 12 * 60_000,
  );
  assert.equal(result.qualified, null);
  assert.equal(result.candidates.length, 0);
});

test("repeated enter events create only one dwelling candidate", () => {
  const first = enter();
  const second = enter(first, { now: enteredAt + 5_000 });
  assert.equal(second.length, 1);
  const exited = exitRestaurantVisit(
    second,
    restaurantId,
    enteredAt + 61 * 60_000,
  );
  assert.equal(
    exitRestaurantVisit(
      exited.candidates,
      restaurantId,
      enteredAt + 62 * 60_000,
    ).qualified,
    null,
  );
});

test("muted, disabled, and cooldown restaurants do not create candidates", () => {
  assert.equal(enter([], { muted: true }).length, 0);
  assert.equal(enter([], { enabled: false }).length, 0);
  const completed = updateVisitStatus(
    enter()[0],
    "COMPLETED",
    enteredAt + 60_000,
  );
  assert.equal(enter([completed], { now: enteredAt + 2 * 60_000 }).length, 1);
});

test("remind later is capped and not now completes the candidate lifecycle", () => {
  const candidate = exitRestaurantVisit(
    enter(),
    restaurantId,
    enteredAt + 61 * 60_000,
  ).qualified!;
  const retry = remindVisitLater(candidate, enteredAt + 62 * 60_000);
  assert.equal(retry.status, "REMIND_LATER");
  assert.equal(retry.reminderCount, 1);
  assert.equal(
    remindVisitLater(retry, enteredAt + 63 * 60_000).status,
    "DISMISSED",
  );
  assert.equal(
    updateVisitStatus(candidate, "DISMISSED", enteredAt + 64 * 60_000).status,
    "DISMISSED",
  );
});

test("stale dwelling candidates are removed", () => {
  assert.equal(
    discardStaleDwelling(enter(), enteredAt + 13 * 60 * 60_000).length,
    0,
  );
});

test("stale reminders cannot reopen an actionable visit", () => {
  const candidate = exitRestaurantVisit(
    enter(),
    restaurantId,
    enteredAt + 61 * 60_000,
  ).qualified!;
  assert.equal(isVisitCandidateActionable(candidate, candidate.updatedAt), true);
  assert.equal(
    isVisitCandidateActionable(candidate, candidate.updatedAt + 8 * 24 * 60 * 60_000),
    false,
  );
});

test("feature introduction respects meaningful usage and dismissal cooldown", () => {
  const now = 20 * 24 * 60 * 60_000;
  const base = {
    enabled: false,
    sessions: 3,
    restaurantViews: 2,
    usedMap: true,
    accountCreatedAt: now - 4 * 24 * 60 * 60_000,
    now,
  };
  assert.equal(isVisitDetectionPromptEligible(base), true);
  assert.equal(
    isVisitDetectionPromptEligible({ ...base, promptSuppressed: true }),
    false,
  );
  assert.equal(
    isVisitDetectionPromptEligible({
      ...base,
      promptDismissedAt: now - 24 * 60 * 60_000,
    }),
    false,
  );
});

test("notification and creation routes preserve candidate and restaurant IDs", () => {
  assert.deepEqual(
    visitReminderRoute({
      type: "RESTAURANT_VISIT_REMINDER",
      restaurantId,
      visitCandidateId: "candidate-1",
    }),
    {
      pathname: "/visit-reminder",
      params: { restaurantId, visitCandidateId: "candidate-1" },
    },
  );
  assert.deepEqual(visitCreationRoute("content", restaurantId), {
    pathname: "/create/content",
    params: { restaurantId },
  });
  assert.deepEqual(visitCreationRoute("review", restaurantId), {
    pathname: "/create/review",
    params: { restaurantId },
  });
});

test("permission mode falls back safely when background access is unavailable", () => {
  assert.equal(
    resolveVisitDetectionMode({
      foregroundGranted: true,
      backgroundGranted: true,
      backgroundAvailable: true,
    }),
    "FULL",
  );
  assert.equal(
    resolveVisitDetectionMode({
      foregroundGranted: true,
      backgroundGranted: false,
      backgroundAvailable: true,
    }),
    "FOREGROUND",
  );
  assert.equal(
    resolveVisitDetectionMode({
      foregroundGranted: false,
      backgroundGranted: false,
      backgroundAvailable: true,
    }),
    "UNAVAILABLE",
  );
});

import type { UserRelationship } from "@findeat/types";
import type { SearchEntityType } from "@findeat/types";

export function isFollowingRelationship(
  relationship?: UserRelationship | null,
) {
  return relationship === "FOLLOWING" || relationship === "FRIENDS";
}

export function isFriendRelationship(relationship?: UserRelationship | null) {
  return relationship === "FRIENDS";
}

export function isRequestedRelationship(
  relationship?: UserRelationship | null,
) {
  return relationship === "REQUESTED";
}

export function shouldRemoveFollowRelationship(
  relationship?: UserRelationship | null,
) {
  return isFollowingRelationship(relationship) || relationship === "REQUESTED";
}

export function getRelationshipButtonText(
  relationship?: UserRelationship | null,
) {
  switch (relationship) {
    case "FRIENDS":
      return "Friends";
    case "FOLLOWING":
      return "Following";
    case "FOLLOWED_BY":
      return "Follow back";
    case "REQUESTED":
      return "Requested";
    default:
      return "Follow";
  }
}

export function getRelationshipButtonColor(
  relationship?: UserRelationship | null,
) {
  switch (relationship) {
    case "FRIENDS":
      return "bg-[#F7D786]";
    case "FOLLOWING":
      return "bg-gray-900 dark:bg-gray-100";
    case "REQUESTED":
      return "bg-gray-200 dark:bg-gray-800";
    default:
      return "bg-black dark:bg-white";
  }
}

export function getRelationshipLabel(relationship?: UserRelationship | null) {
  switch (relationship) {
    case "FRIENDS":
      return "Friend";
    case "FOLLOWING":
      return "Following";
    case "FOLLOWED_BY":
      return "Follows you";
    case "REQUESTED":
      return "Requested";
    default:
      return undefined;
  }
}

export function getNextRelationshipAfterToggle(
  relationship?: UserRelationship | null,
): UserRelationship {
  if (relationship === "FRIENDS") return "FOLLOWED_BY";
  if (relationship === "FOLLOWING") return "NONE";
  if (relationship === "REQUESTED") return "NONE";
  // A follow-back can become FRIENDS immediately or REQUESTED when the other
  // account is private. Keep the accurate current label until the API returns
  // instead of briefly showing the incorrect generic FOLLOWING state.
  if (relationship === "FOLLOWED_BY") return "FOLLOWED_BY";

  return "FOLLOWING";
}

export function getSearchEntityLabel(type: SearchEntityType) {
  switch (type) {
    case "USER":
      return "User";
    case "RESTAURANT":
      return "Restaurant";
    case "DISH":
      return "Dish";
  }
}

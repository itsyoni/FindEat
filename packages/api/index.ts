import type { AxiosInstance } from "axios";
import { createAdminApi } from "./admin";
import { createAuthApi } from "./auth";
import { createChatsApi } from "./chats";
import { createApiClient } from "./client";
import { createMenuApi } from "./menu";
import { createPostsApi } from "./posts";
import { createRestaurantsApi } from "./restaurants";
import { createUsersApi } from "./users";
import { createNotificationsApi } from "./notifications";
import { createSupportApi } from "./support";
import { createProductUpdatesApi } from "./product-updates";
import { createReportsApi } from "./reports";
import { createPlaceListsApi } from "./place-lists";
import { createCreatorImpactApi } from "./creator-impact";
import { createProfileTagsApi } from "./profile-tags";
import { createSnapsApi } from "./snaps";
import { createSoundsApi } from "./sounds";
import { createRewardsApi } from "./rewards";
import { createReservationsApi } from "./reservations";
import { createKnownIssuesApi } from "./known-issues";

type GetToken = () => string | null | Promise<string | null>;
type RefreshAccessToken = () => Promise<string | null>;

export { createApiClient };

export function createApi(
  baseURL: string,
  getToken?: GetToken,
  refreshAccessToken?: RefreshAccessToken,
) {
  const client = createApiClient(baseURL, getToken, refreshAccessToken);

  return createApiFromClient(client);
}

export function createApiFromClient(client: AxiosInstance) {
  return {
    auth: createAuthApi(client),
    users: createUsersApi(client),
    restaurants: createRestaurantsApi(client),
    menu: createMenuApi(client),
    posts: createPostsApi(client),
    chats: createChatsApi(client),
    notifications: createNotificationsApi(client),
    admin: createAdminApi(client),
    support: createSupportApi(client),
    productUpdates: createProductUpdatesApi(client),
    reports: createReportsApi(client),
    placeLists: createPlaceListsApi(client),
    creatorImpact: createCreatorImpactApi(client),
    profileTags: createProfileTagsApi(client),
    snaps: createSnapsApi(client),
    sounds: createSoundsApi(client),
    rewards: createRewardsApi(client),
    reservations: createReservationsApi(client),
    knownIssues: createKnownIssuesApi(client),
  };
}

export type FindEatApi = ReturnType<typeof createApi>;

import type { Restaurant } from "./restaurant";
import type { UserSummary } from "./user";

export type PlaceListAccessRole = "OWNER" | "EDITOR" | "VIEWER";
export type PlaceListMemberRole = "EDITOR" | "VIEWER";
export type PlaceListEventType =
  | "BIRTHDAY"
  | "TRIP"
  | "DINNER"
  | "DATE_NIGHT"
  | "ANNIVERSARY"
  | "NIGHT_OUT"
  | "GRADUATION"
  | "CELEBRATION"
  | "CUSTOM";

export type PlaceListMember = UserSummary & {
  role: PlaceListAccessRole;
};

export type PlaceListSummary = {
  id: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  isPrivate: boolean;
  eventType?: PlaceListEventType | null;
  eventAt?: string | null;
  eventLocation?: string | null;
  eventLocationLatitude?: number | null;
  eventLocationLongitude?: number | null;
  allowMembersToInvite: boolean;
  createdAt: string;
  updatedAt: string;
  accessRole: PlaceListAccessRole;
  canEdit: boolean;
  canInvite: boolean;
  memberCount: number;
  memberPreviews: UserSummary[];
  pendingInviteCount: number;
  itemCount: number;
  previewImages: string[];
};

export type PlaceListDetail = Omit<
  PlaceListSummary,
  "itemCount" | "previewImages"
> & {
  members: PlaceListMember[];
  items: Array<{
    id: string;
    addedAt: string;
    restaurant: Pick<
      Restaurant,
      | "id"
      | "name"
      | "logoUrl"
      | "coverUrl"
      | "status"
      | "address"
      | "city"
      | "latitude"
      | "longitude"
      | "userRestaurant"
    >;
  }>;
};

export type PlaceListInvitation = {
  id: string;
  role: PlaceListMemberRole;
  createdAt: string;
  list: Pick<
    PlaceListSummary,
    "id" | "name" | "coverUrl" | "eventType" | "eventAt"
  >;
  invitedBy: UserSummary;
};

export type PlaceListSentInvitation = {
  id: string;
  role: PlaceListMemberRole;
  createdAt: string;
  invitee: UserSummary;
};

export type PlaceListWriteInput = {
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
  eventType?: PlaceListEventType | null;
  eventAt?: string | null;
  eventLocation?: string | null;
  eventLocationLatitude?: number | null;
  eventLocationLongitude?: number | null;
  allowMembersToInvite?: boolean;
};

export type RestaurantPlaceLists = {
  lists: PlaceListSummary[];
  selectedListIds: string[];
};

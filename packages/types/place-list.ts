import type { Restaurant } from "./restaurant";
import type { UserSummary } from "./user";

export type PlaceListAccessRole = "OWNER" | "EDITOR" | "VIEWER";
export type PlaceListMemberRole = "EDITOR" | "VIEWER";
export type PlaceListSystemType = "WANT_TO_TRY" | "VISITED" | "FAVORITES";
export type PlaceListStaySource = "SEARCH" | "MAP" | "CURRENT_LOCATION";
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
  systemType?: PlaceListSystemType | null;
  eventType?: PlaceListEventType | null;
  eventAt?: string | null;
  eventEndAt?: string | null;
  eventLocation?: string | null;
  eventLocationLatitude?: number | null;
  eventLocationLongitude?: number | null;
  destinationCountryCode?: string | null;
  destinationBounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  } | null;
  stayLocation?: {
    name?: string | null;
    latitude: number;
    longitude: number;
    source?: PlaceListStaySource | null;
  } | null;
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
    distanceFromStayKm?: number | null;
    sourcePost?: {
      id: string;
      type: "CONTENT" | "REVIEW";
      contentPost?: {
        caption?: string | null;
        imageUrl?: string | null;
        videoUrl?: string | null;
        media?: Array<{
          imageUrl?: string | null;
          videoUrl?: string | null;
          type: "IMAGE" | "VIDEO";
        }>;
      } | null;
      reviewPost?: {
        title?: string | null;
        summary?: string | null;
        coverImageUrl?: string | null;
      } | null;
    } | null;
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
  eventEndAt?: string | null;
  eventLocation?: string | null;
  eventLocationLatitude?: number | null;
  eventLocationLongitude?: number | null;
  destinationCountryCode?: string | null;
  destinationSouthLat?: number | null;
  destinationWestLng?: number | null;
  destinationNorthLat?: number | null;
  destinationEastLng?: number | null;
  stayName?: string | null;
  stayLatitude?: number | null;
  stayLongitude?: number | null;
  staySource?: PlaceListStaySource | null;
  allowMembersToInvite?: boolean;
};

export type RestaurantPlaceLists = {
  lists: PlaceListSummary[];
  selectedListIds: string[];
};

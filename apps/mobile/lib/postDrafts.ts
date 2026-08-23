import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type {
  CreateReviewDraft,
  CreateReviewStep,
  PostVisibility,
  ReviewDishFormDraft,
  ReviewInviteeDraft,
  SelectedReviewDish,
  SelectedRestaurant,
  SoundSelection,
} from "@findeat/types";
import type { PhotoFilterId } from "@/lib/photoFilters";
import type { ContentCropRect } from "@/components/create/ContentCropPreview";

export type ContentPostDraft = {
  step:
    | "CAMERA"
    | "EDIT_MEDIA"
    | "DETAILS"
    | "RESTAURANT"
    | "PEOPLE"
    | "READY"
    | "REVIEW";
  imageUri?: string;
  media: ContentMediaDraft[];
  caption: string;
  /** @deprecated Read-only compatibility with drafts saved before 1.9.84. */
  description?: string;
  visibility: PostVisibility;
  linkedPostId?: string;
  selectedRestaurant: SelectedRestaurant | null;
  taggedPeople: ReviewInviteeDraft[];
  soundSelection?: SoundSelection | null;
  updatedAt: string;
};

export type ContentMediaDraft = {
  id: string;
  type: "IMAGE" | "VIDEO";
  uri: string;
  originalUri?: string;
  cropSourceUri?: string;
  cropSourceWidth?: number;
  cropSourceHeight?: number;
  crop?: ContentCropRect;
  filterSourceUri?: string;
  photoFilter?: PhotoFilterId;
  originalWidth?: number;
  originalHeight?: number;
  width: number;
  height: number;
  durationMs?: number;
  locationLatitude?: number;
  locationLongitude?: number;
};

export type ReviewPostDraft = {
  step: CreateReviewStep;
  draft: CreateReviewDraft;
  selectedMenuDish: SelectedReviewDish | null;
  pendingDish: ReviewDishFormDraft | null;
  editingDishId?: string | null;
  updatedAt: string;
};

type DraftType = "content" | "review";

const draftOperationQueues = new Map<string, Promise<unknown>>();

function storageKey(userId: string, type: DraftType) {
  return `findeat_post_draft_${userId}_${type}`;
}

function enqueueDraftOperation<T>(
  userId: string,
  type: DraftType,
  operation: () => Promise<T>,
) {
  const key = storageKey(userId, type);
  const previous = draftOperationQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  const settled = next.then(
    () => undefined,
    () => undefined,
  );
  draftOperationQueues.set(key, settled);
  void settled.finally(() => {
    if (draftOperationQueues.get(key) === settled) {
      draftOperationQueues.delete(key);
    }
  });
  return next;
}

function draftDirectory(userId: string, type: DraftType) {
  return `${FileSystem.documentDirectory}post-drafts/${userId}/${type}/`;
}

async function keepDraftImage(
  uri: string | undefined,
  userId: string,
  type: DraftType,
  name: string,
) {
  if (!uri) return undefined;
  const directory = draftDirectory(userId, type);
  if (uri.startsWith(directory)) return uri;

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const extension = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1] ?? "jpg";
  const uriHash = [...uri].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const safeName =
    name
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "media";
  const destination = `${directory}${safeName}-${uriHash}.${extension}`;
  const existing = await FileSystem.getInfoAsync(destination);
  if (existing.exists) return destination;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function persistContentMediaUri(
  userId: string,
  uri: string,
  name: string,
) {
  return keepDraftImage(uri, userId, "content", name);
}

export async function persistReviewMediaUri(
  userId: string,
  uri: string,
  name: string,
) {
  return keepDraftImage(uri, userId, "review", name);
}

async function existingImage(uri: string | undefined) {
  if (!uri) return undefined;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : undefined;
}

export async function loadContentPostDraft(userId: string) {
  const stored = await AsyncStorage.getItem(storageKey(userId, "content"));
  if (!stored) return null;
  const parsed = JSON.parse(stored) as ContentPostDraft;
  const caption = parsed.caption ?? parsed.description ?? "";
  const legacyMedia: ContentMediaDraft[] = parsed.imageUri
    ? [
        {
          id: "legacy-image",
          type: "IMAGE",
          uri: parsed.imageUri,
          width: 4,
          height: 5,
        },
      ]
    : [];
  const media = await Promise.all(
    (parsed.media ?? legacyMedia).map(async (item): Promise<ContentMediaDraft | null> => {
      const uri = await existingImage(item.uri);
      if (!uri) return null;
      const originalUri = await existingImage(item.originalUri);
      const filterSourceUri = await existingImage(item.filterSourceUri);
      const cropSourceUri = await existingImage(item.cropSourceUri);
      return {
        ...item,
        uri,
        originalUri: originalUri ?? uri,
        filterSourceUri,
        cropSourceUri,
        originalWidth: item.originalWidth ?? item.width,
        originalHeight: item.originalHeight ?? item.height,
      };
    }),
  );
  const existingMedia = media.filter(
    (item): item is ContentMediaDraft => item !== null,
  );
  if (!existingMedia.length) {
    await clearPostDraft(userId, "content");
    return null;
  }
  return {
    ...parsed,
    caption,
    description: undefined,
    imageUri: existingMedia[0].uri,
    media: existingMedia,
  };
}

export async function saveContentPostDraft(
  userId: string,
  draft: Omit<ContentPostDraft, "updatedAt">,
) {
  return enqueueDraftOperation(userId, "content", async () => {
    const sourceMedia =
      draft.media?.length
        ? draft.media
        : draft.imageUri
          ? [
              {
                id: "legacy-image",
                type: "IMAGE" as const,
                uri: draft.imageUri,
                width: 4,
                height: 5,
              },
            ]
          : [];
    const media = (
      await Promise.all(
        sourceMedia.map(async (item, index): Promise<ContentMediaDraft | null> => {
          const uri = await keepDraftImage(
            item.uri,
            userId,
            "content",
            `post-media-${index}`,
          );
          if (!uri) return null;
          const originalUri = await keepDraftImage(
            item.originalUri ?? item.uri,
            userId,
            "content",
            `post-media-${index}-original`,
          );
          const filterSourceUri = await keepDraftImage(
            item.filterSourceUri,
            userId,
            "content",
            `post-media-${index}-filter-source`,
          );
          const cropSourceUri = await keepDraftImage(
            item.cropSourceUri,
            userId,
            "content",
            `post-media-${index}-crop-source`,
          );
          return {
            ...item,
            uri,
            originalUri: originalUri ?? uri,
            filterSourceUri,
            cropSourceUri,
            originalWidth: item.originalWidth ?? item.width,
            originalHeight: item.originalHeight ?? item.height,
          };
        }),
      )
    ).filter((item): item is ContentMediaDraft => item !== null);
    if (!media.length) return;
    await AsyncStorage.setItem(
      storageKey(userId, "content"),
      JSON.stringify({
        ...draft,
        imageUri: media[0]!.uri,
        media,
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}

export async function loadReviewPostDraft(userId: string) {
  const stored = await AsyncStorage.getItem(storageKey(userId, "review"));
  if (!stored) return null;
  const parsed = JSON.parse(stored) as ReviewPostDraft;
  return {
    ...parsed,
    draft: {
      ...parsed.draft,
      coverImageUri: await existingImage(parsed.draft.coverImageUri),
      items: await Promise.all(
        parsed.draft.items.map(async (item) => ({
          ...item,
          imageUri: await existingImage(item.imageUri),
        })),
      ),
    },
    pendingDish: parsed.pendingDish
      ? {
          ...parsed.pendingDish,
          imageUri: await existingImage(parsed.pendingDish.imageUri),
        }
      : null,
  };
}

export async function saveReviewPostDraft(
  userId: string,
  value: Omit<ReviewPostDraft, "updatedAt">,
) {
  return enqueueDraftOperation(userId, "review", async () => {
    const draft = {
      ...value.draft,
      coverImageUri: await keepDraftImage(
        value.draft.coverImageUri,
        userId,
        "review",
        "cover",
      ),
      items: await Promise.all(
        value.draft.items.map(async (item) => ({
          ...item,
          imageUri: await keepDraftImage(
            item.imageUri,
            userId,
            "review",
            `dish-${item.id}`,
          ),
        })),
      ),
    };
    const pendingDish = value.pendingDish
      ? {
          ...value.pendingDish,
          imageUri: await keepDraftImage(
            value.pendingDish.imageUri,
            userId,
            "review",
            "pending-dish",
          ),
        }
      : null;
    await AsyncStorage.setItem(
      storageKey(userId, "review"),
      JSON.stringify({
        ...value,
        draft,
        pendingDish,
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}

export async function clearPostDraft(userId: string, type: DraftType) {
  return enqueueDraftOperation(userId, type, async () => {
    await AsyncStorage.removeItem(storageKey(userId, type));
    try {
      await FileSystem.deleteAsync(draftDirectory(userId, type), {
        idempotent: true,
      });
    } catch (error) {
      console.warn("Could not remove post draft images", error);
    }
  });
}

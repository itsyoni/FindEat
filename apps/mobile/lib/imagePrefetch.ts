import type { Post } from "@findeat/types";
import { Image } from "expo-image";

const scheduled = new Set<string>();

export function postImageUrls(post?: Post | null, firstOnly = false) {
  if (!post) return [];

  if (post.type === "CONTENT") {
    const images =
      post.contentPost?.media
        ?.map((item) => item.imageUrl)
        .filter((url): url is string => !!url) ?? [];
    if (images.length) return firstOnly ? images.slice(0, 1) : images;
    return post.contentPost?.imageUrl ? [post.contentPost.imageUrl] : [];
  }

  const urls = [
    post.reviewPost?.coverImageUrl,
    ...(firstOnly
      ? []
      : (post.reviewPost?.items ?? []).map(
          (item) =>
            item.primaryMedia?.imageUrl ??
            item.imageUrl ??
            item.menuItem?.imageUrl,
        )),
  ];
  return urls.filter((url): url is string => !!url);
}

export function prefetchImageUrls(urls: (string | null | undefined)[]) {
  const next = [...new Set(urls.filter((url): url is string => !!url))].filter(
    (url) => !scheduled.has(url),
  );
  if (next.length === 0) return;

  next.forEach((url) => scheduled.add(url));
  void Image.prefetch(next, { cachePolicy: "memory-disk" }).then((success) => {
    if (!success) next.forEach((url) => scheduled.delete(url));
  });
}

export function prefetchUpcomingPosts(posts: Post[], visibleIndex: number) {
  prefetchImageUrls(
    posts
      .slice(visibleIndex + 1, visibleIndex + 3)
      .flatMap((post) => postImageUrls(post, true)),
  );
}

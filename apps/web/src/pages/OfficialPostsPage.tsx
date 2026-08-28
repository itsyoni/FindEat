import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ImageSquareIcon } from "@phosphor-icons/react/dist/csr/ImageSquare";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import type { ManagedRestaurant, RestaurantPostsPage } from "@findeat/types";
import { request, uploadImage } from "../lib/api";

const MAX_IMAGES = 10;

type SelectedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

function readPhotoDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(url);
      if (width > 0 && height > 0) resolve({ width, height });
      else reject(new Error("Could not read this photo's dimensions"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser could not read one of the selected photos. Try a JPG or PNG instead."));
    };
    image.src = url;
  });
}

export function OfficialPostsPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<SelectedPhoto[]>([]);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [posts, setPosts] = useState<RestaurantPostsPage["items"]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => () => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }, []);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    setError("");
    try {
      const page = await request<RestaurantPostsPage>(
        `/restaurants/${restaurant.id}/business/official-posts`,
        { cache: "reload" },
      );
      setPosts(page.items);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load official posts");
    } finally {
      setLoadingPosts(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    let active = true;
    void request<RestaurantPostsPage>(
      `/restaurants/${restaurant.id}/business/official-posts`,
    )
      .then((page) => {
        if (active) setPosts(page.items);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Could not load official posts");
      })
      .finally(() => {
        if (active) setLoadingPosts(false);
      });
    return () => {
      active = false;
    };
  }, [restaurant.id]);

  async function choosePhotos(files: FileList | null) {
    if (!files?.length) return;
    setPreparing(true);
    setError("");
    setSuccess("");
    try {
      const available = MAX_IMAGES - photos.length;
      if (available <= 0) throw new Error(`You can add up to ${MAX_IMAGES} photos`);
      const selectedFiles = Array.from(files).slice(0, available);
      if (Array.from(files).some((file) => !file.type.startsWith("image/"))) {
        throw new Error("Official posts can contain photos only");
      }
      const next = await Promise.all(selectedFiles.map(async (file, index) => {
        const dimensions = await readPhotoDimensions(file);
        return {
          id: `${Date.now()}-${index}-${file.name}`,
          file,
          previewUrl: URL.createObjectURL(file),
          ...dimensions,
        };
      }));
      setPhotos((current) => [...current, ...next]);
      if (files.length > available) setError(`Only the first ${available} photos were added`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not prepare the selected photos");
    } finally {
      setPreparing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  async function publishPost() {
    if (!photos.length || publishing) return;
    setPublishing(true);
    setUploadStep(0);
    setError("");
    setSuccess("");
    try {
      const media = [];
      for (let index = 0; index < photos.length; index += 1) {
        setUploadStep(index + 1);
        const photo = photos[index];
        const imageUrl = await uploadImage(photo.file, "post");
        media.push({ type: "IMAGE", imageUrl, width: photo.width, height: photo.height });
      }
      await request(`/posts/restaurants/${restaurant.id}/posts`, {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id,
          caption: caption.trim() || undefined,
          media,
        }),
      });
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      setCaption("");
      setSuccess("Official post published");
      await loadPosts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not publish this post");
    } finally {
      setPublishing(false);
      setUploadStep(0);
    }
  }

  return (
    <div className="mx-auto w-full max-w-280 px-10.5 py-11 max-[800px]:px-4 max-[800px]:py-6">
      <div className="mb-6 flex items-end justify-between gap-4 max-[620px]:items-start">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black tracking-[.12em] text-accent">OFFICIAL CONTENT</p>
          <h2 className="mb-2 text-[clamp(30px,4vw,44px)] tracking-[-.04em]">Official posts</h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-muted">Share photo updates directly from your computer or mobile browser. They appear as official content on {restaurant.name}.</p>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{error}</p> : null}
      {success ? <p className="mb-4 rounded-xl bg-success-soft px-4 py-3 text-sm font-bold text-success">{success}</p> : null}

      <section className="grid grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)] overflow-hidden rounded-[24px] border border-line bg-surface shadow-panel max-[820px]:grid-cols-1">
        <div className="min-h-105 border-r border-line bg-surface-subtle p-5 max-[820px]:min-h-0 max-[820px]:border-r-0 max-[820px]:border-b max-[520px]:p-3">
          {photos.length ? (
            <div className="grid grid-cols-2 gap-3 max-[520px]:gap-2">
              {photos.map((photo, index) => (
                <div key={photo.id} className={`group relative overflow-hidden rounded-2xl bg-soft ${index === 0 && photos.length % 2 === 1 ? "col-span-2 aspect-4/5 max-h-130" : "aspect-4/5"}`}>
                  <img className="h-full w-full object-cover" src={photo.previewUrl} alt={`Selected photo ${index + 1}`} />
                  <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-[#171717]/65 text-xs font-black text-[#faf9f6] backdrop-blur-sm">{index + 1}</span>
                  <button type="button" className="absolute top-2 right-2 grid size-9 place-items-center rounded-full border-0 bg-[#171717]/65 p-0 text-[#faf9f6] backdrop-blur-sm" onClick={() => removePhoto(photo.id)} aria-label={`Remove photo ${index + 1}`}><TrashIcon size={17} weight="duotone" /></button>
                </div>
              ))}
              {photos.length < MAX_IMAGES ? <button type="button" className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-soft text-sm font-extrabold text-ink" onClick={() => inputRef.current?.click()}><PlusIcon size={20} weight="bold" /> Add photos</button> : null}
            </div>
          ) : (
            <button type="button" className="grid min-h-95 w-full place-items-center rounded-[20px] border border-dashed border-line bg-soft p-8 text-center text-ink transition hover:border-accent hover:bg-accent-soft max-[520px]:min-h-70" onClick={() => inputRef.current?.click()}>
              <span>
                <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-surface text-accent shadow-panel"><ImageSquareIcon size={29} weight="duotone" /></span>
                <strong className="block text-lg">Choose photos</strong>
                <small className="mt-2 block max-w-xs text-xs leading-5 text-muted">Select up to {MAX_IMAGES} JPG, PNG, WebP, HEIC, or HEIF photos. Videos are not supported.</small>
              </span>
            </button>
          )}
          <input ref={inputRef} className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => void choosePhotos(event.target.files)} />
        </div>

        <div className="flex min-w-0 flex-col p-6 max-[520px]:p-4">
          <div>
            <p className="mb-1 text-xs font-black tracking-[.08em] text-accent">{restaurant.name}</p>
            <h3 className="m-0 text-2xl tracking-[-.03em]">Create an official post</h3>
            <p className="mt-2 text-sm leading-5 text-muted">Followers will recognize this as content published by the restaurant.</p>
          </div>
          <label className="mt-6 grid gap-2 text-xs font-extrabold text-muted">Caption <span className="font-normal">(optional)</span>
            <textarea className="min-h-36 resize-y rounded-2xl border border-line bg-surface-subtle p-4 text-sm leading-6 text-ink outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2200} placeholder="What would you like guests to know?" />
          </label>
          <div className="mt-auto pt-6">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted"><span>{photos.length}/{MAX_IMAGES} photos</span><span>{caption.length}/2200</span></div>
            <button type="button" className="flex min-h-12 w-full items-center justify-center rounded-xl border-0 bg-accent px-4 font-extrabold text-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-45" disabled={!photos.length || preparing || publishing} onClick={() => void publishPost()}>
              {preparing ? "Preparing photos…" : publishing ? `Uploading ${uploadStep} of ${photos.length}…` : "Publish official post"}
            </button>
          </div>
        </div>
      </section>

      <div className="mt-9 mb-4 flex items-center justify-between gap-3">
        <div><h3 className="m-0 text-2xl tracking-[-.03em]">Recent official posts</h3><p className="mt-1 mb-0 text-xs text-muted">Published by this restaurant</p></div>
        <button type="button" className="grid size-10 place-items-center rounded-full border border-line bg-surface p-0 text-ink" onClick={() => void loadPosts()} disabled={loadingPosts} aria-label="Refresh official posts"><ArrowClockwiseIcon className={loadingPosts ? "animate-spin" : ""} size={19} weight="bold" /></button>
      </div>
      {loadingPosts ? <div className="grid min-h-45 place-items-center rounded-[22px] border border-line bg-surface text-sm text-muted">Loading official posts…</div> : posts.length ? (
        <div className="grid grid-cols-3 gap-3 max-[820px]:grid-cols-2 max-[480px]:grid-cols-1">
          {posts.map((post) => <article key={post.id} className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-panel">
            {post.imageUrl ? <img className="aspect-4/5 w-full bg-soft object-cover" src={post.imageUrl} alt="" /> : <div className="grid aspect-4/5 place-items-center bg-soft text-muted"><ImageSquareIcon size={30} weight="duotone" /></div>}
            <div className="p-4"><p className="m-0 line-clamp-3 text-sm leading-5 text-ink">{post.description || "Official photo update"}</p><small className="mt-2 block text-[11px] text-muted">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Published"}{post.publishedBy ? ` · by ${post.publishedBy.displayName || `@${post.publishedBy.username}`}` : ""}</small></div>
          </article>)}
        </div>
      ) : <div className="grid min-h-45 place-items-center rounded-[22px] border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">Your restaurant’s official posts will appear here.</div>}
    </div>
  );
}

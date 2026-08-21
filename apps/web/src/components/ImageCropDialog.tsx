import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";

type CropKind = "logo" | "cover";

type ImageCropDialogProps = {
  file: File;
  kind: CropKind;
  onCancel: () => void;
  onComplete: (file: File, previewUrl: string) => void;
};

const cropSettings = {
  logo: {
    aspectRatio: 1,
    outputWidth: 1000,
    outputHeight: 1000,
    title: "Crop your logo",
    description: "Drag to position the logo inside the square.",
  },
  cover: {
    aspectRatio: 16 / 9,
    outputWidth: 1600,
    outputHeight: 900,
    title: "Crop your cover",
    description: "Drag to choose the part shown across your restaurant profile.",
  },
} satisfies Record<CropKind, {
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  title: string;
  description: string;
}>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function croppedFileName(fileName: string, mimeType: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "restaurant-image";
  const extension = mimeType === "image/png" ? "png" : "jpg";
  return `${baseName}-cropped.${extension}`;
}

export function ImageCropDialog({
  file,
  kind,
  onCancel,
  onComplete,
}: ImageCropDialogProps) {
  const settings = cropSettings[kind];
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const sourceUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => URL.revokeObjectURL(sourceUrl), [sourceUrl]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      setViewport({ width: bounds.width, height: bounds.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, saving]);

  const baseScale = imageSize.width && imageSize.height && viewport.width && viewport.height
    ? Math.max(viewport.width / imageSize.width, viewport.height / imageSize.height)
    : 1;
  const renderedWidth = imageSize.width * baseScale * zoom;
  const renderedHeight = imageSize.height * baseScale * zoom;
  const maximumOffset = {
    x: Math.max(0, (renderedWidth - viewport.width) / 2),
    y: Math.max(0, (renderedHeight - viewport.height) / 2),
  };
  const visibleOffset = {
    x: clamp(offset.x, -maximumOffset.x, maximumOffset.x),
    y: clamp(offset.y, -maximumOffset.y, maximumOffset.y),
  };

  function moveImage(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = {
      x: visibleOffset.x + event.clientX - drag.x,
      y: visibleOffset.y + event.clientY - drag.y,
    };
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setOffset({
      x: clamp(next.x, -maximumOffset.x, maximumOffset.x),
      y: clamp(next.y, -maximumOffset.y, maximumOffset.y),
    });
  }

  function finishDragging(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function changeZoom(nextZoom: number) {
    const nextRenderedWidth = imageSize.width * baseScale * nextZoom;
    const nextRenderedHeight = imageSize.height * baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset((current) => ({
      x: clamp(current.x, -Math.max(0, (nextRenderedWidth - viewport.width) / 2), Math.max(0, (nextRenderedWidth - viewport.width) / 2)),
      y: clamp(current.y, -Math.max(0, (nextRenderedHeight - viewport.height) / 2), Math.max(0, (nextRenderedHeight - viewport.height) / 2)),
    }));
  }

  async function applyCrop() {
    const image = imageRef.current;
    if (!image || !imageSize.width || !viewport.width || saving) return;
    setSaving(true);
    setError("");
    try {
      const scale = baseScale * zoom;
      const sourceWidth = viewport.width / scale;
      const sourceHeight = viewport.height / scale;
      const sourceX = imageSize.width / 2 - sourceWidth / 2 - visibleOffset.x / scale;
      const sourceY = imageSize.height / 2 - sourceHeight / 2 - visibleOffset.y / scale;
      const canvas = document.createElement("canvas");
      canvas.width = settings.outputWidth;
      canvas.height = settings.outputHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not crop this image.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        settings.outputWidth,
        settings.outputHeight,
      );
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("Could not create the cropped image.")),
          outputType,
          0.9,
        );
      });
      const croppedFile = new File(
        [blob],
        croppedFileName(file.name, outputType),
        { type: outputType, lastModified: Date.now() },
      );
      onComplete(croppedFile, URL.createObjectURL(croppedFile));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not crop this image.");
      setSaving(false);
    }
  }

  return (
    <div
      className="image-crop-backdrop [position:fixed] [z-index:120] [inset:0] [display:grid] [place-items:center] [padding:24px] [background:#17171780] [backdrop-filter:blur(6px)] max-[600px]:[padding:0]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        className="image-crop-dialog [width:min(680px,100%)] [max-height:calc(100dvh_-_48px)] [overflow:auto] [overscroll-behavior:contain] [border:1px_solid_var(--line)] [border-radius:24px] [background:var(--surface)] [box-shadow:0_28px_90px_#0004] max-[600px]:[width:100%] max-[600px]:[max-height:100dvh] max-[600px]:[border-radius:0] max-[600px]:[height:100dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
      >
        <header className="image-crop-header flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5 [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [padding:22px_24px_18px] [border-bottom:1px_solid_var(--line)] [&_p]:[margin:0_0_5px] [&_p]:[color:var(--accent)] [&_p]:[font-size:10px] [&_p]:[font-weight:900] [&_p]:[letter-spacing:.12em] [&_h2]:[margin:0] [&_h2]:[font-size:24px] [&_h2]:[letter-spacing:-.025em] [&_span]:[display:block] [&_span]:[margin-top:6px] [&_span]:[color:var(--muted)] [&_span]:[font-size:12px] [&>button]:[display:grid] [&>button]:[place-items:center] [&>button]:[width:36px] [&>button]:[height:36px] [&>button]:[flex:0_0_auto] [&>button]:[padding:0] [&>button]:[border:0] [&>button]:[border-radius:50%] [&>button]:[background:var(--soft)] [&>button]:[color:var(--ink)] max-[600px]:[padding:18px]">
          <div>
            <p>PHOTO EDITOR</p>
            <h2 id="image-crop-title">{settings.title}</h2>
            <span>{settings.description}</span>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Close crop editor">
            <XIcon size={18} weight="bold" />
          </button>
        </header>
        <div className="image-crop-body [display:grid] [gap:18px] [padding:24px] max-[600px]:[padding:18px]">
          <div
            ref={viewportRef}
            className={`image-crop-viewport [position:relative] [width:100%] [overflow:hidden] [background:#191919] [cursor:grab] [touch-action:none] [user-select:none] [&:active]:[cursor:grabbing] [&.cover]:[border-radius:14px] [&.logo]:[width:min(440px,100%)] [&.logo]:[margin:auto] [&.logo]:[border-radius:14px] [&>img]:[position:absolute] [&>img]:[top:50%] [&>img]:[left:50%] [&>img]:[max-width:none] [&>img]:[pointer-events:none] ${kind}`}
            style={{ aspectRatio: settings.aspectRatio }}
            onPointerDown={(event) => {
              dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={moveImage}
            onPointerUp={finishDragging}
            onPointerCancel={finishDragging}
          >
            <img
              ref={imageRef}
              src={sourceUrl}
              alt=""
              draggable={false}
              onLoad={(event) => {
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              onError={() => setError("This image format cannot be edited in your browser. Try a JPG, PNG, or WebP image.")}
              style={{
                width: renderedWidth || undefined,
                height: renderedHeight || undefined,
                transform: `translate(calc(-50% + ${visibleOffset.x}px), calc(-50% + ${visibleOffset.y}px))`,
              }}
            />
            {kind === "logo" && <div className="image-crop-logo-guide [position:absolute] [inset:0] [border:2px_solid_#ffffffd9] [border-radius:50%] [box-shadow:0_0_0_999px_#00000055] [pointer-events:none]" aria-hidden="true" />}
          </div>
          <label className="image-crop-zoom [display:grid] [grid-template-columns:auto_minmax(0,1fr)] [align-items:center] [gap:14px] [color:var(--ink)] [font-size:12px] [font-weight:900] [&_input]:[min-height:0] [&_input]:[padding:0] [&_input]:[border:0] [&_input]:[accent-color:var(--accent)] [&_input]:[box-shadow:none]">
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => changeZoom(Number(event.target.value))}
              disabled={!imageSize.width}
            />
          </label>
          {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] image-crop-error [margin:0] [text-align:center]">{error}</p>}
        </div>
        <footer className="image-crop-footer [display:flex] [justify-content:flex-end] [gap:10px] [padding:17px_24px] [border-top:1px_solid_var(--line)] max-[600px]:[padding:14px_18px] max-[600px]:[padding-bottom:calc(14px_+_env(safe-area-inset-bottom))] max-[600px]:[&_button]:[flex:1]">
          <button type="button" className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" onClick={applyCrop} disabled={saving || !imageSize.width}>
            {saving ? "Preparing image…" : "Use cropped image"}
          </button>
        </footer>
      </section>
    </div>
  );
}

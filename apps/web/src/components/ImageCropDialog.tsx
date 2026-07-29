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
      className="image-crop-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        className="image-crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
      >
        <header className="image-crop-header">
          <div>
            <p>PHOTO EDITOR</p>
            <h2 id="image-crop-title">{settings.title}</h2>
            <span>{settings.description}</span>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Close crop editor">
            <XIcon size={18} weight="bold" />
          </button>
        </header>
        <div className="image-crop-body">
          <div
            ref={viewportRef}
            className={`image-crop-viewport ${kind}`}
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
            {kind === "logo" && <div className="image-crop-logo-guide" aria-hidden="true" />}
          </div>
          <label className="image-crop-zoom">
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
          {error && <p className="error image-crop-error">{error}</p>}
        </div>
        <footer className="image-crop-footer">
          <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="primary" onClick={applyCrop} disabled={saving || !imageSize.width}>
            {saving ? "Preparing image…" : "Use cropped image"}
          </button>
        </footer>
      </section>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { FileArrowUpIcon } from "@phosphor-icons/react/dist/csr/FileArrowUp";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { MagicWandIcon } from "@phosphor-icons/react/dist/csr/MagicWand";
import { MartiniIcon } from "@phosphor-icons/react/dist/csr/Martini";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { MenuCollection, MenuSectionType } from "@findeat/types";
import { request } from "../lib/api";

type DraftItem = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
};

type DraftSection = {
  id: string;
  title: string;
  sectionType: MenuSectionType;
  items: DraftItem[];
};

type ImportPreview = {
  sourceFileName: string;
  sourceKind: "spreadsheet" | "document" | "pdf" | "image" | "text";
  sections: DraftSection[];
  warnings: string[];
};

const ACCEPTED_FILES = ".xlsx,.csv,.docx,.pdf,.txt,.jpg,.jpeg,.png,.webp";

function draftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MenuImportModal({
  restaurantId,
  collection,
  onClose,
  onImported,
}: {
  restaurantId: string;
  collection: MenuCollection;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const dishCount = useMemo(
    () => preview?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0,
    [preview],
  );

  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    setReading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await request<ImportPreview>("/business/menus/import/preview", {
        method: "POST",
        body: formData,
      });
      setPreview(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not read this menu file");
    } finally {
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateSection(sectionId: string, update: Partial<DraftSection>) {
    setPreview((current) => current ? {
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...update } : section),
    } : current);
  }

  function updateItem(sectionId: string, itemId: string, update: Partial<DraftItem>) {
    setPreview((current) => current ? {
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? {
        ...section,
        items: section.items.map((item) => item.id === itemId ? { ...item, ...update } : item),
      } : section),
    } : current);
  }

  function addDish(sectionId: string) {
    setPreview((current) => current ? {
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? {
        ...section,
        items: [...section.items, { id: draftId("dish"), name: "", description: null, price: null }],
      } : section),
    } : current);
  }

  function removeDish(sectionId: string, itemId: string) {
    setPreview((current) => current ? {
      ...current,
      sections: current.sections.map((section) => section.id === sectionId
        ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
        : section),
    } : current);
  }

  function removeSection(sectionId: string) {
    setPreview((current) => current ? {
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    } : current);
  }

  function addSection() {
    setPreview((current) => current ? {
      ...current,
      sections: [...current.sections, {
        id: draftId("section"),
        title: "New section",
        sectionType: "FOOD",
        items: [{ id: draftId("dish"), name: "", description: null, price: null }],
      }],
    } : current);
  }

  async function confirmImport() {
    if (!preview) return;
    const sections = preview.sections
      .map((section) => ({
        ...section,
        title: section.title.trim(),
        items: section.items.map((item) => ({ ...item, name: item.name.trim() })).filter((item) => item.name),
      }))
      .filter((section) => section.title && section.items.length);
    if (!sections.length) {
      setError("Keep at least one section with one named dish");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await request("/business/menus/import/confirm", {
        method: "POST",
        body: JSON.stringify({
          restaurantId,
          collectionId: collection.id,
          sections: sections.map((section) => ({
            title: section.title,
            sectionType: section.sectionType,
            items: section.items.map((item) => ({
              name: item.name,
              description: item.description?.trim() || null,
              price: item.price,
            })),
          })),
        }),
      });
      await onImported();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not import this menu");
    } finally {
      setSaving(false);
    }
  }

  function fileChanged(event: ChangeEvent<HTMLInputElement>) {
    void readFile(event.target.files?.[0]);
  }

  function fileDropped(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      className="fixed inset-0 z-140 grid place-items-center bg-[#17171775] p-5 backdrop-blur-md max-[640px]:items-end max-[640px]:p-0"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !reading && !saving) onClose(); }}
    >
      <section
        className="flex max-h-[94dvh] w-full max-w-245 flex-col overflow-hidden rounded-4xl border border-line bg-surface shadow-panel max-[640px]:max-h-[96dvh] max-[640px]:rounded-b-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-import-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-6 py-5 max-[640px]:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><MagicWandIcon size={25} weight="duotone" /></span>
            <div className="min-w-0">
              <h3 id="menu-import-title" className="m-0 truncate text-xl tracking-tight">Import a menu</h3>
              <p className="m-0 mt-1 truncate text-xs text-muted">Into {collection.name}</p>
            </div>
          </div>
          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface p-0 text-ink" onClick={onClose} disabled={reading || saving} aria-label="Close"><XIcon size={19} weight="bold" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-[640px]:px-4">
          {!preview ? (
            <div className="mx-auto grid max-w-160 gap-5 py-4">
              <div className="text-center">
                <h4 className="m-0 text-2xl tracking-tight">Turn your file into an editable menu</h4>
                <p className="mx-auto mt-2 max-w-135 text-sm leading-6 text-muted">Upload it, check what FindEat found, fix anything you want, then publish. Your menu stays unchanged until you confirm.</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept={ACCEPTED_FILES} onChange={fileChanged} />
              <div
                className={`grid min-h-65 place-items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-accent bg-accent-soft" : "border-line bg-soft"}`}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={fileDropped}
              >
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-surface text-accent shadow-sm"><FileArrowUpIcon size={32} weight="duotone" /></span>
                  <strong className="mt-4 block text-base">{reading ? "Reading your menu…" : "Drop a menu here"}</strong>
                  <small className="mt-1 block text-xs leading-5 text-muted">XLSX, CSV, DOCX, PDF, TXT, JPG, PNG, or WebP · up to 15 MB</small>
                  <button type="button" className="primary mt-5 inline-flex items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={reading}>{reading ? "Please wait…" : "Choose a file"}</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
                {["No AI guesswork", "Nothing auto-publishes", "Edit before importing"].map((label) => <div key={label} className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-xs font-bold"><CheckCircleIcon size={18} weight="fill" className="shrink-0 text-positive" />{label}</div>)}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-soft px-4 py-3">
                <div className="min-w-0"><strong className="block truncate text-sm">{preview.sourceFileName}</strong><small className="mt-1 block text-[11px] text-muted">Found {preview.sections.length} section{preview.sections.length === 1 ? "" : "s"} and {dishCount} dish{dishCount === 1 ? "" : "es"}</small></div>
                <button type="button" className="secondary compact" onClick={() => { setPreview(null); setError(""); }}>Choose another file</button>
              </div>
              {preview.warnings.length > 0 && <div className="rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-warning"><div className="flex items-start gap-2"><WarningCircleIcon size={20} weight="duotone" className="mt-0.5 shrink-0" /><div><strong className="block text-xs">Worth a quick check</strong>{preview.warnings.map((warning) => <p key={warning} className="m-0 mt-1 text-[11px] leading-4">{warning}</p>)}</div></div></div>}
              {preview.sections.map((section, sectionIndex) => (
                <section key={section.id} className="overflow-hidden rounded-3xl border border-line bg-surface">
                  <div className="flex items-center gap-3 border-b border-line bg-soft px-4 py-3 max-[640px]:flex-wrap">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent">{section.sectionType === "DRINKS" ? <MartiniIcon size={19} weight="duotone" /> : <ForkKnifeIcon size={19} weight="duotone" />}</span>
                    <label className="min-w-40 flex-1"><span className="sr-only">Section name</span><input className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink" value={section.title} maxLength={100} onChange={(event) => updateSection(section.id, { title: event.target.value })} /></label>
                    <div className="flex rounded-xl border border-line bg-surface p-1"><button type="button" className={`rounded-lg border-0 px-3 py-2 text-[10px] font-extrabold ${section.sectionType === "FOOD" ? "bg-accent-soft text-ink" : "bg-transparent text-muted"}`} onClick={() => updateSection(section.id, { sectionType: "FOOD" })}>Food</button><button type="button" className={`rounded-lg border-0 px-3 py-2 text-[10px] font-extrabold ${section.sectionType === "DRINKS" ? "bg-accent-soft text-ink" : "bg-transparent text-muted"}`} onClick={() => updateSection(section.id, { sectionType: "DRINKS" })}>Drinks</button></div>
                    <button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-surface p-0 text-danger" onClick={() => removeSection(section.id)} aria-label={`Remove ${section.title || `section ${sectionIndex + 1}`}`}><TrashIcon size={17} weight="duotone" /></button>
                  </div>
                  <div className="grid gap-2 p-3">
                    {section.items.map((item, itemIndex) => (
                      <div key={item.id} className="grid grid-cols-[minmax(150px,1.1fr)_minmax(170px,1.7fr)_100px_40px] items-center gap-2 rounded-2xl border border-line bg-surface p-2 max-[720px]:grid-cols-[1fr_90px_40px]">
                        <label><span className="sr-only">Dish name</span><input className="min-h-11 w-full rounded-xl border border-line bg-soft px-3 text-sm font-bold text-ink" value={item.name} maxLength={160} placeholder={`Dish ${itemIndex + 1}`} onChange={(event) => updateItem(section.id, item.id, { name: event.target.value })} /></label>
                        <label className="max-[720px]:col-span-3 max-[720px]:row-start-2"><span className="sr-only">Description</span><input className="min-h-11 w-full rounded-xl border border-line bg-soft px-3 text-xs text-ink" value={item.description ?? ""} maxLength={500} placeholder="Description (optional)" onChange={(event) => updateItem(section.id, item.id, { description: event.target.value || null })} /></label>
                        <label><span className="sr-only">Price</span><input className="min-h-11 w-full rounded-xl border border-line bg-soft px-3 text-sm font-bold text-ink" type="number" min="0" step="0.01" value={item.price ?? ""} placeholder="Price" onChange={(event) => updateItem(section.id, item.id, { price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                        <button type="button" className="grid size-10 place-items-center rounded-xl border-0 bg-transparent p-0 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => removeDish(section.id, item.id)} aria-label={`Remove ${item.name || `dish ${itemIndex + 1}`}`}><TrashIcon size={16} weight="duotone" /></button>
                      </div>
                    ))}
                    <button type="button" className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-soft text-xs font-extrabold text-ink" onClick={() => addDish(section.id)}><PlusIcon size={16} weight="bold" /> Add dish</button>
                  </div>
                </section>
              ))}
              <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-soft text-sm font-extrabold text-ink" onClick={addSection}><PlusIcon size={18} weight="bold" /> Add section</button>
            </div>
          )}
          {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger">{error}</p>}
        </div>

        {preview && <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] max-[640px]:px-4"><p className="m-0 text-xs text-muted max-[560px]:hidden">This adds new sections to <strong className="text-ink">{collection.name}</strong>.</p><div className="ml-auto flex gap-2"><button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="primary inline-flex items-center gap-2" onClick={() => void confirmImport()} disabled={saving || dishCount === 0}>{saving ? "Importing…" : `Import ${dishCount} dish${dishCount === 1 ? "" : "es"}`}</button></div></footer>}
      </section>
    </div>
  );
}

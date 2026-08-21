import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { Dish } from "@findeat/types";
import { request, uploadImage } from "../lib/api";
import { DishFoodTags } from "./DishFoodTags";

type DishEditorModalProps = {
  dish: Dish;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function DishEditorModal({ dish, onClose, onSaved }: DishEditorModalProps) {
  const [name, setName] = useState(dish.name);
  const [category, setCategory] = useState(dish.category || "");
  const [price, setPrice] = useState(dish.price?.toString() || "");
  const [description, setDescription] = useState(dish.description || "");
  const [isAvailable, setIsAvailable] = useState(dish.isAvailable);
  const [isFeatured, setIsFeatured] = useState(dish.isFeatured);
  const [allergens, setAllergens] = useState(dish.allergens ?? []);
  const [dietaryTags, setDietaryTags] = useState(dish.dietaryTags ?? []);
  const [cuisineTags, setCuisineTags] = useState(dish.cuisineTags ?? []);
  const [dishTags, setDishTags] = useState(dish.dishTags ?? []);
  const [ingredientFlags, setIngredientFlags] = useState(dish.ingredientFlags ?? []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(dish.imageUrl || "");
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  function selectImage(file?: File) {
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Enter a dish name.");
      return;
    }
    if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      setError("Enter a valid price.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const uploadedImage = imageFile ? await uploadImage(imageFile, "dish") : undefined;
      await request(`/business/menus/dishes/${dish.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: cleanName,
          category: category.trim() || null,
          price: price.trim() ? Number(price) : null,
          description: description.trim() || null,
          isAvailable,
          isFeatured,
          allergens,
          dietaryTags,
          cuisineTags,
          dishTags,
          ingredientFlags,
          ...(uploadedImage ? { imageUrl: uploadedImage } : removeImage ? { imageUrl: null } : {}),
        }),
      });
      await onSaved();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save this dish");
    } finally {
      setSaving(false);
    }
  }

  return <div className="dish-editor-backdrop [position:fixed] [z-index:100] [inset:0] [display:grid] [place-items:center] [padding:24px] [background:#17171775] [backdrop-filter:blur(5px)] max-[650px]:[padding:0]" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <section className="dish-editor [width:min(820px,100%)] [max-height:calc(100dvh_-_48px)] [overflow:hidden] [border:1px_solid_#ffffff30] [border-radius:24px] [background:var(--surface)] [box-shadow:0_30px_100px_#0005] [&>form]:[max-height:calc(100dvh_-_130px)] [&>form]:[overflow-y:auto] [&>form]:[overscroll-behavior:contain] max-[650px]:[width:100%] max-[650px]:[max-height:100dvh] max-[650px]:[border-radius:0] max-[650px]:[&>form]:[max-height:calc(100dvh_-_82px)] max-[600px]:[height:100dvh] max-[600px]:[max-height:100dvh]" role="dialog" aria-modal="true" aria-labelledby="dish-editor-title">
      <header className="dish-editor-header flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5 [height:auto] [min-height:82px] [padding:17px_22px_16px_26px] [border-bottom:1px_solid_var(--line)] [border-radius:24px_24px_0_0] [&>div]:[display:block] [&_span]:[display:block] [&_span]:[margin-bottom:3px] [&_span]:[color:var(--accent)] [&_span]:[font-size:10px] [&_span]:[font-weight:900] [&_span]:[letter-spacing:.12em] [&_span]:[text-transform:uppercase] [&_h2]:[max-width:650px] [&_h2]:[margin:0] [&_h2]:[overflow:hidden] [&_h2]:[font-size:24px] [&_h2]:[letter-spacing:-.025em] [&_h2]:[text-overflow:ellipsis] [&_h2]:[white-space:nowrap] [&>button]:[display:grid] [&>button]:[place-items:center] [&>button]:[width:36px] [&>button]:[height:36px] [&>button]:[padding:0] [&>button]:[border:0] [&>button]:[border-radius:50%] [&>button]:[background:var(--soft)] [&>button]:[color:var(--ink)] [&>button]:[font-size:22px] max-[650px]:[border-radius:0] max-[600px]:[&_h2]:[font-size:20px]">
        <div><span>Edit dish</span><h2 id="dish-editor-title">{dish.name}</h2></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close editor"><XIcon size={18} weight="bold" /></button>
      </header>
      <form onSubmit={save}>
        <div className="dish-editor-body [display:grid] [grid-template-columns:230px_minmax(0,1fr)] [gap:26px] [padding:26px] max-[650px]:[grid-template-columns:1fr] max-[650px]:[padding:18px] max-[600px]:[padding:16px]">
          <div className="dish-editor-media [display:flex] [flex-direction:column] [align-items:stretch] [gap:10px] [&>.text-danger]:[align-self:center] [&>.text-danger]:[padding:3px_8px] [&>.text-danger]:[font-size:11px] [&>small]:[color:var(--muted)] [&>small]:[font-size:10px] [&>small]:[line-height:1.45] [&>small]:[text-align:center] max-[650px]:[display:grid] max-[650px]:[grid-template-columns:110px_1fr] max-[650px]:[align-items:center] max-[650px]:[&>small]:[text-align:left] max-[600px]:[grid-template-columns:88px_minmax(0,1fr)]">
            <div className="dish-editor-preview [display:grid] [place-items:center] [width:100%] [aspect-ratio:1] [overflow:hidden] [border-radius:18px] [background:linear-gradient(145deg,#f1ede8,#e4ded6)] [color:#8a8177] [font-size:34px] [&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] max-[650px]:[grid-row:1/4] [background:linear-gradient(145deg,var(--surface-subtle),var(--neutral-chip))] [color:var(--muted)]">{imagePreview ? <img src={imagePreview} alt="Dish preview" /> : <ImageIcon size={38} weight="duotone" aria-hidden="true" />}</div>
            <label className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] dish-editor-upload [display:grid] [place-items:center] [padding:11px_14px] [cursor:pointer] [text-align:center] [&_input]:[display:none]"><input type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0])} /><span>{imagePreview ? "Change photo" : "Add photo"}</span></label>
            {imagePreview && <button type="button" className="text-danger [color:#b54635] [border:0] [background:none] [font-weight:700] [color:var(--danger)]" onClick={() => { setImageFile(null); setImagePreview(""); setRemoveImage(true); }}>Remove photo</button>}
            <small>Use a clear landscape or square image.</small>
          </div>
          <div className="dish-editor-fields [display:grid] [grid-template-columns:1.5fr_1fr] [align-content:start] [gap:18px_14px] [&_.full]:[grid-column:1/-1] max-[650px]:[grid-template-columns:1fr] max-[650px]:[&_.full]:[grid-column:auto]">
            <label className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">Dish name<input value={name} onChange={(event) => setName(event.target.value)} autoFocus required /></label>
            <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Main dishes" /></label>
            <label>Price<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" /></label>
            <label className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="What makes this dish special?" /></label>
            <div className="dish-editor-options [display:grid] [grid-template-columns:1fr_1fr] [gap:10px] [&>label]:[display:grid] [&>label]:[grid-template-columns:auto_minmax(0,1fr)] [&>label]:[align-items:start] [&>label]:[gap:10px] [&>label]:[padding:13px] [&>label]:[border:1px_solid_var(--line)] [&>label]:[border-radius:13px] [&>label]:[background:var(--soft)] [&>label]:[cursor:pointer] [&_input]:[width:17px] [&_input]:[height:17px] [&_input]:[margin:2px_0_0] [&_input]:[accent-color:var(--ink)] [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[margin-top:3px] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px] [&_small]:[font-weight:500] [&_small]:[line-height:1.35] max-[650px]:[grid-template-columns:1fr] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
              <label><input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} /><span><strong>Available</strong><small>Customers can currently order this dish</small></span></label>
              <label><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /><span><strong>Restaurant pick</strong><small>Feature this dish on the restaurant menu</small></span></label>
            </div>
            <div className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
              <DishFoodTags
                allergens={allergens}
                dietaryTags={dietaryTags}
                cuisineTags={cuisineTags}
                dishTags={dishTags}
                ingredientFlags={ingredientFlags}
                onAllergensChange={setAllergens}
                onDietaryTagsChange={setDietaryTags}
                onCuisineTagsChange={setCuisineTags}
                onDishTagsChange={setDishTags}
                onIngredientFlagsChange={setIngredientFlags}
                compact
              />
            </div>
          </div>
        </div>
        {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] dish-editor-error [margin:0_26px] [padding:10px_13px] [border-radius:10px] [background:#fff0f0] max-[650px]:[margin:0_18px] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
        <footer className="dish-editor-footer [position:sticky] [bottom:0] [display:flex] [justify-content:flex-end] [gap:10px] [padding:18px_26px] [border-top:1px_solid_var(--line)] [background:var(--surface)] max-[650px]:[padding:14px_18px] max-[600px]:[padding:12px_16px_calc(12px_+_env(safe-area-inset-bottom))] max-[600px]:[&_button]:[flex:1]"><button type="button" className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={onClose} disabled={saving}>Cancel</button><button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={saving || !name.trim()}>{saving ? imageFile ? "Uploading and saving…" : "Saving…" : "Save changes"}</button></footer>
      </form>
    </section>
  </div>;
}

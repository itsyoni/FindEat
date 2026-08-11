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

  return <div className="dish-editor-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <section className="dish-editor" role="dialog" aria-modal="true" aria-labelledby="dish-editor-title">
      <header className="dish-editor-header">
        <div><span>Edit dish</span><h2 id="dish-editor-title">{dish.name}</h2></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close editor"><XIcon size={18} weight="bold" /></button>
      </header>
      <form onSubmit={save}>
        <div className="dish-editor-body">
          <div className="dish-editor-media">
            <div className="dish-editor-preview">{imagePreview ? <img src={imagePreview} alt="Dish preview" /> : <ImageIcon size={38} weight="duotone" aria-hidden="true" />}</div>
            <label className="secondary dish-editor-upload"><input type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0])} /><span>{imagePreview ? "Change photo" : "Add photo"}</span></label>
            {imagePreview && <button type="button" className="text-danger" onClick={() => { setImageFile(null); setImagePreview(""); setRemoveImage(true); }}>Remove photo</button>}
            <small>Use a clear landscape or square image.</small>
          </div>
          <div className="dish-editor-fields">
            <label className="full">Dish name<input value={name} onChange={(event) => setName(event.target.value)} autoFocus required /></label>
            <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Main dishes" /></label>
            <label>Price<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" /></label>
            <label className="full">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="What makes this dish special?" /></label>
            <div className="dish-editor-options full">
              <label><input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} /><span><strong>Available</strong><small>Customers can currently order this dish</small></span></label>
              <label><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /><span><strong>Restaurant pick</strong><small>Feature this dish on the restaurant menu</small></span></label>
            </div>
            <div className="full">
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
        {error && <p className="error dish-editor-error">{error}</p>}
        <footer className="dish-editor-footer"><button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="primary" disabled={saving || !name.trim()}>{saving ? imageFile ? "Uploading and saving…" : "Saving…" : "Save changes"}</button></footer>
      </form>
    </section>
  </div>;
}

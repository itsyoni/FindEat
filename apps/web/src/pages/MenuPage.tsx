import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ListDashesIcon } from "@phosphor-icons/react/dist/csr/ListDashes";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { HeartIcon } from "@phosphor-icons/react/dist/csr/Heart";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/dist/csr/DotsThreeVertical";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { Dish, Menu } from "@findeat/types";
import { DishEditorModal } from "../components/DishEditorModal";
import { DishFoodTags } from "../components/DishFoodTags";
import { DishInsightsModal } from "../components/DishInsightsModal";
import { foodTagLabel } from "../lib/foodTags";
import { request, uploadImage } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";
import { promptAction } from "../lib/appPrompt";

function DishRowFoodTags({
  allergens = [],
  dietaryTags = [],
  dishTags = [],
}: {
  allergens?: string[];
  dietaryTags?: string[];
  dishTags?: string[];
}) {
  const tags = [
    ...allergens.map((value) => ({ value, tone: "warning" })),
    ...dietaryTags.map((value) => ({ value, tone: "positive" })),
    ...dishTags.map((value) => ({ value, tone: "positive" })),
  ];

  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, 2);
  const hiddenTags = tags.slice(2);

  return (
    <div className="dish-row-food-tags">
      {visibleTags.map((tag) => (
        <span className={tag.tone} key={`${tag.tone}-${tag.value}`}>
          {foodTagLabel(tag.value)}
        </span>
      ))}
      {hiddenTags.length > 0 && (
        <details className="dish-row-more-tags">
          <summary aria-label={`Show ${hiddenTags.length} more food tags`}>
            +{hiddenTags.length}
          </summary>
          <div className="dish-row-more-tags-panel">
            <strong>More dish information</strong>
            <div>
              {hiddenTags.map((tag) => (
                <span className={tag.tone} key={`${tag.tone}-${tag.value}`}>
                  {foodTagLabel(tag.value)}
                </span>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

export function MenuPage({
  menus,
  restaurantId,
  reload,
}: {
  menus: Menu[];
  restaurantId: string;
  reload: () => Promise<void>;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(menus[0]?.id ?? null);
  const [dishMenu, setDishMenu] = useState<string | null>(null);
  const [dishName, setDishName] = useState("");
  const [dishDescription, setDishDescription] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishCategory, setDishCategory] = useState("");
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishAllergens, setDishAllergens] = useState<string[]>([]);
  const [dishDietaryTags, setDishDietaryTags] = useState<string[]>([]);
  const [dishCuisineTags, setDishCuisineTags] = useState<string[]>([]);
  const [dishTags, setDishTags] = useState<string[]>([]);
  const [dishIngredientFlags, setDishIngredientFlags] = useState<string[]>([]);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [insightsDish, setInsightsDish] = useState<Dish | null>(null);
  const [openDishOptions, setOpenDishOptions] = useState<string | null>(null);
  const [error, setError] = useState("");
  const popularDishIds = useMemo(
    () =>
      new Set(
        menus
          .flatMap((menu) => menu.items)
          .filter((dish) => (dish.reviewsCount ?? 0) > 0)
          .sort(
            (a, b) =>
              (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0) ||
              (b.averageRating ?? 0) - (a.averageRating ?? 0),
          )
          .slice(0, 3)
          .map((dish) => dish.id),
      ),
    [menus],
  );

  async function createMenu(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await request("/business/menus", {
        method: "POST",
        body: JSON.stringify({ title: newTitle, restaurantId }),
      });
      setNewTitle("");
      setCreateSectionOpen(false);
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not create menu section",
      );
    }
  }

  async function createDish(event: FormEvent) {
    event.preventDefault();
    if (!dishMenu || !dishName.trim()) return;
    try {
      const imageUrl = dishImage ? await uploadImage(dishImage, "dish") : undefined;
      await request(`/business/menus/${dishMenu}/dishes`, {
        method: "POST",
        body: JSON.stringify({
          name: dishName,
          description: dishDescription || undefined,
          price: dishPrice ? Number(dishPrice) : undefined,
          category: dishCategory || undefined,
          imageUrl,
          allergens: dishAllergens,
          dietaryTags: dishDietaryTags,
          cuisineTags: dishCuisineTags,
          dishTags,
          ingredientFlags: dishIngredientFlags,
        }),
      });
      setDishName("");
      setDishDescription("");
      setDishPrice("");
      setDishCategory("");
      setDishImage(null);
      setDishAllergens([]);
      setDishDietaryTags([]);
      setDishCuisineTags([]);
      setDishTags([]);
      setDishIngredientFlags([]);
      setDishMenu(null);
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not add dish",
      );
    }
  }

  async function updateDish(dish: Dish, patch: Partial<Dish>) {
    setError("");
    try {
      await request(`/business/menus/dishes/${dish.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update dish");
    }
  }

  async function deleteDish(id: string) {
    if (!(await confirmAction({
      title: "Delete this dish?",
      message: "This dish will be removed from the restaurant menu.",
      confirmLabel: "Delete dish",
      tone: "destructive",
    }))) return;
    await request(`/business/menus/dishes/${id}`, { method: "DELETE" });
    await reload();
  }

  async function editMenu(menu: Menu) {
    const title = await promptAction({
      title: "Rename menu section",
      message: "Choose the title guests will see on the restaurant menu.",
      initialValue: menu.title,
      placeholder: "Section name",
      confirmLabel: "Save name",
    });
    if (title === null || !title.trim()) return;
    await request(`/business/menus/${menu.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: title.trim() }),
    });
    await reload();
  }

  async function deleteMenu(menu: Menu) {
    if (menu.items.length) {
      setError("Delete the dishes in this section first.");
      return;
    }
    if (!(await confirmAction({
      title: `Delete “${menu.title}”?`,
      message: "This menu section will be removed permanently.",
      confirmLabel: "Delete section",
      tone: "destructive",
    }))) return;
    await request(`/business/menus/${menu.id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="page-stack" onClick={() => setOpenDishOptions(null)}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESTAURANT MENU</p>
          <h2>Menu</h2>
          <p className="muted">
            Build the menu customers see on your FindEat profile.
          </p>
        </div>
        <button
          type="button"
          className="primary menu-add-section-button"
          onClick={() => {
            setError("");
            setCreateSectionOpen(true);
          }}
        >
          <PlusIcon size={18} weight="bold" aria-hidden="true" />
          Add section
        </button>
      </div>
      {error && <p className="error banner">{error}</p>}
      {createSectionOpen && (
        <div
          className="menu-section-create-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateSectionOpen(false);
          }}
        >
          <form
            className="menu-section-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-menu-section-title"
            onSubmit={createMenu}
          >
            <div className="menu-section-create-header">
              <div className="menu-section-create-icon">
                <ListDashesIcon size={24} weight="duotone" aria-hidden="true" />
              </div>
              <button
                type="button"
                className="menu-section-create-close"
                aria-label="Close"
                onClick={() => setCreateSectionOpen(false)}
              >
                <XIcon size={20} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <h3 id="create-menu-section-title">Create menu section</h3>
            <p>
              Group related dishes together so guests can browse your menu easily.
            </p>
            <label htmlFor="new-menu-section-title">Section name</label>
            <input
              id="new-menu-section-title"
              autoFocus
              placeholder="For example, Breakfast"
              value={newTitle}
              maxLength={80}
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <div className="menu-section-create-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setCreateSectionOpen(false)}
              >
                Cancel
              </button>
              <button className="primary" disabled={!newTitle.trim()}>
                Create section
              </button>
            </div>
          </form>
        </div>
      )}
      {menus.length === 0 ? (
        <div className="empty">
          <ListDashesIcon size={34} weight="duotone" aria-hidden="true" />
          <h3>Your menu is empty</h3>
          <p>Add your first section, then fill it with dishes.</p>
        </div>
      ) : (
        menus.map((menu) => (
          <section className="menu-section" key={menu.id}>
            <button
              className={`section-heading ${openMenu === menu.id ? "open" : ""}`}
              onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
            >
              <div>
                <h3>{menu.title}</h3>
                <p>
                  {menu.items.length}{" "}
                  {menu.items.length === 1 ? "item" : "items"}
                </p>
              </div>
              {openMenu === menu.id ? <CaretDownIcon size={22} weight="bold" /> : <CaretRightIcon size={22} weight="bold" />}
            </button>
            {openMenu === menu.id && (
              <div className="section-body">
                {menu.items.map((dish) => (
                  <article className="dish-row" key={dish.id}>
                    <button type="button" className="dish-image" title="Edit dish" onClick={() => setEditingDish(dish)}>
                      {dish.imageUrl ? (
                        <img src={dish.imageUrl} alt="" />
                      ) : (
                        <PlusIcon size={22} weight="bold" aria-hidden="true" />
                      )}
                    </button>
                    <div className="dish-copy">
                      <div className="dish-title">
                        <h4>{dish.name}</h4>
                        {dish.category && <span>{dish.category}</span>}
                        {dish.isFeatured && (
                          <span className="featured-tag">Restaurant pick</span>
                        )}
                        {popularDishIds.has(dish.id) && (
                          <span className="popular-tag">Popular</span>
                        )}
                        {dish.isNew && <span className="new-tag">New</span>}
                        {!dish.isAvailable && (
                          <span className="unavailable-tag">Unavailable</span>
                        )}
                      </div>
                      <p>{dish.description || "No description"}</p>
                      <DishRowFoodTags
                        allergens={dish.allergens}
                        dietaryTags={dish.dietaryTags}
                        dishTags={dish.dishTags}
                      />
                      <div className="dish-meta">
                        {(dish.reviewsCount ?? 0) > 0 && (
                          <small className="dish-rating">
                            <StarIcon size={13} weight="fill" aria-hidden="true" /> {dish.averageRating?.toFixed(1) || "—"} ·{" "}
                            {dish.reviewsCount}{" "}
                            {dish.reviewsCount === 1 ? "review" : "reviews"}
                          </small>
                        )}
                        <small className="dish-favorites">
                          <HeartIcon size={13} weight="fill" aria-hidden="true" />
                          {dish.favoriteCount ?? 0}{" "}
                          {(dish.favoriteCount ?? 0) === 1
                            ? "customer favorite"
                            : "customer favorites"}
                        </small>
                      </div>
                    </div>
                    <div className="dish-row-side">
                      <strong className="dish-price">
                        {dish.price == null ? "—" : `₪${dish.price.toFixed(2)}`}
                      </strong>
                      <button
                        type="button"
                        className={`dish-options-trigger ${openDishOptions === dish.id ? "active" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenDishOptions((current) =>
                            current === dish.id ? null : dish.id,
                          );
                        }}
                        aria-label={`Options for ${dish.name}`}
                        aria-expanded={openDishOptions === dish.id}
                      >
                        <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
                      </button>
                      {openDishOptions === dish.id && (
                        <div
                          className="dish-options-menu"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDishOptions(null);
                              setInsightsDish(dish);
                            }}
                          >
                            <ChartLineUpIcon size={18} weight="duotone" aria-hidden="true" />
                            <span><strong>View statistics</strong><small>Quick and Pro insights</small></span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDishOptions(null);
                              void updateDish(dish, { isFeatured: !dish.isFeatured });
                            }}
                          >
                            <StarIcon size={18} weight={dish.isFeatured ? "fill" : "regular"} aria-hidden="true" />
                            <span><strong>{dish.isFeatured ? "Remove restaurant pick" : "Make restaurant pick"}</strong><small>Control menu highlighting</small></span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDishOptions(null);
                              void updateDish(dish, { isAvailable: !dish.isAvailable });
                            }}
                          >
                            <CheckIcon size={18} weight="bold" aria-hidden="true" />
                            <span><strong>{dish.isAvailable ? "Mark unavailable" : "Make available"}</strong><small>{dish.isAvailable ? "Hide it from customers" : "Show it to customers"}</small></span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDishOptions(null);
                              setEditingDish(dish);
                            }}
                          >
                            <PencilSimpleIcon size={18} weight="bold" aria-hidden="true" />
                            <span><strong>Edit dish</strong><small>Details, photo, and tags</small></span>
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => {
                              setOpenDishOptions(null);
                              void deleteDish(dish.id);
                            }}
                          >
                            <TrashIcon size={18} weight="bold" aria-hidden="true" />
                            <span><strong>Delete dish</strong><small>Permanently remove it</small></span>
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {dishMenu === menu.id ? (
                  <form className="dish-form" onSubmit={createDish}>
                    <input
                      placeholder="Dish name"
                      value={dishName}
                      onChange={(event) => setDishName(event.target.value)}
                      required
                    />
                    <input
                      placeholder="Category"
                      value={dishCategory}
                      onChange={(event) => setDishCategory(event.target.value)}
                    />
                    <input
                      placeholder="Price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={dishPrice}
                      onChange={(event) => setDishPrice(event.target.value)}
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={dishDescription}
                      onChange={(event) =>
                        setDishDescription(event.target.value)
                      }
                      rows={3}
                    />
                    <DishFoodTags
                      allergens={dishAllergens}
                      dietaryTags={dishDietaryTags}
                      cuisineTags={dishCuisineTags}
                      dishTags={dishTags}
                      ingredientFlags={dishIngredientFlags}
                      onAllergensChange={setDishAllergens}
                      onDietaryTagsChange={setDishDietaryTags}
                      onCuisineTagsChange={setDishCuisineTags}
                      onDishTagsChange={setDishTags}
                      onIngredientFlagsChange={setDishIngredientFlags}
                    />
                    <label className="image-picker">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setDishImage(event.target.files?.[0] || null)
                        }
                      />
                      <span className="icon-label">
                        {dishImage ? <><CheckIcon size={16} weight="bold" /> {dishImage.name}</> : <><PlusIcon size={16} weight="bold" /> Add dish photo</>}
                      </span>
                    </label>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setDishMenu(null)}
                      >
                        Cancel
                      </button>
                      <button className="primary">Save dish</button>
                    </div>
                  </form>
                ) : (
                  <div className="section-actions">
                    <div>
                      <button
                        className="secondary"
                        onClick={() => setDishMenu(menu.id)}
                      >
                        + Add dish
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void editMenu(menu)}
                      >
                        Rename section
                      </button>
                    </div>
                    <button
                      className="text-danger"
                      onClick={() => void deleteMenu(menu)}
                    >
                      Delete section
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        ))
      )}
      {insightsDish && (
        <DishInsightsModal
          dish={insightsDish}
          allDishes={menus.flatMap((menu) => menu.items)}
          onClose={() => setInsightsDish(null)}
        />
      )}
      {editingDish && <DishEditorModal dish={editingDish} onClose={() => setEditingDish(null)} onSaved={reload} />}
    </div>
  );
}

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
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
import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { MartiniIcon } from "@phosphor-icons/react/dist/csr/Martini";
import type { Dish, Menu, MenuSectionType } from "@findeat/types";
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
  const [newSectionType, setNewSectionType] = useState<MenuSectionType>("FOOD");
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
  const [menuOrderIds, setMenuOrderIds] = useState<string[] | null>(null);
  const [draggedMenuId, setDraggedMenuId] = useState<string | null>(null);
  const [dragStartOrder, setDragStartOrder] = useState<string[] | null>(null);
  const [draggedSectionHeight, setDraggedSectionHeight] = useState(82);
  const [dragPosition, setDragPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const activeDraggedMenuIdRef = useRef<string | null>(null);
  const dragStartOrderRef = useRef<string[] | null>(null);
  const liveMenuOrderRef = useRef<string[] | null>(null);
  const dragPointerOffsetRef = useRef({ x: 0, y: 0 });
  const dragScrollContainerRef = useRef<HTMLElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [sectionTypeOverrides, setSectionTypeOverrides] = useState<
    Record<string, MenuSectionType>
  >({});
  const [updatingSectionTypeId, setUpdatingSectionTypeId] = useState<string | null>(null);

  const orderedMenus = useMemo(() => {
    if (!menuOrderIds) return menus;
    const byId = new Map(menus.map((menu) => [menu.id, menu]));
    const ordered = menuOrderIds.flatMap((id) => {
      const menu = byId.get(id);
      if (!menu) return [];
      byId.delete(id);
      return [menu];
    });
    return [...ordered, ...byId.values()];
  }, [menuOrderIds, menus]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  function menuSectionType(menu: Menu): MenuSectionType {
    return sectionTypeOverrides[menu.id] ??
      (menu.sectionType === "DRINKS" ? "DRINKS" : "FOOD");
  }
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
        body: JSON.stringify({
          title: newTitle,
          sectionType: newSectionType,
          restaurantId,
        }),
      });
      setNewTitle("");
      setNewSectionType("FOOD");
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

  async function updateMenuSectionType(
    menu: Menu,
    sectionType: MenuSectionType,
  ) {
    const previousType = menuSectionType(menu);
    if (previousType === sectionType || updatingSectionTypeId === menu.id) return;
    setError("");
    setSectionTypeOverrides((current) => ({ ...current, [menu.id]: sectionType }));
    setUpdatingSectionTypeId(menu.id);
    try {
      const updated = await request<Menu>(`/business/menus/${menu.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sectionType }),
      });
      if (updated.sectionType !== sectionType) {
        throw new Error("The menu section type was not saved. Please try again.");
      }
      await reload();
      setSectionTypeOverrides((current) => {
        const next = { ...current };
        delete next[menu.id];
        return next;
      });
    } catch (nextError) {
      setSectionTypeOverrides((current) => ({
        ...current,
        [menu.id]: previousType,
      }));
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not update menu section type",
      );
    } finally {
      setUpdatingSectionTypeId(null);
    }
  }

  function startMenuDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    menuId: string,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    const section = event.currentTarget.closest<HTMLElement>(".menu-section");
    const bounds = section?.getBoundingClientRect();
    const headingBounds = section
      ?.querySelector<HTMLElement>(".menu-section-heading-row")
      ?.getBoundingClientRect();
    const initialOrder = orderedMenus.map((menu) => menu.id);
    activeDraggedMenuIdRef.current = menuId;
    dragStartOrderRef.current = initialOrder;
    liveMenuOrderRef.current = initialOrder;
    setDraggedMenuId(menuId);
    setDragStartOrder(initialOrder);
    setMenuOrderIds(initialOrder);
    setDraggedSectionHeight(headingBounds?.height ?? 82);
    dragPointerOffsetRef.current = {
      x: bounds ? event.clientX - bounds.left : 22,
      y: bounds ? event.clientY - bounds.top : 22,
    };
    setDragPosition({
      left: bounds?.left ?? event.clientX - 22,
      top: bounds?.top ?? event.clientY - 22,
      width: bounds?.width ?? 320,
    });

    const pageStack = event.currentTarget.closest<HTMLElement>(".page-stack");
    dragScrollContainerRef.current = pageStack?.parentElement?.matches(
      ".dashboard-page-slot",
    )
      ? pageStack.parentElement
      : pageStack;

    dragCleanupRef.current?.();
    const pointerId = event.pointerId;
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      moveDraggedMenu(moveEvent.clientX, moveEvent.clientY);
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      dragCleanupRef.current?.();
      finishMenuReorder(true);
    };
    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      dragCleanupRef.current?.();
      finishMenuReorder(false);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
  }

  function moveDraggedMenu(clientX: number, clientY: number) {
    const activeMenuId = activeDraggedMenuIdRef.current;
    if (!activeMenuId) return;
    setDragPosition((current) => current ? {
      ...current,
      left: clientX - dragPointerOffsetRef.current.x,
      top: clientY - dragPointerOffsetRef.current.y,
    } : current);

    const scrollContainer = dragScrollContainerRef.current;
    if (scrollContainer) {
      const scrollBounds = scrollContainer.getBoundingClientRect();
      const edgeSize = Math.min(88, scrollBounds.height * 0.18);
      if (clientY < scrollBounds.top + edgeSize) {
        scrollContainer.scrollBy({ top: -14 });
      } else if (clientY > scrollBounds.bottom - edgeSize) {
        scrollContainer.scrollBy({ top: 14 });
      }
    }

    const hoveredSection = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-menu-section-id]");
    const hoveredMenuId = hoveredSection?.dataset.menuSectionId ?? null;
    if (!hoveredSection || !hoveredMenuId || hoveredMenuId === activeMenuId) {
      return;
    }
    const bounds = hoveredSection.getBoundingClientRect();
    const position = clientY < bounds.top + bounds.height / 2
      ? "before"
      : "after";
    setMenuOrderIds((current) => {
      const order = current ?? liveMenuOrderRef.current;
      if (!order) return current;
      const next = order.filter((id) => id !== activeMenuId);
      const targetIndex = next.indexOf(hoveredMenuId);
      if (targetIndex < 0) return current;
      next.splice(targetIndex + (position === "after" ? 1 : 0), 0, activeMenuId);
      if (next.every((id, index) => id === order[index])) return current;
      liveMenuOrderRef.current = next;
      return next;
    });
  }

  function finishMenuReorder(shouldSave: boolean) {
    const activeMenuId = activeDraggedMenuIdRef.current;
    if (!activeMenuId) return;
    const previous = dragStartOrderRef.current ?? dragStartOrder;
    const menuIds = liveMenuOrderRef.current ?? previous ?? orderedMenus.map((menu) => menu.id);
    const previousIds = previous ?? [];
    activeDraggedMenuIdRef.current = null;
    dragStartOrderRef.current = null;
    liveMenuOrderRef.current = null;
    dragScrollContainerRef.current = null;
    setDraggedMenuId(null);
    setDragStartOrder(null);
    setDragPosition(null);
    if (
      !shouldSave ||
      menuIds.every((id, index) => id === previousIds[index])
    ) {
      setMenuOrderIds(shouldSave ? menuIds : previous);
      return;
    }
    setMenuOrderIds(menuIds);
    setError("");
    void request("/business/menus/reorder", {
      method: "PATCH",
      body: JSON.stringify({ menuIds }),
    })
      .then(async () => {
        await reload();
        setMenuOrderIds(null);
      })
      .catch((nextError) => {
        if (previous) setMenuOrderIds(previous);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not save menu section order",
        );
      });
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
            <fieldset className="menu-section-type-picker">
              <legend>What does this section contain?</legend>
              <button
                type="button"
                className={newSectionType === "FOOD" ? "selected" : ""}
                onClick={() => setNewSectionType("FOOD")}
              >
                <ForkKnifeIcon size={22} weight="duotone" />
                <span><strong>Food</strong><small>Dishes, desserts, and snacks</small></span>
                <i><CheckIcon size={14} weight="bold" /></i>
              </button>
              <button
                type="button"
                className={newSectionType === "DRINKS" ? "selected" : ""}
                onClick={() => setNewSectionType("DRINKS")}
              >
                <MartiniIcon size={22} weight="duotone" />
                <span><strong>Drinks</strong><small>Cocktails, wine, coffee, and soft drinks</small></span>
                <i><CheckIcon size={14} weight="bold" /></i>
              </button>
            </fieldset>
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
        orderedMenus.map((menu) => {
          const effectiveSectionType = menuSectionType(menu);
          const isDragged = draggedMenuId === menu.id;
          return (
          <Fragment key={menu.id}>
          {isDragged && (
            <div
              className="menu-section-drop-placeholder"
              style={{ height: draggedSectionHeight }}
              aria-hidden="true"
            />
          )}
          <section
            className={`menu-section ${isDragged ? "dragging-source" : ""}`}
            data-menu-section-id={menu.id}
            style={isDragged && dragPosition ? {
              left: dragPosition.left,
              top: dragPosition.top,
              width: dragPosition.width,
            } : undefined}
          >
            <div className="menu-section-heading-row">
              <button
                type="button"
                className="menu-section-drag-handle"
                aria-label={`Reorder ${menu.title}`}
                title="Drag to reorder section"
                onPointerDown={(event) => startMenuDrag(event, menu.id)}
                onClick={(event) => event.stopPropagation()}
              >
                <DotsSixVerticalIcon size={20} weight="bold" />
              </button>
              <button
                className={`section-heading ${openMenu === menu.id ? "open" : ""}`}
                onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
              >
              <div>
                <div className="menu-section-title-row">
                  <h3>{menu.title}</h3>
                  <span className={`menu-section-type-badge ${effectiveSectionType === "DRINKS" ? "drinks" : "food"}`}>
                    {effectiveSectionType === "DRINKS" ? "Drinks" : "Food"}
                  </span>
                </div>
                <p>
                  {menu.items.length}{" "}
                  {menu.items.length === 1 ? "item" : "items"}
                </p>
              </div>
              {openMenu === menu.id ? <CaretDownIcon size={22} weight="bold" /> : <CaretRightIcon size={22} weight="bold" />}
              </button>
            </div>
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
                      <div className="menu-section-type-toggle" role="group" aria-label={`Type for ${menu.title}`}>
                        <button
                          type="button"
                          className={effectiveSectionType === "FOOD" ? "selected" : ""}
                          disabled={updatingSectionTypeId === menu.id}
                          onClick={() => void updateMenuSectionType(menu, "FOOD")}
                        >
                          <ForkKnifeIcon size={14} weight="bold" /> Food
                        </button>
                        <button
                          type="button"
                          className={effectiveSectionType === "DRINKS" ? "selected" : ""}
                          disabled={updatingSectionTypeId === menu.id}
                          onClick={() => void updateMenuSectionType(menu, "DRINKS")}
                        >
                          <MartiniIcon size={14} weight="bold" /> Drinks
                        </button>
                      </div>
                    </div>
                    <div className="menu-section-management-actions">
                      <button
                        className="text-button"
                        onClick={() => void editMenu(menu)}
                      >
                        Rename section
                      </button>
                      <button
                        className="text-danger"
                        onClick={() => void deleteMenu(menu)}
                      >
                        Delete section
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
          </Fragment>
        );})
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

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MagicWandIcon } from "@phosphor-icons/react/dist/csr/MagicWand";
import type { Dish, Menu, MenuCollection, MenuSectionType } from "@findeat/types";
import { DishEditorModal } from "../components/DishEditorModal";
import { DishFoodTags } from "../components/DishFoodTags";
import { DishInsightsModal } from "../components/DishInsightsModal";
import { MenuImportModal } from "../components/MenuImportModal";
import { foodTagLabel } from "../lib/foodTags";
import { request, uploadImage } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";

const MENU_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMenuSchedule(menu: MenuCollection) {
  const days = menu.activeDays.length === 0
    ? "Every day"
    : menu.activeDays.map((day) => MENU_DAYS[day]).join(", ");
  if (menu.startMinute == null || menu.endMinute == null) return `${days} · All day`;
  const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  return `${days} · ${time(menu.startMinute)}–${time(menu.endMinute)}`;
}

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
    <div className="dish-row-food-tags [position:relative] [display:flex] [align-items:center] [gap:5px] [min-width:0] [margin-top:7px] [&_span]:[display:block] [&_span]:[max-width:112px] [&_span]:[overflow:hidden] [&_span]:[padding:3px_7px] [&_span]:[border-radius:999px] [&_span]:[font-size:9px] [&_span]:[font-weight:900] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&_.warning]:[background:#fee2e2] [&_.warning]:[color:#991b1b] [&_.positive]:[background:#dcfce7] [&_.positive]:[color:#166534] dark:[&_.warning]:[border-color:#683a36] dark:[&_.warning]:[background:#482723] dark:[&_.warning]:[color:#ffaaa0] dark:[&_.positive]:[border-color:#285d43] dark:[&_.positive]:[background:#193b2b] dark:[&_.positive]:[color:#82dda9] max-[600px]:[&_span]:[max-width:88px]">
      {visibleTags.map((tag) => (
        <span className={tag.tone} key={`${tag.tone}-${tag.value}`}>
          {foodTagLabel(tag.value)}
        </span>
      ))}
      {hiddenTags.length > 0 && (
        <details className="dish-row-more-tags [position:relative] [flex:0_0_auto] [&_summary]:[display:grid] [&_summary]:[place-items:center] [&_summary]:[min-width:28px] [&_summary]:[height:22px] [&_summary]:[padding:0_7px] [&_summary]:[border:1px_solid_var(--line)] [&_summary]:[border-radius:999px] [&_summary]:[background:var(--soft)] [&_summary]:[color:var(--muted)] [&_summary]:[font-size:9px] [&_summary]:[font-weight:900] [&_summary]:[list-style:none] [&_summary]:[cursor:pointer] [&_summary::-webkit-details-marker]:[display:none] [&[open]_summary]:[border-color:#d7d0c7] [&[open]_summary]:[background:#ebe7e1] [&[open]_summary]:[color:var(--ink)] [&[open]_summary]:[background:var(--neutral-chip)] [&[open]_summary]:[color:var(--neutral-chip-text)]">
          <summary aria-label={`Show ${hiddenTags.length} more food tags`}>
            +{hiddenTags.length}
          </summary>
          <div className="dish-row-more-tags-panel [position:absolute] [z-index:20] [top:calc(100%_+_7px)] [left:0] [width:min(280px,calc(100vw_-_64px))] [padding:12px] [border:1px_solid_var(--line)] [border-radius:13px] [background:var(--surface)] [box-shadow:0_14px_36px_#2f211422] [&_strong]:[display:block] [&_strong]:[margin-bottom:8px] [&_strong]:[font-size:10px] [&>div]:[display:flex] [&>div]:[flex-wrap:wrap] [&>div]:[gap:5px] [&_span]:[max-width:180px]">
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
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [collections, setCollections] = useState<MenuCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDays, setCollectionDays] = useState<number[]>([]);
  const [collectionTimed, setCollectionTimed] = useState(false);
  const [collectionStart, setCollectionStart] = useState("08:00");
  const [collectionEnd, setCollectionEnd] = useState("12:00");
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
  const [removedDishIds, setRemovedDishIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [removedMenuIds, setRemovedMenuIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingSection, setEditingSection] = useState<Menu | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionType, setEditSectionType] =
    useState<MenuSectionType>("FOOD");
  const [savingSectionEdit, setSavingSectionEdit] = useState(false);
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
  const visibleMenus = useMemo(
    () =>
      menus
        .filter((menu) => !removedMenuIds.has(menu.id))
        .map((menu) => ({
          ...menu,
          items: menu.items.filter((dish) => !removedDishIds.has(dish.id)),
        })),
    [menus, removedDishIds, removedMenuIds],
  );

  const collectionMenus = useMemo(
    () => selectedCollectionId
      ? visibleMenus.filter((menu) => menu.collectionId === selectedCollectionId)
      : visibleMenus,
    [visibleMenus, selectedCollectionId],
  );

  const orderedMenus = useMemo(() => {
    if (!menuOrderIds) return collectionMenus;
    const byId = new Map(collectionMenus.map((menu) => [menu.id, menu]));
    const ordered = menuOrderIds.flatMap((id) => {
      const menu = byId.get(id);
      if (!menu) return [];
      byId.delete(id);
      return [menu];
    });
    return [...ordered, ...byId.values()];
  }, [collectionMenus, menuOrderIds]);

  const loadCollections = useCallback(async () => {
    const next = await request<MenuCollection[]>(
      `/business/menus/collections/list?restaurantId=${encodeURIComponent(restaurantId)}`,
      { cache: "reload" },
    );
    setCollections(next);
    setSelectedCollectionId((current) => current && next.some((item) => item.id === current)
      ? current
      : next.find((item) => item.isDefault)?.id ?? next[0]?.id ?? null);
  }, [restaurantId]);

  useEffect(() => {
    let active = true;
    void request<MenuCollection[]>(
      `/business/menus/collections/list?restaurantId=${encodeURIComponent(restaurantId)}`,
    ).then((next) => {
      if (!active) return;
      setCollections(next);
      setSelectedCollectionId(next.find((item) => item.isDefault)?.id ?? next[0]?.id ?? null);
    }).catch((nextError: unknown) => {
      if (active) setError(nextError instanceof Error ? nextError.message : "Could not load menus");
    });
    return () => { active = false; };
  }, [restaurantId]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  function menuSectionType(menu: Menu): MenuSectionType {
    return menu.sectionType === "DRINKS" ? "DRINKS" : "FOOD";
  }
  const popularDishIds = useMemo(
    () =>
      new Set(
        visibleMenus
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
    [visibleMenus],
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
          collectionId: selectedCollectionId,
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

  async function createCollection(event: FormEvent) {
    event.preventDefault();
    if (!collectionName.trim()) return;
    setError("");
    try {
      const created = await request<MenuCollection>(editingCollectionId ? `/business/menus/collections/${editingCollectionId}` : "/business/menus/collections", {
        method: editingCollectionId ? "PATCH" : "POST",
        body: JSON.stringify({
          restaurantId,
          name: collectionName.trim(),
          activeDays: collectionDays,
          startMinute: collectionTimed ? minutesFromTime(collectionStart) : null,
          endMinute: collectionTimed ? minutesFromTime(collectionEnd) : null,
        }),
      });
      setCollectionName("");
      setCollectionDays([]);
      setCollectionTimed(false);
      setCreateCollectionOpen(false);
      setEditingCollectionId(null);
      await loadCollections();
      setSelectedCollectionId(created.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create menu");
    }
  }

  function openCollectionEditor(collection?: MenuCollection) {
    setEditingCollectionId(collection?.id ?? null);
    setCollectionName(collection?.name ?? "");
    setCollectionDays(collection?.activeDays ?? []);
    setCollectionTimed(collection?.startMinute != null && collection?.endMinute != null);
    const toTime = (minute: number | null | undefined, fallback: string) => minute == null
      ? fallback
      : `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    setCollectionStart(toTime(collection?.startMinute, "08:00"));
    setCollectionEnd(toTime(collection?.endMinute, "12:00"));
    setCreateCollectionOpen(true);
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
    setOpenDishOptions(null);
    setRemovedDishIds((current) => new Set(current).add(id));
    try {
      await request(`/business/menus/dishes/${id}`, { method: "DELETE" });
      await reload();
    } catch (nextError) {
      setRemovedDishIds((current) => {
        const restored = new Set(current);
        restored.delete(id);
        return restored;
      });
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not delete dish",
      );
    }
  }

  function openSectionEditor(menu: Menu) {
    setError("");
    setEditingSection(menu);
    setEditSectionTitle(menu.title);
    setEditSectionType(menuSectionType(menu));
  }

  async function saveSectionEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingSection || !editSectionTitle.trim() || savingSectionEdit) return;
    setError("");
    setSavingSectionEdit(true);
    try {
      await request<Menu>(`/business/menus/${editingSection.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editSectionTitle.trim(),
          sectionType: editSectionType,
        }),
      });
      await reload();
      setEditingSection(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not update menu section",
      );
    } finally {
      setSavingSectionEdit(false);
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
    setRemovedMenuIds((current) => new Set(current).add(menu.id));
    setOpenMenu((current) => current === menu.id ? null : current);
    setMenuOrderIds((current) => current?.filter((id) => id !== menu.id) ?? null);
    try {
      await request(`/business/menus/${menu.id}`, { method: "DELETE" });
      await reload();
    } catch (nextError) {
      setRemovedMenuIds((current) => {
        const restored = new Set(current);
        restored.delete(menu.id);
        return restored;
      });
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not delete menu section",
      );
    }
  }

  return (
    <div className="page-stack [width:min(1120px,100%)] [margin:auto] [padding:46px_42px_70px] [.restaurant-setup-shell>&]:[width:min(960px,100%)] [.restaurant-setup-shell>&]:[margin:auto] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px]" onClick={() => setOpenDishOptions(null)}>
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">RESTAURANT MENU</p>
          <h2>Menu</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Build the menu customers see on your FindEat profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 max-[520px]:grid max-[520px]:w-full max-[520px]:grid-cols-2">
          <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-extrabold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-soft hover:shadow-md active:translate-y-0 max-[520px]:w-full" onClick={() => openCollectionEditor()}>
            <span className="grid size-7 place-items-center rounded-lg bg-soft text-ink"><PlusIcon size={16} weight="bold" aria-hidden="true" /></span> New menu
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-extrabold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-soft hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 max-[520px]:w-full"
            disabled={!selectedCollectionId}
            onClick={() => {
              setError("");
              setImportMenuOpen(true);
            }}
          >
            <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent"><MagicWandIcon size={17} weight="duotone" aria-hidden="true" /></span> Import file
          </button>
          <button
            type="button"
            className="menu-add-section-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-accent bg-accent px-5 py-3 text-sm font-extrabold text-[#faf9f6] shadow-[0_8px_22px_color-mix(in_srgb,var(--accent)_28%,transparent)] transition-all hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_11px_26px_color-mix(in_srgb,var(--accent)_34%,transparent)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 max-[520px]:col-span-2 max-[520px]:w-full dark:text-[#171717]"
            disabled={!selectedCollectionId}
            onClick={() => {
              setError("");
              setCreateSectionOpen(true);
            }}
          >
            <PlusIcon size={18} weight="bold" aria-hidden="true" /> Add section
          </button>
        </div>
      </div>
      {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {collections.map((collection) => (
          <button
            type="button"
            key={collection.id}
            className={`min-w-fit rounded-2xl border px-4 py-3 text-left ${selectedCollectionId === collection.id ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink"}`}
            onClick={() => {
              setSelectedCollectionId(collection.id);
              setMenuOrderIds(null);
              setOpenMenu(menus.find((menu) => menu.collectionId === collection.id)?.id ?? null);
            }}
          >
            <strong className="block text-sm">{collection.name}</strong>
            <small className="mt-1 block whitespace-nowrap text-[10px] text-muted">{formatMenuSchedule(collection)}</small>
          </button>
        ))}
      </div>
      {collections.find((item) => item.id === selectedCollectionId) ? <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"><div className="min-w-0"><strong className="block truncate text-sm">{collections.find((item) => item.id === selectedCollectionId)?.name}</strong><small className="mt-1 block text-[11px] text-muted">{formatMenuSchedule(collections.find((item) => item.id === selectedCollectionId)!)}</small></div><button type="button" className="secondary compact" onClick={() => openCollectionEditor(collections.find((item) => item.id === selectedCollectionId))}>Edit schedule</button></div> : null}
      {createCollectionOpen && (
        <div className="fixed inset-0 z-120 grid place-items-center bg-[#17171770] p-6 backdrop-blur-sm max-[520px]:items-end max-[520px]:p-0" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateCollectionOpen(false); }}>
          <form className="w-full max-w-125 rounded-3xl border border-line bg-surface p-6 shadow-panel max-[520px]:rounded-b-none" onSubmit={createCollection}>
            <div className="flex items-center justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><ForkKnifeIcon size={24} weight="duotone" /></div><button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-surface p-0 text-ink" onClick={() => setCreateCollectionOpen(false)} aria-label="Close"><XIcon size={19} weight="bold" /></button></div>
            <h3 className="mt-5 mb-1 text-2xl">{editingCollectionId ? "Edit menu" : "Create a menu"}</h3>
            <p className="mt-0 mb-5 text-sm leading-5 text-muted">Create Breakfast, Brunch, Dinner, Drinks, or any menu guests should switch between.</p>
            <label className="grid gap-2 text-xs font-extrabold">Menu name<input className="min-h-12 rounded-xl border border-line bg-surface px-3 text-ink" autoFocus value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="For example, Brunch" maxLength={80} /></label>
            <fieldset className="mt-5 border-0 p-0"><legend className="mb-2 text-xs font-extrabold">Available days <span className="font-normal text-muted">(none means every day)</span></legend><div className="flex flex-wrap gap-2">{MENU_DAYS.map((label, day) => <button type="button" key={label} className={`rounded-full border px-3 py-2 text-xs font-bold ${collectionDays.includes(day) ? "border-accent bg-accent-soft text-ink" : "border-line bg-soft text-muted"}`} onClick={() => setCollectionDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort())}>{label}</button>)}</div></fieldset>
            <label className="mt-5 !flex w-full !flex-row !items-center gap-3 rounded-xl border border-line bg-soft px-3 py-3 text-sm font-bold text-ink">
              <input className="!m-0 !h-4 !min-h-0 !w-4 !min-w-0 shrink-0 !p-0" type="checkbox" checked={collectionTimed} onChange={(event) => setCollectionTimed(event.target.checked)} />
              <span className="min-w-0 flex-1 text-ink">Only available during certain hours</span>
            </label>
            {collectionTimed ? <div className="mt-3 grid grid-cols-2 gap-3"><label className="grid gap-2 text-xs font-extrabold">From<input type="time" className="min-h-12 rounded-xl border border-line bg-surface px-3 text-ink" value={collectionStart} onChange={(event) => setCollectionStart(event.target.value)} /></label><label className="grid gap-2 text-xs font-extrabold">Until<input type="time" className="min-h-12 rounded-xl border border-line bg-surface px-3 text-ink" value={collectionEnd} onChange={(event) => setCollectionEnd(event.target.value)} /></label></div> : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="min-h-12 rounded-2xl border border-line bg-soft px-4 py-3 text-sm font-extrabold text-ink shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent hover:bg-surface hover:shadow-md active:translate-y-0 active:shadow-sm"
                onClick={() => setCreateCollectionOpen(false)}
              >
                Cancel
              </button>
              <button
                className="min-h-12 rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-extrabold text-[#faf9f6] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#171717]"
                disabled={!collectionName.trim()}
              >
                {editingCollectionId ? "Save menu" : "Create menu"}
              </button>
            </div>
          </form>
        </div>
      )}
      {createSectionOpen && (
        <div
          className="menu-section-create-backdrop [position:fixed] [z-index:120] [inset:0] [display:grid] [place-items:center] [padding:24px] [background:#17171770] [backdrop-filter:blur(5px)] max-[520px]:[align-items:end] max-[520px]:[padding:0]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateSectionOpen(false);
          }}
        >
          <form
            className="menu-section-create-dialog [width:min(470px,100%)] [max-height:calc(100dvh_-_48px)] [overflow-y:auto] [padding:26px] [border:1px_solid_var(--line)] [border-radius:24px] [background:var(--surface)] [box-shadow:0_30px_90px_#0005] [&_h3]:[margin:20px_0_7px] [&_h3]:[font-size:25px] [&_h3]:[letter-spacing:-.025em] [&>p]:[margin:0_0_24px] [&>p]:[color:var(--muted)] [&>p]:[line-height:1.55] [&_label]:[display:block] [&_label]:[margin-bottom:8px] [&_label]:[font-size:13px] [&_label]:[font-weight:800] [&_input]:[width:100%] [&_input]:[min-height:52px] max-[520px]:[width:100%] max-[520px]:[max-height:calc(100dvh_-_12px)] max-[520px]:[padding:20px_16px_calc(16px_+_env(safe-area-inset-bottom))] max-[520px]:[border-radius:24px_24px_0_0] max-[520px]:[&_.menu-section-type-picker]:[grid-template-columns:1fr]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-menu-section-title"
            onSubmit={createMenu}
          >
            <div className="menu-section-create-header [display:flex] [align-items:center] [justify-content:space-between]">
              <div className="menu-section-create-icon [display:grid] [place-items:center] [width:48px] [height:48px] [border-radius:15px] [background:#fff1d1] [color:#b86d00]">
                <ListDashesIcon size={24} weight="duotone" aria-hidden="true" />
              </div>
              <button
                type="button"
                className="menu-section-create-close [display:grid] [place-items:center] [width:40px] [height:40px] [padding:0] [border:1px_solid_var(--line)] [border-radius:12px] [background:var(--surface)] [color:var(--ink)]"
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
            <fieldset className="menu-section-type-picker [display:grid] [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:9px] [margin:18px_0_0] [padding:0] [border:0] [&_legend]:[grid-column:1/-1] [&_legend]:[margin-bottom:8px] [&_legend]:[color:var(--ink)] [&_legend]:[font-size:13px] [&_legend]:[font-weight:800] [&>button]:[display:grid] [&>button]:[grid-template-columns:30px_minmax(0,1fr)_22px] [&>button]:[align-items:center] [&>button]:[gap:8px] [&>button]:[min-height:72px] [&>button]:[padding:12px] [&>button]:[border:1px_solid_var(--line)] [&>button]:[border-radius:14px] [&>button]:[background:var(--soft)] [&>button]:[color:var(--ink)] [&>button]:[text-align:left] [&>button.selected]:[border-color:var(--warning-border)] [&>button.selected]:[background:var(--warning-soft)] [&>button>svg]:[color:var(--warning)] [&>button>span]:[display:block] [&>button>span]:[min-width:0] [&_strong]:[display:block] [&_strong]:[min-width:0] [&_small]:[display:block] [&_small]:[min-width:0] [&_strong]:[font-size:12px] [&_small]:[margin-top:3px] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] [&_small]:[line-height:1.35] [&_i]:[display:grid] [&_i]:[width:20px] [&_i]:[height:20px] [&_i]:[place-items:center] [&_i]:[border:1px_solid_var(--line)] [&_i]:[border-radius:7px] [&_i]:[color:transparent] [&>button.selected_i]:[border-color:var(--warning-border)] [&>button.selected_i]:[background:var(--surface)] [&>button.selected_i]:[color:var(--warning)]">
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
            <div className="menu-section-create-actions [display:flex] [justify-content:flex-end] [gap:10px] [margin-top:24px] [&_button]:[min-width:120px] max-[520px]:[&_button]:[min-width:0] max-[520px]:[&_button]:[flex:1]">
              <button
                type="button"
                className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
                onClick={() => setCreateSectionOpen(false)}
              >
                Cancel
              </button>
              <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={!newTitle.trim()}>
                Create section
              </button>
            </div>
          </form>
        </div>
      )}
      {editingSection && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-[#17171770] p-6 backdrop-blur-[5px] max-[520px]:items-end max-[520px]:p-0"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingSectionEdit) {
              setEditingSection(null);
            }
          }}
        >
          <form
            className="w-[min(470px,100%)] max-h-[calc(100dvh-48px)] overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_90px_#0005] max-[520px]:max-h-[calc(100dvh-12px)] max-[520px]:w-full max-[520px]:rounded-b-none max-[520px]:px-4 max-[520px]:pt-5 max-[520px]:pb-[calc(16px+env(safe-area-inset-bottom))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-menu-section-title"
            onSubmit={(event) => void saveSectionEdit(event)}
          >
            <div className="flex items-center justify-between">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <PencilSimpleIcon size={23} weight="duotone" aria-hidden="true" />
              </div>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-line bg-surface p-0 text-ink transition-colors hover:bg-soft"
                aria-label="Close"
                disabled={savingSectionEdit}
                onClick={() => setEditingSection(null)}
              >
                <XIcon size={19} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <h3 id="edit-menu-section-title" className="mt-5 mb-1 text-2xl tracking-[-0.025em] text-ink">
              Edit section
            </h3>
            <p className="mt-0 mb-6 text-sm leading-6 text-muted">
              Update the section name and choose what it contains.
            </p>
            <label className="grid gap-2 text-xs font-extrabold text-ink" htmlFor="edit-menu-section-name">
              Section name
              <input
                id="edit-menu-section-name"
                autoFocus
                className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink outline-none transition-colors focus:border-accent"
                value={editSectionTitle}
                maxLength={80}
                onChange={(event) => setEditSectionTitle(event.target.value)}
              />
            </label>
            <fieldset className="mt-5 grid grid-cols-2 gap-2 border-0 p-0 max-[420px]:grid-cols-1">
              <legend className="col-span-full mb-2 text-xs font-extrabold text-ink">
                Section type
              </legend>
              <button
                type="button"
                className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left transition-all ${editSectionType === "FOOD" ? "border-warning-border bg-warning-soft text-ink shadow-sm" : "border-line bg-soft text-muted hover:border-warning-border"}`}
                onClick={() => setEditSectionType("FOOD")}
              >
                <ForkKnifeIcon size={21} weight="duotone" />
                <span className="min-w-0"><strong className="block text-xs">Food</strong><small className="mt-1 block text-[9px]">Dishes and desserts</small></span>
              </button>
              <button
                type="button"
                className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left transition-all ${editSectionType === "DRINKS" ? "border-warning-border bg-warning-soft text-ink shadow-sm" : "border-line bg-soft text-muted hover:border-warning-border"}`}
                onClick={() => setEditSectionType("DRINKS")}
              >
                <MartiniIcon size={21} weight="duotone" />
                <span className="min-w-0"><strong className="block text-xs">Drinks</strong><small className="mt-1 block text-[9px]">Coffee, wine, and cocktails</small></span>
              </button>
            </fieldset>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="min-h-12 rounded-2xl border border-line bg-soft px-4 py-3 text-sm font-extrabold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-surface hover:shadow-md active:translate-y-0"
                disabled={savingSectionEdit}
                onClick={() => setEditingSection(null)}
              >
                Cancel
              </button>
              <button
                className="min-h-12 rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-extrabold text-[#faf9f6] shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#171717]"
                disabled={!editSectionTitle.trim() || savingSectionEdit}
              >
                {savingSectionEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {collectionMenus.length === 0 ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
          <ListDashesIcon className="mx-auto block" size={34} weight="duotone" aria-hidden="true" />
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
              className="menu-section-drop-placeholder [min-height:68px] [margin:0_0_12px] [border-radius:18px] [background:var(--soft)]"
              style={{ height: draggedSectionHeight }}
              aria-hidden="true"
            />
          )}
          <section
            className={`menu-section [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [margin-bottom:12px] [&.dragging-source]:[position:fixed] [&.dragging-source]:[z-index:1000] [&.dragging-source]:[margin:0] [&.dragging-source]:[opacity:.96] [&.dragging-source]:[box-shadow:0_22px_58px_#21170d38] [&.dragging-source]:[pointer-events:none] [&.dragging-source_.section-body]:[display:none] [&.dragging-source_.section-heading.open]:[border-radius:0_17px_17px_0] ${isDragged ? "dragging-source" : ""}`}
            data-menu-section-id={menu.id}
            style={isDragged && dragPosition ? {
              left: dragPosition.left,
              top: dragPosition.top,
              width: dragPosition.width,
            } : undefined}
          >
            <div className="menu-section-heading-row [display:flex] [align-items:stretch] [&_.section-heading]:[border-radius:0_17px_17px_0] [&_.section-heading.open]:[border-radius:0_17px_0_0]">
              <button
                type="button"
                className="menu-section-drag-handle [display:grid] [flex:0_0_42px] [place-items:center] [padding:0] [border:0] [border-radius:17px_0_0_17px] [background:var(--surface)] [color:var(--muted)] [cursor:grab] [touch-action:none] [&:active]:[cursor:grabbing]"
                aria-label={`Reorder ${menu.title}`}
                title="Drag to reorder section"
                onPointerDown={(event) => startMenuDrag(event, menu.id)}
                onClick={(event) => event.stopPropagation()}
              >
                <DotsSixVerticalIcon size={20} weight="bold" />
              </button>
              <button
                className={`section-heading [width:100%] [display:flex] [justify-content:space-between] [align-items:center] [padding:20px_22px] [border:0] [border-radius:17px] [background:var(--surface)] [text-align:left] [&.open]:[border-radius:17px_17px_0_0] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[color:var(--muted)] [&_p]:[margin-top:4px] [&_p]:[font-size:13px] [&>span]:[font-size:25px] max-[800px]:[padding:17px] ${openMenu === menu.id ? "open" : ""}`}
                onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
              >
              <div>
                <div className="menu-section-title-row [display:flex] [align-items:center] [gap:8px]">
                  <h3>{menu.title}</h3>
                  <span className={`menu-section-type-badge [padding:4px_8px] [border-radius:999px] [background:#fff1d1] [color:#8a5a00] [font-size:9px] [font-weight:900] [text-transform:uppercase] [letter-spacing:0.04em] [&.drinks]:[background:#e7e4ff] [&.drinks]:[color:#5d42a8] ${effectiveSectionType === "DRINKS" ? "drinks" : "food"}`}>
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
              <div className="section-body [padding:0_22px_22px] max-[800px]:[padding:0_17px_17px]">
                {menu.items.map((dish) => (
                  <article className="dish-row [display:grid] [grid-template-columns:112px_minmax(0,_1fr)_auto] [align-items:center] [gap:18px] [min-height:116px] [padding:18px_0] [border-top:1px_solid_var(--line)] max-[800px]:[grid-template-columns:48px_1fr_50px_30px_35px_28px_28px] max-[800px]:[grid-template-columns:64px_minmax(0,_1fr)] max-[800px]:[gap:14px] max-[800px]:[min-height:0] max-[800px]:[padding:15px_0] max-[600px]:[grid-template-columns:76px_minmax(0,_1fr)] max-[600px]:[gap:11px]" key={dish.id}>
                    <button type="button" className="dish-image [position:relative] [display:grid] [place-items:center] [width:108px] [aspect-ratio:3/2] [padding:0] [overflow:hidden] [border:0] [border-radius:15px] [background:#eeeae4] [color:#777] [cursor:pointer] [&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [&_input]:[display:none] [&_em]:[position:absolute] [&_em]:[inset:0] [&_em]:[display:grid] [&_em]:[place-items:center] [&_em]:[background:#0008] [&_em]:[color:#faf9f6] [&_em]:[font-size:20px] [&_em]:[font-style:normal] max-[800px]:[width:60px] max-[800px]:[height:60px] [background:var(--neutral-chip)] [color:var(--muted)] max-[600px]:[width:72px] max-[600px]:[aspect-ratio:4/3] max-[600px]:[border-radius:12px]" title="Edit dish" onClick={() => setEditingDish(dish)}>
                      {dish.imageUrl ? (
                        <img src={dish.imageUrl} alt="" />
                      ) : (
                        <PlusIcon size={22} weight="bold" aria-hidden="true" />
                      )}
                    </button>
                    <div className="dish-copy [min-width:0] [&_p]:[margin:0] [&_p]:[display:-webkit-box] [&_p]:[margin-top:6px] [&_p]:[overflow:hidden] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&_p]:[line-height:1.45] [&_p]:[-webkit-box-orient:vertical] [&_p]:[-webkit-line-clamp:2] max-[800px]:[&_p]:[-webkit-line-clamp:2]">
                      <div className="dish-title [display:flex] [align-items:center] [gap:8px] [&_h4]:[margin:0] [&_h4]:[font-size:16px] [&_h4]:[line-height:1.3] [&_span]:[padding:3px_7px] [&_span]:[border-radius:6px] [&_span]:[background:var(--soft)] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_span]:[font-weight:800] [flex-wrap:wrap] [&_span.featured-tag]:[background:#fff2c7] [&_span.featured-tag]:[color:#815c00] [&_span.popular-tag]:[background:#ede9fe] [&_span.popular-tag]:[color:#6d28d9] [&_span.new-tag]:[background:#dbeafe] [&_span.new-tag]:[color:#1d4ed8] [&_span.unavailable-tag]:[background:#eee] [&_span.unavailable-tag]:[color:#666] [&_span.featured-tag]:[background:var(--warning-soft)] [&_span.featured-tag]:[color:var(--warning)] [&_span.popular-tag]:[background:var(--purple-soft)] [&_span.popular-tag]:[color:var(--purple)] [&_span.new-tag]:[background:var(--info-soft)] [&_span.new-tag]:[color:var(--info)] [&_span.unavailable-tag]:[background:var(--neutral-chip)] [&_span.unavailable-tag]:[color:var(--neutral-chip-text)] max-[600px]:[&_h4]:[font-size:14px]">
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
                      <div className="dish-meta [display:flex] [align-items:center] [flex-wrap:wrap] [gap:12px] [margin-top:9px] max-[800px]:[gap:8px]">
                        {(dish.reviewsCount ?? 0) > 0 && (
                          <small className="dish-rating [display:inline-flex] [align-items:center] [gap:3px] [color:#8a6200] [font-weight:800] [gap:4px]">
                            <StarIcon size={13} weight="fill" aria-hidden="true" /> {dish.averageRating?.toFixed(1) || "—"} ·{" "}
                            {dish.reviewsCount}{" "}
                            {dish.reviewsCount === 1 ? "review" : "reviews"}
                          </small>
                        )}
                        <small className="dish-favorites [display:inline-flex] [align-items:center] [gap:4px] [color:#be3455] [font-weight:800]">
                          <HeartIcon size={13} weight="fill" aria-hidden="true" />
                          {dish.favoriteCount ?? 0}{" "}
                          {(dish.favoriteCount ?? 0) === 1
                            ? "customer favorite"
                            : "customer favorites"}
                        </small>
                      </div>
                    </div>
                    <div className="dish-row-side [position:relative] [display:flex] [align-items:center] [justify-content:flex-end] [gap:9px] [min-width:0] max-[800px]:[grid-column:2] max-[800px]:[justify-content:flex-start] max-[800px]:[flex-wrap:wrap]">
                      <strong className="dish-price [padding:7px_11px] [border-radius:10px] [background:var(--soft)] [font-size:14px] [white-space:nowrap] max-[600px]:[padding:6px_9px] max-[600px]:[font-size:12px]">
                        {dish.price == null
                          ? "—"
                          : `₪${Number.isInteger(dish.price) ? dish.price : dish.price.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`}
                      </strong>
                      <button
                        type="button"
                        className={`dish-options-trigger [display:grid] [place-items:center] [width:36px] [height:36px] [padding:0] [border:1px_solid_var(--line)] [border-radius:11px] [background:var(--surface)] [color:#555] [&:hover]:[border-color:#d3cec5] [&:hover]:[background:var(--soft)] [&:hover]:[color:var(--ink)] [&.active]:[border-color:#d3cec5] [&.active]:[background:var(--soft)] [&.active]:[color:var(--ink)] dark:[color:var(--muted)] [color:var(--muted)] ${openDishOptions === dish.id ? "active" : ""}`}
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
                          className="dish-options-menu [position:absolute] [z-index:30] [top:calc(100%_+_8px)] [right:0] [width:255px] [overflow:hidden] [padding:6px] [border:1px_solid_var(--line)] [border-radius:15px] [background:var(--surface)] [box-shadow:0_18px_46px_#2f21142b] [&>button]:[display:grid] [&>button]:[grid-template-columns:26px_minmax(0,_1fr)] [&>button]:[align-items:center] [&>button]:[gap:9px] [&>button]:[width:100%] [&>button]:[padding:10px] [&>button]:[border:0] [&>button]:[border-radius:10px] [&>button]:[background:transparent] [&>button]:[color:var(--ink)] [&>button]:[text-align:left] [&>button:hover]:[background:var(--soft)] [&>button>svg]:[justify-self:center] [&_span]:[display:block] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:11px] [&_small]:[margin-top:2px] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] [&_small]:[font-weight:500] [&>button.danger]:[margin-top:4px] [&>button.danger]:[border-top:1px_solid_var(--line)] [&>button.danger]:[border-radius:0_0_10px_10px] [&>button.danger]:[color:#b54635] max-[800px]:[right:auto] max-[800px]:[left:0] [&>button.danger]:[color:var(--danger)] max-[800px]:[max-width:calc(100vw_-_48px)]"
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
                            className="danger [color:#b54635] [.moderation-actions_&]:[border:0] [.moderation-actions_&]:[border-radius:11px] [.moderation-actions_&]:[background:#fff0ed] [.moderation-actions_&]:[color:#b33c2b] [.moderation-actions_&]:[font-weight:800] [.icon-button&]:[color:#b32727] [color:var(--danger)] [.icon-button&]:[color:var(--danger)] [.moderation-actions_&]:[background:var(--danger-soft)] [.moderation-actions_&]:[color:var(--danger)]"
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
                  <form className="dish-form [display:grid] [grid-template-columns:2fr_1fr_1fr] [gap:10px] [padding-top:18px] [border-top:1px_solid_var(--line)] [&_textarea]:[grid-column:1/-1] [&>.dish-food-tags]:[grid-column:1/-1] [&_.form-actions]:[grid-column:1/-1] [&_.form-actions]:[justify-content:flex-end] [&_.form-actions]:[gap:8px] [&_.form-actions]:[margin:0] max-[800px]:[grid-template-columns:1fr]" onSubmit={createDish}>
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
                    <label className="image-picker [&_input]:[display:none] [grid-column:1/-1] [&_span]:[display:block] [&_span]:[padding:13px_15px] [&_span]:[border:1px_dashed_#c9c5bd] [&_span]:[border-radius:12px] [&_span]:[background:var(--soft)] [&_span]:[color:#555] [&_span]:[text-align:center] [&_span]:[cursor:pointer] [&_.icon-label]:[display:flex] [&_.icon-label]:[align-items:center] [&_.icon-label]:[justify-content:center] [&_.icon-label]:[gap:7px] max-[800px]:[grid-column:auto] [&_span]:[color:var(--muted)]">
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
                    <div className="form-actions [display:flex] [align-items:center] [justify-content:space-between] [margin-top:16px] max-[600px]:[align-items:stretch] max-[600px]:[flex-direction:column] max-[600px]:[&_button]:[width:100%]">
                      <button
                        type="button"
                        className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
                        onClick={() => setDishMenu(null)}
                      >
                        Cancel
                      </button>
                      <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]">Save dish</button>
                    </div>
                  </form>
                ) : (
                  <div className="section-actions [display:flex] [align-items:center] [justify-content:space-between] [margin-top:16px] [&>div]:[display:flex] [&>div]:[align-items:center] [&>div]:[flex-wrap:wrap] [&>div]:[gap:9px] [&>.menu-section-management-actions]:[justify-content:flex-end] max-[800px]:[gap:10px] max-[800px]:[flex-wrap:wrap] max-[600px]:[align-items:stretch] max-[600px]:[flex-direction:column] max-[600px]:[&_button]:[width:100%]">
                    <div>
                      <button
                        className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
                        onClick={() => setDishMenu(menu.id)}
                      >
                        + Add dish
                      </button>
                    </div>
                    <div className="menu-section-management-actions">
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-extrabold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-soft hover:shadow-md active:translate-y-0"
                        onClick={() => openSectionEditor(menu)}
                      >
                        <PencilSimpleIcon size={16} weight="bold" /> Edit section
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-2 text-xs font-extrabold text-danger shadow-sm transition-all hover:-translate-y-0.5 hover:border-danger/50 hover:shadow-md active:translate-y-0"
                        onClick={() => void deleteMenu(menu)}
                      >
                        <TrashIcon size={16} weight="bold" /> Delete section
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
          allDishes={visibleMenus.flatMap((menu) => menu.items)}
          onClose={() => setInsightsDish(null)}
        />
      )}
      {editingDish && <DishEditorModal dish={editingDish} onClose={() => setEditingDish(null)} onSaved={reload} />}
      {importMenuOpen && selectedCollectionId && collections.find((item) => item.id === selectedCollectionId) && (
        <MenuImportModal
          restaurantId={restaurantId}
          collection={collections.find((item) => item.id === selectedCollectionId)!}
          onClose={() => setImportMenuOpen(false)}
          onImported={reload}
        />
      )}
    </div>
  );
}

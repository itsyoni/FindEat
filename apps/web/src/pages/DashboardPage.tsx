import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellIcon } from "@phosphor-icons/react/dist/csr/Bell";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { ListDashesIcon } from "@phosphor-icons/react/dist/csr/ListDashes";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { MedalIcon } from "@phosphor-icons/react/dist/csr/Medal";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { HeadsetIcon } from "@phosphor-icons/react/dist/csr/Headset";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { GiftIcon } from "@phosphor-icons/react/dist/csr/Gift";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type {
  AdminUser,
  AppNotification,
  BusinessAccount,
  BusinessDashboardSection,
  ManagedRestaurant,
  Menu,
  RestaurantClaim,
  RestaurantConversation,
  RestaurantReview,
} from "@findeat/types";
import { AccountAvatar } from "../components/AccountAvatar";
import { AppLink } from "../components/AppLink";
import { NotificationsPopover } from "../components/NotificationsPopover";
import { SidebarNavGroup } from "../components/SidebarNavGroup";
import { WorkspaceSwitcher } from "../components/WorkspaceSwitcher";
import { useInboxSocket } from "../hooks/useInboxSocket";
import { useRestaurantActivitySocket } from "../hooks/useRestaurantActivitySocket";
import {
  SHARED_SIDEBAR_WIDTH_STORAGE_KEY,
  useResizableSidebar,
} from "../hooks/useResizableSidebar";
import {
  fetchRestaurantConversations,
  fetchRestaurantNotifications,
  loadRestaurantReviews,
  request,
} from "../lib/api";
import { AdminPage } from "./AdminPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { MenuPage } from "./MenuPage";
import { MessagesPage } from "./MessagesPage";
import { OverviewPage } from "./OverviewPage";
import { ProfilePage } from "./ProfilePage";
import { ReviewsPage } from "./ReviewsPage";
import { BadgesPage } from "./BadgesPage";
import { OwnerSupportPage } from "./OwnerSupportPage";
import { SettingsPage } from "./SettingsPage";
import { OffersPage } from "./OffersPage";
import { ErrorPage } from "../components/ErrorPage";
import {
  adminPaths,
  adminSectionFromPath,
  businessPaths,
  businessSectionFromPath,
  navigateTo,
  usePathname,
} from "../lib/navigation";
import { WEB_VERSION } from "../lib/version";

function normalizeRestaurantSetup(restaurant: ManagedRestaurant) {
  const missingSetupFields = [
    !restaurant.name.trim() ? "name" : null,
    !restaurant.bio?.trim() ? "description" : null,
    !restaurant.logoUrl?.trim() ? "logo" : null,
    !restaurant.coverUrl?.trim() ? "cover" : null,
    !restaurant.address?.trim() ? "address" : null,
    restaurant.categories.length === 0 ? "categories" : null,
  ].filter((field): field is string => field !== null);
  return {
    ...restaurant,
    missingSetupFields,
    setupComplete: missingSetupFields.length === 0,
  };
}

function RestaurantSwitcher({
  restaurant,
  restaurants,
  onSelect,
}: {
  restaurant: ManagedRestaurant;
  restaurants: ManagedRestaurant[];
  onSelect: (restaurantId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedRestaurantId, setHighlightedRestaurantId] = useState(
    restaurant.id,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const highlightedRestaurantIdRef = useRef(restaurant.id);
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchable = restaurants.length > 1;

  function highlightRestaurant(restaurantId: string) {
    highlightedRestaurantIdRef.current = restaurantId;
    setHighlightedRestaurantId(restaurantId);
  }

  function toggleRestaurantSwitcher() {
    if (!switchable) return;
    if (!open) {
      highlightRestaurant(restaurant.id);
      typeaheadRef.current = "";
    }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePress);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleTypeahead(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      const currentIndex = Math.max(
        0,
        restaurants.findIndex(
          (item) => item.id === highlightedRestaurantIdRef.current,
        ),
      );

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          (currentIndex + direction + restaurants.length) % restaurants.length;
        highlightRestaurant(restaurants[nextIndex].id);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onSelect(highlightedRestaurantIdRef.current);
        setOpen(false);
        return;
      }

      if (event.key.length !== 1 || !event.key.trim()) return;
      typeaheadRef.current += event.key.toLocaleLowerCase();
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = setTimeout(() => {
        typeaheadRef.current = "";
      }, 800);

      const query = typeaheadRef.current;
      const match = restaurants.find((item) =>
        [item.name, item.city ?? ""].some((word) =>
          word.toLocaleLowerCase().startsWith(query),
        ),
      ) ?? restaurants.find((item) =>
        `${item.name} ${item.city ?? ""}`.toLocaleLowerCase().includes(query),
      );
      if (match) {
        event.preventDefault();
        highlightRestaurant(match.id);
      }
    }

    window.addEventListener("keydown", handleTypeahead);
    return () => {
      window.removeEventListener("keydown", handleTypeahead);
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    };
  }, [onSelect, open, restaurant.id, restaurants]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current
      .get(highlightedRestaurantId)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightedRestaurantId, open]);

  function restaurantSubtitle(item: ManagedRestaurant) {
    return item.city || (item.status === "CLAIMED" ? "Claimed restaurant" : "Restaurant");
  }

  return (
    <div className="restaurant-switcher [position:relative] [z-index:12] [.header-restaurant-switcher_&]:[width:min(360px,_42vw)] max-[800px]:[.header-restaurant-switcher_&]:[width:100%] max-[800px]:[.header-restaurant-switcher_&]:[max-width:none]" ref={rootRef}>
      <button
        type="button"
        className={`restaurant-chip [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[color:var(--muted)] [&_small]:[font-size:12px] [position:relative] [display:flex] [align-items:center] [gap:11px] [width:100%] [padding:12px] [border:1px_solid_transparent] [border-radius:14px] [background:var(--soft)] [color:var(--ink)] [text-align:left] [&.switchable]:[cursor:pointer] [&.switchable]:[transition:border-color_0.16s_ease,_background-color_0.16s_ease,_box-shadow_0.16s_ease] [&.switchable:hover]:[border-color:var(--line)] [&.switchable:hover]:[background:var(--surface-hover)] [&.open]:[border-color:var(--line)] [&.open]:[background:var(--surface-hover)] [&.open]:[box-shadow:0_10px_28px_#231a1114] [&_img]:[width:38px] [&_img]:[height:38px] [&_img]:[flex:0_0_38px] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[background:#e5ddd4] [&_img]:[font-weight:900] [&>span]:[width:38px] [&>span]:[height:38px] [&>span]:[flex:0_0_38px] [&>span]:[border-radius:50%] [&>span]:[object-fit:cover] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[background:#e5ddd4] [&>span]:[font-weight:900] [&>div]:[min-width:0] [&>div]:[flex:1] [&_strong]:[max-width:100%] [&_strong]:[overflow:hidden] [&_strong]:[white-space:nowrap] [&_strong]:[text-overflow:ellipsis] [&_strong]:[font-size:13px] [&.open_.restaurant-switcher-caret]:[transform:rotate(180deg)] [.header-restaurant-switcher_&]:[min-height:50px] [.header-restaurant-switcher_&]:[padding:6px_8px] [.header-restaurant-switcher_&]:[border-color:transparent] [.header-restaurant-switcher_&]:[background:transparent] [.header-restaurant-switcher_&:hover]:[background:var(--surface-hover)] [.header-restaurant-switcher_&.open]:[background:var(--surface-hover)] max-[800px]:[margin-bottom:10px] [&_img]:[background:var(--avatar-surface)] [&>span]:[background:var(--avatar-surface)] max-[800px]:[.header-restaurant-switcher_&]:[min-height:44px] max-[800px]:[.header-restaurant-switcher_&]:[padding:4px_7px] max-[800px]:[.header-restaurant-switcher_&]:[border-color:transparent] max-[800px]:[.header-restaurant-switcher_&]:[background:transparent] max-[800px]:[.header-restaurant-switcher_&:hover]:[background:var(--surface-hover)] max-[800px]:[.header-restaurant-switcher_&.open]:[background:var(--surface-hover)] max-[800px]:[.header-restaurant-switcher_&_img]:[width:34px] max-[800px]:[.header-restaurant-switcher_&_img]:[height:34px] max-[800px]:[.header-restaurant-switcher_&_img]:[flex-basis:34px] max-[800px]:[.header-restaurant-switcher_&>span]:[width:34px] max-[800px]:[.header-restaurant-switcher_&>span]:[height:34px] max-[800px]:[.header-restaurant-switcher_&>span]:[flex-basis:34px] ${switchable ? "switchable" : ""} ${open ? "open" : ""}`}
        aria-haspopup={switchable ? "listbox" : undefined}
        aria-expanded={switchable ? open : undefined}
        onClick={toggleRestaurantSwitcher}
      >
        {restaurant.logoUrl ? (
          <img src={restaurant.logoUrl} alt="" />
        ) : (
          <span>{restaurant.name.charAt(0).toUpperCase()}</span>
        )}
        <div>
          <div className="restaurant-name-row [display:flex] [align-items:center] [gap:7px] [min-width:0] [&>strong]:[min-width:0] [&>strong]:[flex:1]">
            <strong>{restaurant.name}</strong>
            {restaurant.accessRole === "ADMIN" ? (
              <span className="restaurant-access-pill [flex:0_0_auto] [padding:3px_7px] [border-radius:999px] [background:var(--success-soft)] [color:var(--success)] [font-size:8px] [font-weight:900] [white-space:nowrap]">Admin access</span>
            ) : null}
          </div>
          <small>
            {switchable
              ? `${restaurants.length} restaurants`
              : restaurantSubtitle(restaurant)}
          </small>
        </div>
        {switchable ? (
          <CaretDownIcon
            className="restaurant-switcher-caret [flex:0_0_auto] [color:var(--muted)] [transition:transform_.18s_ease]"
            size={17}
            weight="bold"
            aria-hidden="true"
          />
        ) : null}
      </button>

      {open ? (
        <div className="restaurant-switcher-menu [position:absolute] [top:calc(100%_+_8px)] [left:0] [width:280px] [max-width:calc(100vw_-_32px)] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:16px] [background:var(--surface)] [box-shadow:0_22px_60px_#24180f24] [.header-restaurant-switcher_&]:[right:auto] [.header-restaurant-switcher_&]:[left:0] [.header-restaurant-switcher_&]:[width:100%] [.header-restaurant-switcher_&]:[max-width:none] max-[800px]:[right:0] max-[800px]:[left:0] max-[800px]:[width:auto] max-[800px]:[max-width:none] max-[800px]:[.header-restaurant-switcher_&]:[top:calc(100%_+_7px)] max-[800px]:[.header-restaurant-switcher_&]:[right:auto] max-[800px]:[.header-restaurant-switcher_&]:[left:0] max-[800px]:[.header-restaurant-switcher_&]:[width:100%] max-[800px]:[.header-restaurant-switcher_&]:[max-width:none]" role="listbox" aria-label="Select restaurant">
          <div className="restaurant-switcher-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_13px_10px] [border-bottom:1px_solid_var(--line)] [&_strong]:[font-size:11px] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px]">
            <strong>Switch restaurant</strong>
            <small>{restaurants.length} profiles</small>
          </div>
          <div className="restaurant-switcher-options [display:grid] [gap:3px] [max-width:100%] [max-height:320px] [overflow-x:hidden] [overflow-y:auto] [padding:6px] [&>button]:[display:flex] [&>button]:[align-items:center] [&>button]:[gap:10px] [&>button]:[width:100%] [&>button]:[min-width:0] [&>button]:[max-width:100%] [&>button]:[padding:9px] [&>button]:[overflow:hidden] [&>button]:[border:0] [&>button]:[border-radius:11px] [&>button]:[background:transparent] [&>button]:[color:var(--ink)] [&>button]:[text-align:left] [&>button]:[cursor:pointer] [&>button:hover]:[background:var(--soft)] [&>button.selected]:[background:var(--soft)] [&>button.highlighted]:[background:var(--soft)] [&>button.highlighted]:[box-shadow:inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_38%,transparent)] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:36px] [&_img]:[height:36px] [&_img]:[flex:0_0_36px] [&_img]:[border-radius:50%] [&_img]:[background:var(--neutral-chip)] [&_img]:[object-fit:cover] [&_img]:[font-size:12px] [&_img]:[font-weight:900] [&>button>span]:[display:grid] [&>button>span]:[place-items:center] [&>button>span]:[width:36px] [&>button>span]:[height:36px] [&>button>span]:[flex:0_0_36px] [&>button>span]:[border-radius:50%] [&>button>span]:[background:var(--neutral-chip)] [&>button>span]:[object-fit:cover] [&>button>span]:[font-size:12px] [&>button>span]:[font-weight:900] [&>button>div]:[min-width:0] [&>button>div]:[flex:1] [&_strong]:[display:block] [&_strong]:[width:100%] [&_strong]:[max-width:100%] [&_strong]:[overflow:hidden] [&_strong]:[white-space:nowrap] [&_strong]:[text-overflow:ellipsis] [&_small]:[display:block] [&_small]:[width:100%] [&_small]:[max-width:100%] [&_small]:[overflow:hidden] [&_small]:[white-space:nowrap] [&_small]:[text-overflow:ellipsis] [&_strong]:[font-size:12px] [&_small]:[margin-top:2px] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px] [&_i]:[display:grid] [&_i]:[place-items:center] [&_i]:[width:24px] [&_i]:[height:24px] [&_i]:[flex:0_0_24px] [&_i]:[border-radius:50%] [&_i]:[background:var(--accent-soft)] [&_i]:[color:var(--accent)]">
            {restaurants.map((item) => {
              const selected = item.id === restaurant.id;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`${selected ? "selected" : ""} ${highlightedRestaurantId === item.id ? "highlighted" : ""}`.trim()}
                  key={item.id}
                  ref={(node) => {
                    if (node) optionRefs.current.set(item.id, node);
                    else optionRefs.current.delete(item.id);
                  }}
                  onMouseEnter={() => highlightRestaurant(item.id)}
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                >
                  {item.logoUrl ? (
                    <img src={item.logoUrl} alt="" />
                  ) : (
                    <span>{item.name.charAt(0).toUpperCase()}</span>
                  )}
                  <div>
                    <div className="restaurant-name-row [display:flex] [align-items:center] [gap:7px] [min-width:0] [&>strong]:[min-width:0] [&>strong]:[flex:1]">
                      <strong>{item.name}</strong>
                      {item.accessRole === "ADMIN" ? (
                        <span className="restaurant-access-pill [flex:0_0_auto] [padding:3px_7px] [border-radius:999px] [background:var(--success-soft)] [color:var(--success)] [font-size:8px] [font-weight:900] [white-space:nowrap]">Admin access</span>
                      ) : null}
                    </div>
                    <small>{restaurantSubtitle(item)}</small>
                  </div>
                  {selected ? (
                    <i aria-hidden="true">
                      <CheckIcon size={15} weight="bold" />
                    </i>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const [account, setAccount] = useState<BusinessAccount | null>(null);
  const [restaurants, setRestaurants] = useState<ManagedRestaurant[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [conversations, setConversations] = useState<RestaurantConversation[]>(
    [],
  );
  const [restaurantNotifications, setRestaurantNotifications] = useState<
    AppNotification[]
  >([]);
  const [restaurantUnreadCount, setRestaurantUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const {
    sidebarRef,
    open: desktopSidebarOpen,
    setOpen: setDesktopSidebarOpen,
    startResize: startSidebarResize,
  } = useResizableSidebar(SHARED_SIDEBAR_WIDTH_STORAGE_KEY, pathname);
  const [claims, setClaims] = useState<RestaurantClaim[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(() => localStorage.getItem("findeat-selected-restaurant"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const restaurant =
    restaurants.find((item) => item.id === selectedRestaurantId) ??
    restaurants[0];
  const activeRestaurantId = restaurant?.id;
  const routedBusinessSection = businessSectionFromPath(pathname);
  const routedAdminSection = adminSectionFromPath(pathname);
  const isAdminRoute = pathname.startsWith("/admin");
  const section = routedBusinessSection ?? "overview";
  const [visitedSections, setVisitedSections] = useState<
    Set<BusinessDashboardSection>
  >(() => new Set([section]));
  const navigateSection = useCallback((next: BusinessDashboardSection) => {
    navigateTo(businessPaths[next]);
  }, []);

  useEffect(() => {
    // Keep an already-opened section mounted so its local state and loaded
    // data survive navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedSections((current) => {
      if (current.has(section)) return current;
      return new Set([...current, section]);
    });
  }, [section]);

  const loadRestaurantConversations = useCallback(
    async (restaurantId: string) => {
      if (!account?.id) return;
      const nextConversations = await fetchRestaurantConversations(
        restaurantId,
        account.id,
        true,
      );
      setConversations(nextConversations);
    },
    [account],
  );

  const loadRestaurantNotifications = useCallback(
    async (restaurantId: string, showLoading = false) => {
      if (showLoading) setNotificationsLoading(true);
      try {
        const page = await fetchRestaurantNotifications(restaurantId, true);
        setRestaurantNotifications(page.items);
        setRestaurantUnreadCount(page.unreadCount);
      } finally {
        if (showLoading) setNotificationsLoading(false);
      }
    },
    [],
  );

  const refreshRestaurantSummary = useCallback(async () => {
    const nextRestaurants = await request<ManagedRestaurant[]>(
      "/restaurants/manageable",
      { cache: "reload" },
    );
    setRestaurants(nextRestaurants.map(normalizeRestaurantSetup));
  }, []);

  const handleLiveActivity = useCallback(
    (notification: AppNotification) => {
      setRestaurantNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ].slice(0, 40));
      if (!notification.readAt) {
        setRestaurantUnreadCount((current) => current + 1);
      }

      if (!notification.restaurantId) return;
      void loadRestaurantNotifications(notification.restaurantId);

      if (
        notification.type === "MESSAGE" ||
        notification.type === "MESSAGE_MENTION"
      ) {
        void loadRestaurantConversations(notification.restaurantId);
      } else if (notification.type === "RESTAURANT_REVIEW") {
        void loadRestaurantReviews(notification.restaurantId, true).then(
          setReviews,
        );
      } else if (notification.type === "RESTAURANT_FOLLOW") {
        void refreshRestaurantSummary();
      }
    },
    [
      loadRestaurantConversations,
      loadRestaurantNotifications,
      refreshRestaurantSummary,
    ],
  );

  const refreshLiveActivity = useCallback(() => {
    if (!activeRestaurantId) return;
    void loadRestaurantNotifications(activeRestaurantId);
    void loadRestaurantConversations(activeRestaurantId);
  }, [
    activeRestaurantId,
    loadRestaurantConversations,
    loadRestaurantNotifications,
  ]);

  useRestaurantActivitySocket({
    restaurantId: activeRestaurantId,
    onConnected: refreshLiveActivity,
    onNotification: handleLiveActivity,
  });

  const refreshLiveInbox = useCallback(() => {
    if (!activeRestaurantId) return;
    void loadRestaurantConversations(activeRestaurantId);
  }, [activeRestaurantId, loadRestaurantConversations]);

  useInboxSocket({
    conversationIds: conversations.map((conversation) => conversation.id),
    userId: account?.id,
    onConnected: refreshLiveInbox,
    onMessage: refreshLiveInbox,
  });

  const load = useCallback(async () => {
    try {
      const me = await request<BusinessAccount | null>("/auth/me");
      if (!me?.email) {
        onLogout();
        return;
      }
      setAccount(me);
      const isAdminAccount =
        me.isAdmin === true ||
        me.email.trim().toLowerCase() === "yonagona@gmail.com";
      setIsAdmin(isAdminAccount);

      if (isAdminAccount) {
        const [nextClaims, nextAdmins] = await Promise.all([
          request<RestaurantClaim[]>("/restaurants/claims/pending"),
          request<AdminUser[]>("/admin/admins"),
        ]);
        setClaims(nextClaims);
        setAdmins(nextAdmins);
      } else {
        setClaims([]);
        setAdmins([]);
      }

      const nextRestaurants = (
        await request<ManagedRestaurant[]>(
          "/restaurants/manageable",
        )
      ).map(normalizeRestaurantSetup);
      setRestaurants(nextRestaurants);
      if (nextRestaurants.length) {
        const nextRestaurantId =
          nextRestaurants.some((item) => item.id === selectedRestaurantId)
            ? selectedRestaurantId!
            : nextRestaurants[0].id;
        if (nextRestaurantId !== selectedRestaurantId) {
          setSelectedRestaurantId(nextRestaurantId);
          localStorage.setItem("findeat-selected-restaurant", nextRestaurantId);
        }
        const [nextMenus, nextReviews, nextConversations, nextNotifications] =
          await Promise.all([
            request<Menu[]>(
              `/business/menus?restaurantId=${encodeURIComponent(nextRestaurantId)}`,
            ),
            loadRestaurantReviews(nextRestaurantId),
            fetchRestaurantConversations(nextRestaurantId, me.id),
            fetchRestaurantNotifications(nextRestaurantId),
          ]);
        setMenus(nextMenus);
        setReviews(nextReviews);
        setConversations(nextConversations);
        setRestaurantNotifications(nextNotifications.items);
        setRestaurantUnreadCount(nextNotifications.unreadCount);
        setNotificationsLoading(false);
      } else {
        setSelectedRestaurantId(null);
        localStorage.removeItem("findeat-selected-restaurant");
        setMenus([]);
        setReviews([]);
        setConversations([]);
        setRestaurantNotifications([]);
        setRestaurantUnreadCount(0);
        setNotificationsLoading(false);
      }
      setError("");
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Could not load dashboard";
      if (message.toLowerCase().includes("unauthorized")) onLogout();
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [onLogout, selectedRestaurantId]);

  useEffect(() => {
    // Loading is intentionally tied to mounting the authenticated dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const interval = window.setInterval(() => {
      void loadRestaurantNotifications(restaurant.id);
      void loadRestaurantConversations(restaurant.id);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [
    loadRestaurantConversations,
    loadRestaurantNotifications,
    restaurant?.id,
  ]);

  useEffect(() => {
    if (loading || !account) return;
    if (isAdmin && !restaurant && !isAdminRoute) {
      navigateTo(adminPaths.overview, true);
      return;
    }
    if (isAdminRoute && !routedAdminSection) {
      navigateTo(adminPaths.overview, true);
      return;
    }
    if (!isAdminRoute && !routedBusinessSection) {
      navigateTo(businessPaths.overview, true);
    }
  }, [
    account,
    isAdmin,
    isAdminRoute,
    loading,
    restaurant,
    routedAdminSection,
    routedBusinessSection,
  ]);

  const itemCount = useMemo(
    () => menus.reduce((total, menu) => total + menu.items.length, 0),
    [menus],
  );
  const messageUnreadCount = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );
  const openRestaurantNotifications = () => {
    if (!restaurant) return;
    setNotificationsOpen(true);
    if (restaurantUnreadCount === 0) {
      void loadRestaurantNotifications(restaurant.id, true);
      return;
    }
    const readAt = new Date().toISOString();
    setRestaurantUnreadCount(0);
    setRestaurantNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt })),
    );
    setNotificationsLoading(true);
    void request(`/notifications/restaurants/${restaurant.id}/read-all`, {
      method: "PATCH",
    })
      .then(() => loadRestaurantNotifications(restaurant.id))
      .finally(() => setNotificationsLoading(false));
  };

  const selectRestaurant = (restaurantId: string) => {
    setNotificationsOpen(false);
    setMenus([]);
    setReviews([]);
    setConversations([]);
    setRestaurantNotifications([]);
    setRestaurantUnreadCount(0);
    setNotificationsLoading(true);
    setSelectedRestaurantId(restaurantId);
    localStorage.setItem("findeat-selected-restaurant", restaurantId);
  };

  const clearRestaurantNotifications = async () => {
    if (!restaurant) return;
    await request(`/notifications/restaurants/${restaurant.id}`, {
      method: "DELETE",
    });
    setRestaurantNotifications([]);
    setRestaurantUnreadCount(0);
  };

  if (loading) return <div className="loading [min-height:100vh] [display:grid] [place-items:center] [text-align:center] [background:var(--page)] [&>div]:[max-width:500px] [&_button]:[margin-top:15px] [.pro-kpis&]:[opacity:0.62] dark:[background:var(--page)] dark:[color:var(--ink)]">Loading your restaurant…</div>;
  if (error)
    return (
      <ErrorPage
        status={error.toLowerCase().includes("fetch") ? 503 : 500}
        title="We couldn’t open [.hours-state&]:[border-color:#93c5aa] [.hours-state&]:[background:#e9f7ee] [.hours-state&]:[color:#197044] your dashboard."
        detail={error}
        primaryAction={{ label: "Try again", onClick: () => void load() }}
        secondaryAction={{ label: "Sign out", onClick: onLogout }}
      />
    );
  if (!account) return <div className="loading [min-height:100vh] [display:grid] [place-items:center] [text-align:center] [background:var(--page)] [&>div]:[max-width:500px] [&_button]:[margin-top:15px] [.pro-kpis&]:[opacity:0.62] dark:[background:var(--page)] dark:[color:var(--ink)]">Loading your account…</div>;
  if (isAdminRoute && !isAdmin)
    return (
      <ErrorPage
        status={403}
        primaryAction={{
          label: "Back to dashboard",
          onClick: () => navigateTo(businessPaths.overview),
        }}
        secondaryAction={{
          label: "Go back",
          onClick: () => window.history.back(),
        }}
      />
    );
  if (isAdmin && (!restaurant || isAdminRoute))
    return (
      <AdminPage
        claims={claims}
        admins={admins}
        account={account}
        reload={load}
        onLogout={onLogout}
        section={routedAdminSection ?? "claims"}
        onNavigate={(next) => navigateTo(adminPaths[next])}
        onBackToBusiness={restaurant ? () => navigateTo(businessPaths.overview) : undefined}
      />
    );
  if (!restaurant)
    return (
      <div className="loading [min-height:100vh] [display:grid] [place-items:center] [text-align:center] [background:var(--page)] [&>div]:[max-width:500px] [&_button]:[margin-top:15px] [.pro-kpis&]:[opacity:0.62] dark:[background:var(--page)] dark:[color:var(--ink)]">
        <div>
          <h2>No managed restaurant</h2>
          <p>Once your restaurant claim is approved, it will appear here.</p>
          <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  return (
    <div className="dashboard [height:100vh] [min-height:0] [display:grid] [grid-template-columns:260px_minmax(0,_1fr)] [overflow:hidden] [background:var(--page)] [color:var(--ink)] max-[800px]:[grid-template-columns:1fr] max-[800px]:[grid-template-rows:auto_minmax(0,_1fr)] dark:[background:var(--page)] dark:[color:var(--ink)] max-[800px]:[height:100vh] max-[800px]:[height:100dvh] max-[800px]:[overflow:hidden] max-[800px]:[&>aside]:[position:relative] max-[800px]:[&>aside]:[z-index:30] max-[800px]:[&>aside]:[display:block] max-[800px]:[&>aside]:[width:100%] max-[800px]:[&>aside]:[height:auto] max-[800px]:[&>aside]:[min-width:0] max-[800px]:[&>aside]:[padding:10px_12px] max-[800px]:[&>aside]:[border-right:0] max-[800px]:[&>aside]:[border-bottom:1px_solid_var(--line)] max-[800px]:[&>aside]:[box-shadow:0_5px_20px_color-mix(in_srgb,_var(--ink)_6%,_transparent)] max-[800px]:[&>aside_.restaurant-switcher]:[width:100%] max-[800px]:[&>aside_.restaurant-chip]:[min-height:52px] max-[800px]:[&>aside_.restaurant-chip]:[margin:0] max-[800px]:[&>aside_.restaurant-chip]:[padding:7px_10px] max-[800px]:[&>aside_.restaurant-chip]:[border-color:var(--line)] max-[800px]:[&>aside_.restaurant-chip]:[background:var(--surface-subtle)] max-[800px]:[&>aside_.restaurant-chip_img]:[width:36px] max-[800px]:[&>aside_.restaurant-chip_img]:[height:36px] max-[800px]:[&>aside_.restaurant-chip_img]:[flex-basis:36px] max-[800px]:[&>aside_.restaurant-chip>span]:[width:36px] max-[800px]:[&>aside_.restaurant-chip>span]:[height:36px] max-[800px]:[&>aside_.restaurant-chip>span]:[flex-basis:36px] max-[800px]:[&>aside_nav]:[display:none] max-[800px]:[&>aside_nav]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[800px]:[&>aside_nav]:[gap:5px] max-[800px]:[&>aside_nav]:[width:100%] max-[800px]:[&>aside_nav]:[margin:10px_0_0] max-[800px]:[&>aside_nav]:[padding:9px_0_0] max-[800px]:[&>aside_nav]:[overflow:visible] max-[800px]:[&>aside_nav]:[border-top:1px_solid_var(--line)] max-[800px]:[&>aside.mobile-nav-open_nav]:[display:grid] max-[800px]:[&>aside_nav_a]:[justify-content:flex-start] max-[800px]:[&>aside_nav_a]:[width:100%] max-[800px]:[&>aside_nav_a]:[min-width:0] max-[800px]:[&>aside_nav_a]:[min-height:42px] max-[800px]:[&>aside_nav_a]:[gap:7px] max-[800px]:[&>aside_nav_a]:[padding:9px_11px] max-[800px]:[&>aside_nav_a]:[border:1px_solid_transparent] max-[800px]:[&>aside_nav_a]:[border-radius:11px] max-[800px]:[&>aside_nav_a]:[font-size:11px] max-[800px]:[&>aside_nav_a]:[white-space:normal] max-[800px]:[&>aside_nav_button]:[justify-content:flex-start] max-[800px]:[&>aside_nav_button]:[width:100%] max-[800px]:[&>aside_nav_button]:[min-width:0] max-[800px]:[&>aside_nav_button]:[min-height:42px] max-[800px]:[&>aside_nav_button]:[gap:7px] max-[800px]:[&>aside_nav_button]:[padding:9px_11px] max-[800px]:[&>aside_nav_button]:[border:1px_solid_transparent] max-[800px]:[&>aside_nav_button]:[border-radius:11px] max-[800px]:[&>aside_nav_button]:[font-size:11px] max-[800px]:[&>aside_nav_button]:[white-space:normal] max-[800px]:[&>aside_nav_a.active]:[border-color:var(--line)] max-[800px]:[&>aside_nav_button.active]:[border-color:var(--line)] max-[800px]:[&>aside_nav_.nav-icon]:[width:17px] max-[800px]:[&>aside_nav_.nav-icon]:[height:17px] max-[800px]:[&>aside_nav_.nav-icon]:[flex-basis:17px] max-[800px]:[&>aside_.nav-count]:[margin-left:1px] max-[380px]:[&>aside_nav]:[grid-template-columns:1fr] max-[380px]:[&>aside_nav_a]:[padding-inline:9px] max-[380px]:[&>aside_nav_button]:[padding-inline:9px]">
      <aside ref={sidebarRef} className={`sticky top-0 flex h-screen flex-col overflow-hidden border-r border-[#ffffff1f] bg-[#24211f] px-4.5 py-6.25 text-[#faf9f6] transition-[padding] duration-200 ease-out max-[800px]:static max-[800px]:h-auto max-[800px]:overflow-visible max-[800px]:p-3.5 ${desktopSidebarOpen ? "" : "min-[801px]:px-2 min-[801px]:[&_.brand]:hidden min-[801px]:[&_.restaurant-switcher]:hidden min-[801px]:[&_nav]:pt-12 min-[801px]:[&_nav_a]:justify-center min-[801px]:[&_nav_a]:gap-0 min-[801px]:[&_nav_a]:text-[0px] min-[801px]:[&_nav_button]:justify-center min-[801px]:[&_nav_button]:gap-0 min-[801px]:[&_nav_button]:text-[0px] min-[801px]:[&_.nav-count]:hidden min-[801px]:[&_.nav-premium]:hidden min-[801px]:[&_[data-sidebar-group-label]]:hidden min-[801px]:[&_[data-sidebar-group-caret]]:hidden min-[801px]:[&_[data-sidebar-group-content]]:hidden min-[801px]:[&_[data-sidebar-group]>button]:justify-center min-[801px]:[&_.aside-footer]:px-0 min-[801px]:[&_.sidebar-account]:flex min-[801px]:[&_.sidebar-account]:justify-center min-[801px]:[&_.sidebar-account>div]:hidden min-[801px]:[&_.sidebar-account>button]:hidden min-[801px]:[&_.web-version]:hidden"} ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
        <button
          type="button"
          className={`absolute z-20 hidden size-8 place-items-center rounded-lg border-0 bg-transparent text-[#faf9f6] transition hover:bg-[#ffffff1a] min-[801px]:grid ${desktopSidebarOpen ? "top-7 right-3" : "top-5 left-1/2 -translate-x-1/2"}`}
          onClick={() => setDesktopSidebarOpen((open) => !open)}
          aria-label={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <SidebarSimpleIcon size={19} weight="duotone" />
        </button>
        <div className="brand [display:flex] [align-items:center] [gap:12px] [padding:0_8px_25px] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:18px] [&_small]:[color:var(--muted)] [&_small]:[font-size:12px] [.restaurant-setup-topbar_&]:[display:flex] [.restaurant-setup-topbar_&]:[align-items:center] [.restaurant-setup-topbar_&]:[gap:10px] [.restaurant-setup-topbar_&>div:last-child]:[display:flex] [.restaurant-setup-topbar_&>div:last-child]:[flex-direction:column] [.admin-layout_header_&]:[padding:0] max-[800px]:[aside_&]:[display:none]">
          <span className="login-brand-mark [display:grid] [place-items:center] [width:46px] [height:46px] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:15px] [background:#fff8ef] [box-shadow:0_8px_22px_#4d2a1614] [&_img]:[width:37px] [&_img]:[height:37px] [&_img]:[object-fit:contain] dark:[border-color:var(--line)] dark:[background:var(--surface-subtle)] dark:[box-shadow:0_8px_24px_#0005]">
            <img src="/findeat-favicon.svg" alt="" />
          </span>
          <div>
            <strong>FindEat</strong>
            <small>Business</small>
          </div>
        </div>
        <div className="mobile-nav-bar [display:contents] max-[800px]:[display:flex] max-[800px]:[align-items:center] max-[800px]:[gap:9px] max-[800px]:[min-width:0]">
          <div className="mobile-nav-title [display:none] max-[800px]:[display:flex] max-[800px]:[align-items:center] max-[800px]:[min-width:0] max-[800px]:[flex:1] max-[800px]:[gap:10px] max-[800px]:[padding:5px_3px] max-[800px]:[&>svg]:[flex:0_0_auto] max-[800px]:[&>svg]:[color:var(--accent)] max-[800px]:[&>div]:[min-width:0] max-[800px]:[&_strong]:[display:block] max-[800px]:[&_strong]:[overflow:hidden] max-[800px]:[&_strong]:[text-overflow:ellipsis] max-[800px]:[&_strong]:[white-space:nowrap] max-[800px]:[&_small]:[display:block] max-[800px]:[&_small]:[overflow:hidden] max-[800px]:[&_small]:[text-overflow:ellipsis] max-[800px]:[&_small]:[white-space:nowrap] max-[800px]:[&_strong]:[font-size:13px] max-[800px]:[&_small]:[margin-top:2px] max-[800px]:[&_small]:[color:var(--muted)] max-[800px]:[&_small]:[font-size:10px]">
            <StorefrontIcon size={20} weight="duotone" aria-hidden="true" />
            <div>
              <div className="mobile-nav-title-row max-[800px]:[display:flex] max-[800px]:[align-items:center] max-[800px]:[min-width:0] max-[800px]:[gap:7px] max-[800px]:[&>strong]:[min-width:0]">
                <strong>FindEat Business</strong>
              </div>
              <small>Restaurant workspace</small>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-toggle [display:none] max-[800px]:[display:grid] max-[800px]:[place-items:center] max-[800px]:[width:46px] max-[800px]:[height:46px] max-[800px]:[flex:0_0_46px] max-[800px]:[padding:0] max-[800px]:[border:1px_solid_var(--line)] max-[800px]:[border-radius:14px] max-[800px]:[background:var(--surface-subtle)] max-[800px]:[color:var(--ink)] max-[800px]:[&:focus-visible]:[outline:2px_solid_var(--accent)] max-[800px]:[&:focus-visible]:[outline-offset:2px]"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            aria-controls="business-navigation"
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            {mobileNavOpen ? (
              <XIcon size={21} weight="bold" aria-hidden="true" />
            ) : (
              <ListIcon size={23} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
        {isAdmin && (
          <WorkspaceSwitcher
            active="business"
            adminCount={claims.length}
            collapsed={!desktopSidebarOpen}
            onBusiness={() => undefined}
            onAdmin={() => navigateTo(adminPaths.overview)}
          />
        )}
        <nav className="mt-6.25 grid gap-1.25 [&>a]:flex [&>a]:min-h-11 [&>a]:w-full [&>a]:items-center [&>a]:gap-3.25 [&>a]:rounded-xl [&>a]:border-0 [&>a]:bg-transparent [&>a]:p-3 [&>a]:text-left [&>a]:text-sm [&>a]:font-normal [&>a]:text-[#555] [&>a]:no-underline [&>a]:transition [&>a:focus-visible]:outline-2 [&>a:focus-visible]:outline-offset-2 [&>a:focus-visible]:outline-accent [@media(hover:hover)]:[&>a:hover]:translate-x-0.75 [@media(hover:hover)]:[&>a:hover]:bg-surface-hover [@media(hover:hover)]:[&>a:hover]:text-ink max-[800px]:m-0 max-[800px]:grid-cols-3 max-[800px]:[&>a]:justify-center max-[800px]:[&>a]:text-xs" id="business-navigation" onClick={() => setMobileNavOpen(false)}>
          <AppLink
            to={businessPaths.overview}
            className={section === "overview" ? "active overflow-hidden! text-ellipsis! whitespace-nowrap! bg-[#ffffff22]! font-bold! tracking-[-0.012em]! text-[#faf9f6]!" : "overflow-hidden! text-ellipsis! whitespace-nowrap! text-[#faf9f6]!"}
          >
            <HouseIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Overview
          </AppLink>
          <AppLink
            to={businessPaths.dashboard}
            className={section === "dashboard" ? "active overflow-hidden! text-ellipsis! whitespace-nowrap! bg-[#ffffff22]! font-bold! tracking-[-0.012em]! text-[#faf9f6]!" : "overflow-hidden! text-ellipsis! whitespace-nowrap! text-[#faf9f6]!"}
          >
            <ChartLineUpIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Dashboard <small className="nav-premium [margin-left:auto] [padding:2px_5px] [border-radius:5px] [background:#fff0cc] [color:#8a6200] [font-size:8px] [font-weight:900] max-[800px]:[display:none] [background:var(--warning-soft)] [color:var(--warning)]">PRO</small>
          </AppLink>
          <SidebarNavGroup
            id="business-restaurant-management"
            label="Restaurant management"
            icon={<ForkKnifeIcon size={20} weight="duotone" />}
            active={["menu", "reviews", "badges", "offers", "profile"].includes(section)}
          >
          <AppLink
            to={businessPaths.menu}
            className={section === "menu" ? "active" : ""}
          >
            <ListDashesIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Menu
          </AppLink>
          <AppLink
            to={businessPaths.reviews}
            className={section === "reviews" ? "active" : ""}
          >
            <StarIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Reviews
          </AppLink>
          <AppLink
            to={businessPaths.badges}
            className={section === "badges" ? "active" : ""}
          >
            <MedalIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Badges
            {(restaurant.earnedBadges?.length ?? 0) > 0 && <small className="nav-count [margin-left:auto] [min-width:22px] [padding:3px_6px] [border-radius:20px] [background:#ffe4da] [color:#a6382a] [text-align:center] [font-size:10px] [font-weight:900] [&.neutral]:[background:#ebe9e5] [&.neutral]:[color:#555] [&.neutral]:[background:var(--neutral-chip)] [&.neutral]:[color:var(--neutral-chip-text)] [background:var(--accent-soft)] [color:var(--accent-dark)]">{restaurant.earnedBadges?.length}</small>}
          </AppLink>
          <AppLink
            to={businessPaths.offers}
            className={section === "offers" ? "active" : ""}
          >
            <GiftIcon className="nav-icon" size={20} weight="duotone" /> Offers and rewards
          </AppLink>
          <AppLink
            to={businessPaths.profile}
            className={section === "profile" ? "active" : ""}
          >
            <StorefrontIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Restaurant profile
          </AppLink>
          </SidebarNavGroup>
          <AppLink
            to={businessPaths.support}
            className={section === "support" ? "active overflow-hidden! text-ellipsis! whitespace-nowrap! bg-[#ffffff22]! font-bold! tracking-[-0.012em]! text-[#faf9f6]!" : "overflow-hidden! text-ellipsis! whitespace-nowrap! text-[#faf9f6]!"}
          >
            <HeadsetIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Help and support
          </AppLink>
        </nav>
        <div className="aside-footer [margin-top:auto] [padding:16px_10px_0] [border-top:1px_solid_var(--line)] [&_p]:[margin-bottom:5px] [&_p]:[font-weight:800] [&_p]:[font-size:13px] [&_small]:[display:block] [&_small]:[color:var(--muted)] [&_small]:[line-height:1.45] [&_button]:[margin-top:18px] [&_button]:[padding:0] [&_button]:[border:0] [&_button]:[background:none] [&_button]:[color:#a13c2a] [&_button]:[font-weight:700] [&_.sidebar-account>button]:[display:grid] [&_.sidebar-account>button]:[place-items:center] [&_.sidebar-account>button]:[width:34px] [&_.sidebar-account>button]:[height:34px] [&_.sidebar-account>button]:[margin:0] [&_.sidebar-account>button]:[padding:0] [&_.sidebar-account>button]:[border:1px_solid_var(--line)] [&_.sidebar-account>button]:[border-radius:11px] [&_.sidebar-account>button]:[background:var(--surface-subtle)] [&_.sidebar-account>button]:[color:var(--muted)] [&_.sidebar-account>button]:[transition:background-color_.16s_ease,color_.16s_ease] [&_.sidebar-account>button:hover]:[background:var(--danger-soft)] [&_.sidebar-account>button:hover]:[color:var(--danger)] max-[800px]:[display:none] [&_.web-version]:[display:block] [&_.web-version]:[margin-top:12px] [&_.web-version]:[color:color-mix(in_srgb,var(--muted)_72%,transparent)] [&_.web-version]:[font-size:9px] [&_.web-version]:[font-weight:800] [&_.web-version]:[letter-spacing:.06em] [&_.web-version]:[text-align:center] [&_.web-version]:[text-transform:uppercase] [&_button]:[color:var(--danger)]">
          <div className="sidebar-account [display:grid] [grid-template-columns:auto_minmax(0,1fr)_34px] [align-items:center] [gap:11px] [&>div]:[min-width:0] [&_strong]:[display:block] [&_strong]:[overflow:hidden] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_small]:[display:block] [&_small]:[overflow:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_strong]:[font-size:12px] [&_small]:[margin-top:2px] [&_small]:[font-size:9px]">
            <AccountAvatar account={account} />
            <div>
              <strong>{account.username}</strong>
              <small>{account.email}</small>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <SignOutIcon size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <small className="web-version">Web v{WEB_VERSION}</small>
        </div>
        {desktopSidebarOpen && (
          <div
            className="absolute top-0 right-[-4px] bottom-0 z-30 hidden w-2 cursor-col-resize touch-none transition-colors hover:bg-[#ffffff24] min-[801px]:block"
            onPointerDown={startSidebarResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
          />
        )}
      </aside>
      <main className="content [min-width:0] [min-height:0] [height:100vh] [display:grid] [grid-template-rows:76px_minmax(0,_1fr)] [overflow:hidden] [&>header]:[position:relative] [&>header]:[z-index:10] [&>:not(header)]:[min-height:0] [&>:not(header)]:[overflow-y:auto] [&>:not(header)]:[overscroll-behavior:contain] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0] [&>.messages-page]:[margin-top:0] [&>.messages-page]:[margin-bottom:0] [&>.admin-content]:[margin-top:0] [&>.admin-content]:[margin-bottom:0] [&>.messages-page]:[display:flex] [&>.messages-page]:[flex-direction:column] [&>.messages-page]:[height:100%] [&>.messages-page]:[min-height:0] [&>.messages-page]:[overflow:hidden] max-[800px]:[height:100%] max-[800px]:[min-height:0] [&>.support-admin-content]:[display:flex] [&>.support-admin-content]:[flex-direction:column] [&>.support-admin-content]:[height:100%] [&>.support-admin-content]:[min-height:0] [&>.support-admin-content]:[overflow:hidden] [&>.support-admin-content]:[padding-bottom:32px] max-[800px]:[&>.support-admin-content]:[padding-top:22px] max-[800px]:[&>.support-admin-content]:[padding-bottom:18px] max-[800px]:[grid-template-rows:60px_minmax(0,_1fr)] max-[800px]:[&>header]:[display:flex] max-[800px]:[&>header]:[height:60px] max-[800px]:[&>header]:[min-width:0] max-[800px]:[&>header]:[padding:0_16px] max-[800px]:[&>header>div:first-child]:[min-width:0] max-[380px]:[&>header]:[padding-inline:12px] max-[380px]:[&>header>div:first-child>strong]:[max-width:34vw] max-[380px]:[&>header>div:first-child>strong]:[font-size:12px]">
        <header className="flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5 max-[380px]:[&_.top-actions]:[gap:6px] max-[380px]:[&_.top-actions_.notifications-trigger]:[width:34px] max-[380px]:[&_.top-actions_.notifications-trigger]:[height:34px] max-[380px]:[&_.top-actions_.notifications-trigger>svg]:[width:18px] max-[380px]:[&_.top-actions_.notifications-trigger>svg]:[height:18px]">
          <div className="header-identity-group [display:flex] [align-items:center] [gap:18px] [min-width:0] [flex:1] max-[800px]:[align-self:stretch] max-[800px]:[gap:7px] max-[800px]:[min-width:0] max-[800px]:[flex:1]">
            <div className="header-restaurant-switcher [min-width:0] [&_.restaurant-switcher]:[width:min(360px,42vw)] [&_.restaurant-chip]:[min-height:50px] [&_.restaurant-chip]:[padding:6px_8px] [&_.restaurant-chip]:[border-color:transparent] [&_.restaurant-chip]:[background:transparent] [&_.restaurant-chip:hover]:[background:var(--surface-hover)] [&_.restaurant-chip.open]:[background:var(--surface-hover)] [&_.restaurant-switcher-menu]:[right:auto] [&_.restaurant-switcher-menu]:[left:0] [&_.restaurant-switcher-menu]:[width:100%] [&_.restaurant-switcher-menu]:[max-width:none] max-[800px]:[display:flex] max-[800px]:[align-self:stretch] max-[800px]:[align-items:center] max-[800px]:[justify-content:flex-start] max-[800px]:[min-width:0] max-[800px]:[flex:1] max-[800px]:[&_.restaurant-switcher]:[width:100%] max-[800px]:[&_.restaurant-switcher]:[max-width:none] max-[800px]:[&_.restaurant-chip]:[min-height:44px] max-[800px]:[&_.restaurant-chip]:[padding:4px_7px] max-[800px]:[&_.restaurant-chip]:[border-color:transparent] max-[800px]:[&_.restaurant-chip]:[background:transparent] max-[800px]:[&_.restaurant-chip:hover]:[background:var(--surface-hover)] max-[800px]:[&_.restaurant-chip.open]:[background:var(--surface-hover)] max-[800px]:[&_.restaurant-chip_img]:[width:34px] max-[800px]:[&_.restaurant-chip_img]:[height:34px] max-[800px]:[&_.restaurant-chip_img]:[flex-basis:34px] max-[800px]:[&_.restaurant-chip>span]:[width:34px] max-[800px]:[&_.restaurant-chip>span]:[height:34px] max-[800px]:[&_.restaurant-chip>span]:[flex-basis:34px] max-[800px]:[&_.restaurant-switcher-menu]:[top:calc(100%_+_7px)] max-[800px]:[&_.restaurant-switcher-menu]:[right:auto] max-[800px]:[&_.restaurant-switcher-menu]:[left:0] max-[800px]:[&_.restaurant-switcher-menu]:[width:100%] max-[800px]:[&_.restaurant-switcher-menu]:[max-width:none]">
              <RestaurantSwitcher
                restaurant={restaurant}
                restaurants={restaurants}
                onSelect={selectRestaurant}
              />
            </div>
          </div>
          <div className="top-actions [display:flex] [align-items:center] [gap:14px] max-[800px]:[min-width:0] max-[800px]:[flex:0_0_auto] max-[800px]:[justify-content:flex-end] max-[800px]:[gap:9px]">
            <AppLink
              to={businessPaths.messages}
              className={`notifications-trigger [position:relative] [display:grid] [place-items:center] [width:42px] [height:42px] [padding:0] [border:1px_solid_var(--line)] [border-radius:50%] [background:var(--surface)] [color:var(--ink)] [&:hover]:[border-color:#d8c9bb] [&:hover]:[background:#faf8f5] [&.active]:[border-color:#d8c9bb] [&.active]:[background:#faf8f5] [&>svg]:[width:21px] [&>svg]:[height:21px] [&>svg]:[display:block] [&>b]:[position:absolute] [&>b]:[right:-5px] [&>b]:[top:-5px] [&>b]:[display:grid] [&>b]:[place-items:center] [&>b]:[min-width:19px] [&>b]:[height:19px] [&>b]:[padding:0_5px] [&>b]:[border:2px_solid_#FAF9F6] [&>b]:[border-radius:10px] [&>b]:[background:var(--accent)] [&>b]:[color:#FAF9F6] [&>b]:[font-size:9px] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] [&.active]:[border-color:var(--line)] [&.active]:[background:var(--surface-hover)] dark:[&>b]:[border-color:var(--surface)] max-[800px]:[width:38px] max-[800px]:[height:38px] messages-trigger [text-decoration:none] ${section === "messages" ? "active" : ""}`}
              aria-label="Open messages"
              title="Messages"
              onClick={() => setNotificationsOpen(false)}
            >
              <ChatCircleDotsIcon size={21} weight="duotone" aria-hidden="true" />
              {messageUnreadCount > 0 ? (
                <b>{messageUnreadCount > 99 ? "99+" : messageUnreadCount}</b>
              ) : null}
            </AppLink>
            <div className="notifications-menu [position:relative]">
              <button
                className={`notifications-trigger [position:relative] [display:grid] [place-items:center] [width:42px] [height:42px] [padding:0] [border:1px_solid_var(--line)] [border-radius:50%] [background:var(--surface)] [color:var(--ink)] [&:hover]:[border-color:#d8c9bb] [&:hover]:[background:#faf8f5] [&.active]:[border-color:#d8c9bb] [&.active]:[background:#faf8f5] [&>svg]:[width:21px] [&>svg]:[height:21px] [&>svg]:[display:block] [&>b]:[position:absolute] [&>b]:[right:-5px] [&>b]:[top:-5px] [&>b]:[display:grid] [&>b]:[place-items:center] [&>b]:[min-width:19px] [&>b]:[height:19px] [&>b]:[padding:0_5px] [&>b]:[border:2px_solid_#faf9f6] [&>b]:[border-radius:10px] [&>b]:[background:var(--accent)] [&>b]:[color:#faf9f6] [&>b]:[font-size:9px] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] [&.active]:[border-color:var(--line)] [&.active]:[background:var(--surface-hover)] dark:[&>b]:[border-color:var(--surface)] max-[800px]:[width:38px] max-[800px]:[height:38px] ${notificationsOpen ? "active" : ""}`}
                type="button"
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  if (notificationsOpen) setNotificationsOpen(false);
                  else openRestaurantNotifications();
                }}
              >
                <BellIcon size={21} weight="duotone" aria-hidden="true" />
                {restaurantUnreadCount > 0 && (
                  <b>
                    {restaurantUnreadCount > 99 ? "99+" : restaurantUnreadCount}
                  </b>
                )}
              </button>
              {notificationsOpen && (
                <NotificationsPopover
                  restaurant={restaurant}
                  notifications={restaurantNotifications}
                  loading={notificationsLoading}
                  onNavigate={navigateSection}
                  onClose={() => setNotificationsOpen(false)}
                  onClear={clearRestaurantNotifications}
                />
              )}
            </div>
            <AppLink
              to={businessPaths.settings}
              className={`notifications-trigger [position:relative] [display:grid] [place-items:center] [width:42px] [height:42px] [padding:0] [border:1px_solid_var(--line)] [border-radius:50%] [background:var(--surface)] [color:var(--ink)] [&:hover]:[border-color:#d8c9bb] [&:hover]:[background:#faf8f5] [&.active]:[border-color:#d8c9bb] [&.active]:[background:#faf8f5] [&>svg]:[width:21px] [&>svg]:[height:21px] [&>svg]:[display:block] [&>b]:[position:absolute] [&>b]:[right:-5px] [&>b]:[top:-5px] [&>b]:[display:grid] [&>b]:[place-items:center] [&>b]:[min-width:19px] [&>b]:[height:19px] [&>b]:[padding:0_5px] [&>b]:[border:2px_solid_#faf9f6] [&>b]:[border-radius:10px] [&>b]:[background:var(--accent)] [&>b]:[color:#faf9f6] [&>b]:[font-size:9px] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] [&.active]:[border-color:var(--line)] [&.active]:[background:var(--surface-hover)] dark:[&>b]:[border-color:var(--surface)] max-[800px]:[width:38px] max-[800px]:[height:38px] settings-trigger [text-decoration:none] ${section === "settings" ? "active" : ""}`}
              aria-label="Open settings"
              title="Settings"
              onClick={() => setNotificationsOpen(false)}
            >
              <GearSixIcon size={21} weight="duotone" aria-hidden="true" />
            </AppLink>
          </div>
        </header>
        {(section === "overview" || visitedSections.has("overview")) && (
          <div
            className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]"
            hidden={section !== "overview"}
          >
            <OverviewPage
              restaurant={restaurant}
              menuCount={menus.length}
              itemCount={itemCount}
              reviewCount={reviews.length}
              onOpenMenu={() => navigateTo(businessPaths.menu)}
              onOpenProfile={() => navigateTo(businessPaths.profile)}
            />
          </div>
        )}
        {(section === "dashboard" || visitedSections.has("dashboard")) && (
          <div
            className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]"
            hidden={section !== "dashboard"}
          >
            <AnalyticsPage
              restaurantId={restaurant.id}
              menus={menus}
              reviews={reviews}
            />
          </div>
        )}
        {(section === "menu" || visitedSections.has("menu")) && (
          <div className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]" hidden={section !== "menu"}>
            <MenuPage
              key={restaurant.id}
              menus={menus}
              restaurantId={restaurant.id}
              reload={load}
            />
          </div>
        )}
        {(section === "reviews" || visitedSections.has("reviews")) && (
          <div className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]" hidden={section !== "reviews"}>
            <ReviewsPage reviews={reviews} />
          </div>
        )}
        {(section === "badges" || visitedSections.has("badges")) && (
          <div
            className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0] badges-page-slot [overflow:hidden]"
            hidden={section !== "badges"}
          >
            <BadgesPage restaurant={restaurant} />
          </div>
        )}
        {(section === "offers" || visitedSections.has("offers")) && (
          <div className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]" hidden={section !== "offers"}>
            <OffersPage key={restaurant.id} restaurant={restaurant} />
          </div>
        )}
        {(section === "messages" || visitedSections.has("messages")) && (
          <div
            className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0] messages-page-slot [overflow:hidden] [&>.messages-page]:[display:flex] [&>.messages-page]:[flex-direction:column] [&>.messages-page]:[height:100%] [&>.messages-page]:[min-height:0] [&>.messages-page]:[margin-top:0] [&>.messages-page]:[margin-bottom:0] [&>.messages-page]:[overflow:hidden]"
            hidden={section !== "messages"}
          >
            <MessagesPage
              key={restaurant.id}
              restaurant={restaurant}
              account={account}
              conversations={conversations}
              reloadConversations={loadRestaurantConversations}
            />
          </div>
        )}
        {(section === "profile" || visitedSections.has("profile")) && (
          <div className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]" hidden={section !== "profile"}>
            <ProfilePage
              key={restaurant.id}
              restaurant={restaurant}
              menus={menus}
              onSaved={load}
            />
          </div>
        )}
        {(section === "support" || visitedSections.has("support")) && (
          <div className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0]" hidden={section !== "support"}>
            <OwnerSupportPage key={restaurant.id} restaurant={restaurant} />
          </div>
        )}
        {(section === "settings" || visitedSections.has("settings")) && (
          <div className="dashboard-page-slot [min-height:0] [overflow-y:auto] [overscroll-behavior:contain] [&[hidden]]:[display:none] [&>.page-stack]:[margin-top:0] [&>.page-stack]:[margin-bottom:0] [padding:46px_42px_70px] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px]" hidden={section !== "settings"}>
            <SettingsPage />
          </div>
        )}
      </main>
    </div>
  );
}

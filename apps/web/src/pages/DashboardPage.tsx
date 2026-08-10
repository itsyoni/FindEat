import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellIcon } from "@phosphor-icons/react/dist/csr/Bell";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { ListDashesIcon } from "@phosphor-icons/react/dist/csr/ListDashes";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { HeadsetIcon } from "@phosphor-icons/react/dist/csr/Headset";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
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
import { useInboxSocket } from "../hooks/useInboxSocket";
import { useRestaurantActivitySocket } from "../hooks/useRestaurantActivitySocket";
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
import { OwnerSupportPage } from "./OwnerSupportPage";
import { SettingsPage } from "./SettingsPage";
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
import "../App.css";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const switchable = restaurants.length > 1;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function restaurantSubtitle(item: ManagedRestaurant) {
    if (item.accessRole === "ADMIN") return "Admin access";
    return item.city || (item.status === "CLAIMED" ? "Claimed restaurant" : "Restaurant");
  }

  return (
    <div className="restaurant-switcher" ref={rootRef}>
      <button
        type="button"
        className={`restaurant-chip ${switchable ? "switchable" : ""} ${open ? "open" : ""}`}
        aria-haspopup={switchable ? "listbox" : undefined}
        aria-expanded={switchable ? open : undefined}
        onClick={() => switchable && setOpen((current) => !current)}
      >
        {restaurant.logoUrl ? (
          <img src={restaurant.logoUrl} alt="" />
        ) : (
          <span>{restaurant.name.charAt(0).toUpperCase()}</span>
        )}
        <div>
          <strong>{restaurant.name}</strong>
          <small>
            {switchable
              ? `${restaurants.length} restaurants`
              : restaurantSubtitle(restaurant)}
          </small>
        </div>
        {switchable ? (
          <CaretDownIcon
            className="restaurant-switcher-caret"
            size={17}
            weight="bold"
            aria-hidden="true"
          />
        ) : null}
      </button>

      {open ? (
        <div className="restaurant-switcher-menu" role="listbox" aria-label="Select restaurant">
          <div className="restaurant-switcher-heading">
            <strong>Switch restaurant</strong>
            <small>{restaurants.length} profiles</small>
          </div>
          <div className="restaurant-switcher-options">
            {restaurants.map((item) => {
              const selected = item.id === restaurant.id;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? "selected" : ""}
                  key={item.id}
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
                    <strong>{item.name}</strong>
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
      navigateTo(adminPaths.claims, true);
      return;
    }
    if (isAdminRoute && !routedAdminSection) {
      navigateTo(adminPaths.claims, true);
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

  if (loading) return <div className="loading">Loading your restaurant…</div>;
  if (error)
    return (
      <ErrorPage
        status={error.toLowerCase().includes("fetch") ? 503 : 500}
        title="We couldn’t open your dashboard."
        detail={error}
        primaryAction={{ label: "Try again", onClick: () => void load() }}
        secondaryAction={{ label: "Sign out", onClick: onLogout }}
      />
    );
  if (!account) return <div className="loading">Loading your account…</div>;
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
      <div className="loading">
        <div>
          <h2>No managed restaurant</h2>
          <p>Once your restaurant claim is approved, it will appear here.</p>
          <button className="secondary" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  return (
    <div className="dashboard">
      <aside className={mobileNavOpen ? "mobile-nav-open" : ""}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FindEat</strong>
            <small>Business</small>
          </div>
        </div>
        <div className="desktop-restaurant-switcher">
          <RestaurantSwitcher
            restaurant={restaurant}
            restaurants={restaurants}
            onSelect={selectRestaurant}
          />
        </div>
        <div className="mobile-nav-bar">
          <div className="mobile-nav-title">
            <StorefrontIcon size={20} weight="duotone" aria-hidden="true" />
            <div>
              <div className="mobile-nav-title-row">
                <strong>FindEat Business</strong>
                <span className="mobile-access-pill">
                  {restaurant.accessRole === "ADMIN"
                    ? "Admin access"
                    : restaurant.status === "CLAIMED"
                      ? "Claimed"
                      : "Unclaimed"}
                </span>
              </div>
              <small>Restaurant workspace</small>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-toggle"
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
        <nav id="business-navigation" onClick={() => setMobileNavOpen(false)}>
          <AppLink
            to={businessPaths.overview}
            className={section === "overview" ? "active" : ""}
          >
            <HouseIcon className="nav-icon" weight="duotone" /> Overview
          </AppLink>
          <AppLink
            to={businessPaths.dashboard}
            className={section === "dashboard" ? "active" : ""}
          >
            <ChartLineUpIcon className="nav-icon" weight="duotone" /> Dashboard <small className="nav-premium">PRO</small>
          </AppLink>
          <AppLink
            to={businessPaths.menu}
            className={section === "menu" ? "active" : ""}
          >
            <ListDashesIcon className="nav-icon" weight="duotone" /> Menu
          </AppLink>
          <AppLink
            to={businessPaths.reviews}
            className={section === "reviews" ? "active" : ""}
          >
            <StarIcon className="nav-icon" weight="duotone" /> Reviews
          </AppLink>
          <AppLink
            to={businessPaths.messages}
            className={section === "messages" ? "active" : ""}
          >
            <ChatCircleDotsIcon className="nav-icon" weight="duotone" /> Messages{" "}
            {conversations.reduce(
              (total, conversation) => total + conversation.unreadCount,
              0,
            ) > 0 && (
              <small className="nav-count">
                {conversations.reduce(
                  (total, conversation) => total + conversation.unreadCount,
                  0,
                )}
              </small>
            )}
          </AppLink>
          <AppLink
            to={businessPaths.profile}
            className={section === "profile" ? "active" : ""}
          >
            <StorefrontIcon className="nav-icon" weight="duotone" /> Restaurant profile
          </AppLink>
          <AppLink
            to={businessPaths.support}
            className={section === "support" ? "active" : ""}
          >
            <HeadsetIcon className="nav-icon" weight="duotone" /> Help and support
          </AppLink>
          <AppLink
            to={businessPaths.settings}
            className={section === "settings" ? "active" : ""}
          >
            <GearSixIcon className="nav-icon" weight="duotone" /> Settings
          </AppLink>
          {isAdmin && (
            <AppLink
              to={adminPaths.claims}
              className={isAdminRoute ? "active" : ""}
            >
              <ShieldCheckIcon className="nav-icon" weight="duotone" /> Admin{" "}
              <small className="nav-count">{claims.length}</small>
            </AppLink>
          )}
        </nav>
        <div className="aside-footer">
          <p>Official posts stay mobile</p>
          <small>
            Use the FindEat app to create and publish official content.
          </small>
          <button onClick={onLogout}>Sign out</button>
          <small className="web-version">Web v{WEB_VERSION}</small>
        </div>
      </aside>
      <main className="content">
        <header>
          <div className="desktop-header-restaurant-summary">
            <strong>{restaurant.name}</strong>
            <span className="claimed">
              {restaurant.accessRole === "ADMIN"
                ? "Admin access"
                : restaurant.status === "CLAIMED"
                  ? "Claimed"
                  : "Unclaimed"}
            </span>
          </div>
          <div className="mobile-header-restaurant-selector">
            <RestaurantSwitcher
              restaurant={restaurant}
              restaurants={restaurants}
              onSelect={selectRestaurant}
            />
          </div>
          <div className="top-actions">
            <div className="notifications-menu">
              <button
                className={`notifications-trigger ${notificationsOpen ? "active" : ""}`}
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
            <div className="account-summary">
              <div>
                <strong>{account.username}</strong>
              </div>
              <AccountAvatar account={account} />
            </div>
          </div>
        </header>
        {(section === "overview" || visitedSections.has("overview")) && (
          <div
            className="dashboard-page-slot"
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
            className="dashboard-page-slot"
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
          <div className="dashboard-page-slot" hidden={section !== "menu"}>
            <MenuPage
              key={restaurant.id}
              menus={menus}
              restaurantId={restaurant.id}
              reload={load}
            />
          </div>
        )}
        {(section === "reviews" || visitedSections.has("reviews")) && (
          <div className="dashboard-page-slot" hidden={section !== "reviews"}>
            <ReviewsPage reviews={reviews} />
          </div>
        )}
        {(section === "messages" || visitedSections.has("messages")) && (
          <div
            className="dashboard-page-slot messages-page-slot"
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
          <div className="dashboard-page-slot" hidden={section !== "profile"}>
            <ProfilePage
              key={restaurant.id}
              restaurant={restaurant}
              onSaved={load}
            />
          </div>
        )}
        {(section === "support" || visitedSections.has("support")) && (
          <div className="dashboard-page-slot" hidden={section !== "support"}>
            <OwnerSupportPage key={restaurant.id} restaurant={restaurant} />
          </div>
        )}
        {(section === "settings" || visitedSections.has("settings")) && (
          <div className="dashboard-page-slot" hidden={section !== "settings"}>
            <SettingsPage />
          </div>
        )}
      </main>
    </div>
  );
}

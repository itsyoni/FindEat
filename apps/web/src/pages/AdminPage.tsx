import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { SealCheckIcon } from "@phosphor-icons/react/dist/csr/SealCheck";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { HeadsetIcon } from "@phosphor-icons/react/dist/csr/Headset";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { MapPinLineIcon } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { MusicNotesIcon } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { LightbulbIcon } from "@phosphor-icons/react/dist/csr/Lightbulb";
import { BugIcon } from "@phosphor-icons/react/dist/csr/Bug";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { GaugeIcon } from "@phosphor-icons/react/dist/csr/Gauge";
import { BellIcon } from "@phosphor-icons/react/dist/csr/Bell";
import { BroadcastIcon } from "@phosphor-icons/react/dist/csr/Broadcast";
import { ToolboxIcon } from "@phosphor-icons/react/dist/csr/Toolbox";
import { TrayIcon } from "@phosphor-icons/react/dist/csr/Tray";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import type {
  AdminActivityItem,
  AdminDashboardSection,
  AdminUser,
  BusinessAccount,
  RestaurantClaim,
} from "@findeat/types";
import { AccountAvatar } from "../components/AccountAvatar";
import { RestaurantOwnershipManager } from "../components/RestaurantOwnershipManager";
import { SupportTicketsPanel } from "../components/SupportTicketsPanel";
import { ProductUpdatesAdmin } from "../components/ProductUpdatesAdmin";
import { SettingsPage } from "./SettingsPage";
import { WEB_VERSION } from "../lib/version";
import { UserIdentity } from "../components/UserIdentity";
import { ModerationPanel } from "../components/ModerationPanel";
import { AddressChangeRequestsPanel } from "../components/AddressChangeRequestsPanel";
import { SoundCatalogAdmin } from "../components/SoundCatalogAdmin";
import { AdminOverviewPage } from "../components/AdminOverviewPage";
import { AdminNotificationsPopover } from "../components/AdminNotificationsPopover";
import { SidebarNavGroup } from "../components/SidebarNavGroup";
import { request } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";
import {
  SHARED_SIDEBAR_WIDTH_STORAGE_KEY,
  useResizableSidebar,
} from "../hooks/useResizableSidebar";
import { WorkspaceSwitcher } from "../components/WorkspaceSwitcher";

type AdminSidebarGroup = "platform" | "feedback" | "content";

function adminSidebarGroupForSection(
  section: AdminDashboardSection,
): AdminSidebarGroup | null {
  if (["claims", "addresses", "moderation", "ownership"].includes(section)) {
    return "platform";
  }
  if (["support", "bugs", "features"].includes(section)) return "feedback";
  if (["updates", "sounds"].includes(section)) return "content";
  return null;
}

export function AdminPage({
  claims,
  admins,
  account,
  reload,
  onLogout,
  section,
  onNavigate,
  onBackToBusiness,
}: {
  claims: RestaurantClaim[];
  admins: AdminUser[];
  account: BusinessAccount;
  reload: () => Promise<void>;
  onLogout: () => void;
  section: AdminDashboardSection;
  onNavigate: (section: AdminDashboardSection) => void;
  onBackToBusiness?: () => void;
}) {
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const {
    sidebarRef,
    open: desktopSidebarOpen,
    setOpen: setDesktopSidebarOpen,
    startResize: startSidebarResize,
  } = useResizableSidebar(SHARED_SIDEBAR_WIDTH_STORAGE_KEY);
  const [openSidebarGroup, setOpenSidebarGroup] =
    useState<AdminSidebarGroup | null>(() =>
      adminSidebarGroupForSection(section),
    );
  const [adminActivity, setAdminActivity] = useState<AdminActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [visitedSections, setVisitedSections] = useState<
    Set<AdminDashboardSection>
  >(() => new Set([section]));

  useEffect(() => {
    // Preserve loaded admin panels when moving between sections.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedSections((current) => {
      if (current.has(section)) return current;
      return new Set([...current, section]);
    });
  }, [section]);

  useEffect(() => {
    // Keep accordion state synchronized with direct links and browser navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenSidebarGroup(adminSidebarGroupForSection(section));
  }, [section]);

  const loadAdminActivity = useCallback(async () => {
    try {
      const items = await request<AdminActivityItem[]>("/admin/activity", {
        cache: "reload",
      });
      setAdminActivity(items);
      const lastSeen = localStorage.getItem(
        `findeat-admin-activity-seen:${account.id}`,
      );
      const lastSeenAt = lastSeen ? new Date(lastSeen).getTime() : 0;
      setActivityUnreadCount(
        items.filter((item) => new Date(item.createdAt).getTime() > lastSeenAt)
          .length,
      );
    } catch (nextError) {
      console.error("Could not load admin notifications", nextError);
    } finally {
      setActivityLoading(false);
    }
  }, [account.id]);

  useEffect(() => {
    // Admin activity is loaded from the server and then kept fresh by polling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAdminActivity();
    const interval = window.setInterval(() => void loadAdminActivity(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadAdminActivity]);

  function toggleAdminNotifications() {
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }
    localStorage.setItem(
      `findeat-admin-activity-seen:${account.id}`,
      new Date().toISOString(),
    );
    setActivityUnreadCount(0);
    setNotificationsOpen(true);
    void loadAdminActivity();
  }

  async function decide(claimId: string, decision: "approve" | "reject") {
    if (
      decision === "reject" &&
      !(await confirmAction({
        title: "Reject this restaurant claim?",
        message:
          "The claimant will be notified that their request was rejected.",
        confirmLabel: "Reject claim",
        tone: "warning",
      }))
    )
      return;
    setWorkingId(claimId);
    setError("");
    try {
      await request(`/restaurants/claims/${claimId}/${decision}`, {
        method: "POST",
        body:
          decision === "reject"
            ? JSON.stringify({ reason: "Rejected by admin" })
            : undefined,
      });
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : `Could not ${decision} claim`,
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function searchUsers(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least 2 characters to search users.");
      return;
    }
    setSearching(true);
    setSearched(true);
    setError("");
    try {
      setResults(
        await request<AdminUser[]>(
          `/admin/users?q=${encodeURIComponent(query.trim())}`,
        ),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not search users",
      );
    } finally {
      setSearching(false);
    }
  }

  async function grantAdmin(user: AdminUser) {
    setWorkingId(user.id);
    setError("");
    try {
      await request(`/admin/admins/${user.id}`, { method: "POST" });
      setResults((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, isAdmin: true } : item,
        ),
      );
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not add admin",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function revokeAdmin(user: AdminUser) {
    if (confirmRemoveId !== user.id) {
      setConfirmRemoveId(user.id);
      return;
    }
    setWorkingId(user.id);
    setError("");
    try {
      await request(`/admin/admins/${user.id}`, { method: "DELETE" });
      setConfirmRemoveId(null);
      setResults((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, isAdmin: false } : item,
        ),
      );
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not remove admin",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="dashboard h-screen min-h-0 grid grid-cols-[260px_minmax(0,_1fr)] overflow-hidden bg-page text-ink max-[800px]:h-dvh max-[800px]:grid-cols-1 max-[800px]:grid-rows-[auto_minmax(0,_1fr)] max-[800px]:overflow-hidden max-[800px]:[&>aside]:[position:relative] max-[800px]:[&>aside]:[z-index:30] max-[800px]:[&>aside]:[display:block] max-[800px]:[&>aside]:[width:100%] max-[800px]:[&>aside]:[height:auto] max-[800px]:[&>aside]:[min-width:0] max-[800px]:[&>aside]:[padding:10px_12px] max-[800px]:[&>aside]:[border-right:0] max-[800px]:[&>aside]:[border-bottom:1px_solid_var(--line)] max-[800px]:[&>aside]:[box-shadow:0_5px_20px_color-mix(in_srgb,_var(--ink)_6%,_transparent)] max-[800px]:[&>aside_.restaurant-switcher]:[width:100%] max-[800px]:[&>aside_.restaurant-chip]:[min-height:52px] max-[800px]:[&>aside_.restaurant-chip]:[margin:0] max-[800px]:[&>aside_.restaurant-chip]:[padding:7px_10px] max-[800px]:[&>aside_.restaurant-chip]:[border-color:var(--line)] max-[800px]:[&>aside_.restaurant-chip]:[background:var(--surface-subtle)] max-[800px]:[&>aside_.restaurant-chip_img]:[width:36px] max-[800px]:[&>aside_.restaurant-chip_img]:[height:36px] max-[800px]:[&>aside_.restaurant-chip_img]:[flex-basis:36px] max-[800px]:[&>aside_.restaurant-chip>span]:[width:36px] max-[800px]:[&>aside_.restaurant-chip>span]:[height:36px] max-[800px]:[&>aside_.restaurant-chip>span]:[flex-basis:36px] max-[800px]:[&>aside_nav]:[display:none] max-[800px]:[&>aside_nav]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[800px]:[&>aside_nav]:[gap:5px] max-[800px]:[&>aside_nav]:[width:100%] max-[800px]:[&>aside_nav]:[margin:10px_0_0] max-[800px]:[&>aside_nav]:[padding:9px_0_0] max-[800px]:[&>aside_nav]:[overflow:visible] max-[800px]:[&>aside_nav]:[border-top:1px_solid_var(--line)] max-[800px]:[&>aside.mobile-nav-open_nav]:[display:grid] max-[800px]:[&>aside_nav_a]:[justify-content:flex-start] max-[800px]:[&>aside_nav_a]:[width:100%] max-[800px]:[&>aside_nav_a]:[min-width:0] max-[800px]:[&>aside_nav_a]:[min-height:42px] max-[800px]:[&>aside_nav_a]:[gap:7px] max-[800px]:[&>aside_nav_a]:[padding:9px_11px] max-[800px]:[&>aside_nav_a]:[border:1px_solid_transparent] max-[800px]:[&>aside_nav_a]:[border-radius:11px] max-[800px]:[&>aside_nav_a]:[font-size:11px] max-[800px]:[&>aside_nav_a]:[white-space:normal] max-[800px]:[&>aside_nav_button]:[justify-content:flex-start] max-[800px]:[&>aside_nav_button]:[width:100%] max-[800px]:[&>aside_nav_button]:[min-width:0] max-[800px]:[&>aside_nav_button]:[min-height:42px] max-[800px]:[&>aside_nav_button]:[gap:7px] max-[800px]:[&>aside_nav_button]:[padding:9px_11px] max-[800px]:[&>aside_nav_button]:[border:1px_solid_transparent] max-[800px]:[&>aside_nav_button]:[border-radius:11px] max-[800px]:[&>aside_nav_button]:[font-size:11px] max-[800px]:[&>aside_nav_button]:[white-space:normal] max-[800px]:[&>aside_nav_a.active]:[border-color:var(--line)] max-[800px]:[&>aside_nav_button.active]:[border-color:var(--line)] max-[800px]:[&>aside_nav_.nav-icon]:[width:17px] max-[800px]:[&>aside_nav_.nav-icon]:[height:17px] max-[800px]:[&>aside_nav_.nav-icon]:[flex-basis:17px] max-[800px]:[&>aside_.nav-count]:[margin-left:1px] max-[380px]:[&>aside_nav]:[grid-template-columns:1fr] max-[380px]:[&>aside_nav_a]:[padding-inline:9px] max-[380px]:[&>aside_nav_button]:[padding-inline:9px] admin-dashboard max-[800px]:[&_nav]:[grid-template-columns:repeat(auto-fit,minmax(100px,1fr))]">
      <aside ref={sidebarRef} className={`sticky top-0 flex h-screen flex-col overflow-hidden border-r border-[#ffffff1f] bg-[#24211f] px-4.5 py-6.25 text-[#faf9f6] transition-[padding] duration-200 ease-out max-[800px]:static max-[800px]:h-auto max-[800px]:overflow-visible max-[800px]:p-3.5 ${desktopSidebarOpen ? "" : "min-[801px]:px-2 min-[801px]:[&_.brand]:hidden min-[801px]:[&_nav]:pt-12 min-[801px]:[&_nav_button]:justify-center min-[801px]:[&_nav_button]:gap-0 min-[801px]:[&_nav_button]:text-[0px] min-[801px]:[&_.nav-count]:hidden min-[801px]:[&_[data-sidebar-group-label]]:hidden min-[801px]:[&_[data-sidebar-group-caret]]:hidden min-[801px]:[&_[data-sidebar-group-content]]:hidden min-[801px]:[&_[data-sidebar-group]>button]:justify-center min-[801px]:[&_.aside-footer]:px-0 min-[801px]:[&_.sidebar-account]:flex min-[801px]:[&_.sidebar-account]:justify-center min-[801px]:[&_.sidebar-account>div]:hidden min-[801px]:[&_.sidebar-account>button]:hidden min-[801px]:[&_.web-version]:hidden"} ${mobileNavOpen ? "mobile-nav-open max-[800px]:fixed! max-[800px]:inset-0! max-[800px]:z-100! max-[800px]:h-dvh! max-[800px]:overflow-y-auto! max-[800px]:border-0! max-[800px]:bg-[#24211fe6]! max-[800px]:backdrop-blur-xl max-[800px]:shadow-none!" : "max-[800px]:[&_.workspace-switcher]:hidden"}`}>
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
            <small>Admin workspace</small>
          </div>
        </div>
        <div className="mobile-nav-bar [display:contents] max-[800px]:[display:flex] max-[800px]:[align-items:center] max-[800px]:[gap:9px] max-[800px]:[min-width:0] admin-mobile-nav-bar">
          <div className="mobile-nav-title [display:none] max-[800px]:[display:flex] max-[800px]:[align-items:center] max-[800px]:[min-width:0] max-[800px]:[flex:1] max-[800px]:[gap:10px] max-[800px]:[padding:5px_3px] max-[800px]:[&>svg]:[flex:0_0_auto] max-[800px]:[&>svg]:[color:var(--accent)] max-[800px]:[&>div]:[min-width:0] max-[800px]:[&_strong]:[display:block] max-[800px]:[&_strong]:[overflow:hidden] max-[800px]:[&_strong]:[text-overflow:ellipsis] max-[800px]:[&_strong]:[white-space:nowrap] max-[800px]:[&_small]:[display:block] max-[800px]:[&_small]:[overflow:hidden] max-[800px]:[&_small]:[text-overflow:ellipsis] max-[800px]:[&_small]:[white-space:nowrap] max-[800px]:[&_strong]:[font-size:13px] max-[800px]:[&_small]:[margin-top:2px] max-[800px]:[&_small]:[color:var(--muted)] max-[800px]:[&_small]:[font-size:10px]">
            <ShieldCheckIcon size={20} weight="duotone" aria-hidden="true" />
            <div>
              <strong>Admin workspace</strong>
              <small>FindEat administration</small>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-toggle hidden place-items-center border-0 bg-transparent p-0 text-[#faf9f6] max-[800px]:grid max-[800px]:size-11 max-[800px]:shrink-0 max-[800px]:rounded-xl max-[800px]:focus-visible:outline-2 max-[800px]:focus-visible:outline-offset-2 max-[800px]:focus-visible:outline-accent"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-navigation"
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            {mobileNavOpen ? (
              <XIcon size={21} weight="bold" aria-hidden="true" />
            ) : (
              <ListIcon size={23} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
        {onBackToBusiness && (
          <WorkspaceSwitcher
            active="admin"
            adminCount={claims.length}
            collapsed={!desktopSidebarOpen}
            onBusiness={() => {
              setMobileNavOpen(false);
              onBackToBusiness();
            }}
            onAdmin={() => undefined}
          />
        )}
        <nav className="mt-6.25 grid gap-1.25 [&>button]:flex [&>button]:min-h-11 [&>button]:w-full [&>button]:items-center [&>button]:gap-3.25 [&>button]:rounded-xl [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-3 [&>button]:text-left [&>button]:text-sm [&>button]:font-normal [&>button]:text-[#555] [&>button]:transition [&>button:focus-visible]:outline-2 [&>button:focus-visible]:outline-offset-2 [&>button:focus-visible]:outline-accent [@media(hover:hover)]:[&>button:hover]:translate-x-0.75 [@media(hover:hover)]:[&>button:hover]:bg-surface-hover [@media(hover:hover)]:[&>button:hover]:text-ink max-[800px]:m-0 max-[800px]:grid-cols-4 max-[800px]:[&>button]:justify-center max-[800px]:[&>button]:text-xs" id="admin-navigation" onClick={() => setMobileNavOpen(false)}>
          <button
            className={section === "overview" ? "active overflow-hidden! text-ellipsis! whitespace-nowrap! bg-[#ffffff22]! font-bold! tracking-[-0.012em]! text-[#faf9f6]!" : "overflow-hidden! text-ellipsis! whitespace-nowrap! text-[#faf9f6]!"}
            onClick={() => {
              onNavigate("overview");
              setError("");
            }}
          >
            <GaugeIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Dashboard
          </button>
          <SidebarNavGroup
            id="admin-platform-management"
            label="Platform management"
            icon={<ToolboxIcon size={20} weight="duotone" />}
            active={["claims", "addresses", "moderation", "ownership"].includes(section)}
            open={openSidebarGroup === "platform"}
            onOpenChange={(open) =>
              setOpenSidebarGroup(open ? "platform" : null)
            }
          >
          <button
            className={section === "claims" ? "active" : ""}
            onClick={() => {
              onNavigate("claims");
              setError("");
            }}
          >
            <SealCheckIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Restaurant
            claims <small className="nav-count [margin-left:auto] [min-width:22px] [padding:3px_6px] [border-radius:20px] [background:#ffe4da] [color:#a6382a] [text-align:center] [font-size:10px] [font-weight:900] [&.neutral]:[background:#ebe9e5] [&.neutral]:[color:#555] [&.neutral]:[background:var(--neutral-chip)] [&.neutral]:[color:var(--neutral-chip-text)] [background:var(--accent-soft)] [color:var(--accent-dark)]">{claims.length}</small>
          </button>
          <button
            className={section === "addresses" ? "active" : ""}
            onClick={() => {
              onNavigate("addresses");
              setError("");
            }}
          >
            <MapPinLineIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Address
            requests
          </button>
          <button
            className={section === "moderation" ? "active" : ""}
            onClick={() => {
              onNavigate("moderation");
              setError("");
            }}
          >
            <FlagIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Moderation
          </button>
          <button
            className={section === "ownership" ? "active" : ""}
            onClick={() => {
              onNavigate("ownership");
              setError("");
            }}
          >
            <StorefrontIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Ownership
          </button>
          </SidebarNavGroup>
          <SidebarNavGroup
            id="admin-feedback-inbox"
            label="Feedback inbox"
            icon={<TrayIcon size={20} weight="duotone" />}
            active={["support", "bugs", "features"].includes(section)}
            open={openSidebarGroup === "feedback"}
            onOpenChange={(open) =>
              setOpenSidebarGroup(open ? "feedback" : null)
            }
          >
          <button
            className={section === "support" ? "active" : ""}
            onClick={() => {
              onNavigate("support");
              setError("");
            }}
          >
            <HeadsetIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Support
          </button>
          <button
            className={section === "bugs" ? "active" : ""}
            onClick={() => {
              onNavigate("bugs");
              setError("");
            }}
          >
            <BugIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Bug reports
          </button>
          <button
            className={section === "features" ? "active" : ""}
            onClick={() => {
              onNavigate("features");
              setError("");
            }}
          >
            <LightbulbIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Feature
            suggestions
          </button>
          </SidebarNavGroup>
          <SidebarNavGroup
            id="admin-content-tools"
            label="Content tools"
            icon={<BroadcastIcon size={20} weight="duotone" />}
            active={["updates", "sounds"].includes(section)}
            open={openSidebarGroup === "content"}
            onOpenChange={(open) =>
              setOpenSidebarGroup(open ? "content" : null)
            }
          >
          <button
            className={section === "updates" ? "active" : ""}
            onClick={() => {
              onNavigate("updates");
              setError("");
            }}
          >
            <SparkleIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> What’s new
          </button>
          <button
            className={section === "sounds" ? "active" : ""}
            onClick={() => {
              onNavigate("sounds");
              setError("");
            }}
          >
            <MusicNotesIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Sounds
          </button>
          </SidebarNavGroup>
          <button
            className={section === "admins" ? "active overflow-hidden! text-ellipsis! whitespace-nowrap! bg-[#ffffff22]! font-bold! tracking-[-0.012em]! text-[#faf9f6]!" : "overflow-hidden! text-ellipsis! whitespace-nowrap! text-[#faf9f6]!"}
            onClick={() => {
              onNavigate("admins");
              setError("");
            }}
          >
            <UsersThreeIcon className="nav-icon [nav_button_&]:[width:20px] [nav_button_&]:[height:20px] [nav_button_&]:[flex:0_0_20px] [nav_button_&]:[display:block] [nav_button_&]:[transition:transform_.16s_ease] [nav_a_&]:[width:20px] [nav_a_&]:[height:20px] [nav_a_&]:[flex:0_0_20px] [nav_a_&]:[display:block] [nav_a_&]:[transition:transform_.16s_ease] [#business-navigation_button_&]:[width:20px] [#business-navigation_button_&]:[height:20px] [#business-navigation_button_&]:[flex-basis:20px] [#business-navigation_a_&]:[width:20px] [#business-navigation_a_&]:[height:20px] [#business-navigation_a_&]:[flex-basis:20px] [#admin-navigation_button_&]:[width:20px] [#admin-navigation_button_&]:[height:20px] [#admin-navigation_button_&]:[flex-basis:20px] [#admin-navigation_a_&]:[width:20px] [#admin-navigation_a_&]:[height:20px] [#admin-navigation_a_&]:[flex-basis:20px] [@media_(hover:hover)]:[nav_button:hover_&]:[transform:scale(1.08)] [@media_(hover:hover)]:[nav_a:hover_&]:[transform:scale(1.08)]" weight="duotone" /> Admins{" "}
            <small className="nav-count [margin-left:auto] [min-width:22px] [padding:3px_6px] [border-radius:20px] [background:#ffe4da] [color:#a6382a] [text-align:center] [font-size:10px] [font-weight:900] [&.neutral]:[background:#ebe9e5] [&.neutral]:[color:#555] [&.neutral]:[background:var(--neutral-chip)] [&.neutral]:[color:var(--neutral-chip-text)] [background:var(--accent-soft)] [color:var(--accent-dark)] neutral">{admins.length}</small>
          </button>
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
          <div>
            <strong>Admin workspace</strong>
            <span className="admin-badge [padding:4px_9px] [border-radius:20px] [background:#f2e8ff] [color:#7040a0] [font-size:11px] [font-weight:800] [background:var(--purple-soft)] [color:var(--purple)] max-[600px]:[max-width:30vw] max-[600px]:[overflow:hidden] max-[600px]:[text-overflow:ellipsis] max-[600px]:[white-space:nowrap] max-[380px]:[font-size:9px]">Admin</span>
          </div>
          <div className="top-actions [display:flex] [align-items:center] [gap:14px] max-[800px]:[min-width:0] max-[800px]:[flex:0_0_auto] max-[800px]:[justify-content:flex-end] max-[800px]:[gap:9px]">
            <div className="notifications-menu [position:relative]">
              <button
                className={`notifications-trigger [position:relative] [display:grid] [place-items:center] [width:42px] [height:42px] [padding:0] [border:1px_solid_var(--line)] [border-radius:50%] [background:var(--surface)] [color:var(--ink)] [&:hover]:[border-color:#d8c9bb] [&:hover]:[background:#faf8f5] [&.active]:[border-color:#d8c9bb] [&.active]:[background:#faf8f5] [&>svg]:[width:21px] [&>svg]:[height:21px] [&>svg]:[display:block] [&>b]:[position:absolute] [&>b]:[right:-5px] [&>b]:[top:-5px] [&>b]:[display:grid] [&>b]:[place-items:center] [&>b]:[min-width:19px] [&>b]:[height:19px] [&>b]:[padding:0_5px] [&>b]:[border:2px_solid_#faf9f6] [&>b]:[border-radius:10px] [&>b]:[background:var(--accent)] [&>b]:[color:#faf9f6] [&>b]:[font-size:9px] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] [&.active]:[border-color:var(--line)] [&.active]:[background:var(--surface-hover)] dark:[&>b]:[border-color:var(--surface)] max-[800px]:[width:38px] max-[800px]:[height:38px] ${notificationsOpen ? "active" : ""}`}
                type="button"
                aria-label="Open admin notifications"
                aria-expanded={notificationsOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleAdminNotifications();
                }}
              >
                <BellIcon size={21} weight="duotone" aria-hidden="true" />
                {activityUnreadCount > 0 ? (
                  <b>
                    {activityUnreadCount > 99 ? "99+" : activityUnreadCount}
                  </b>
                ) : null}
              </button>
              {notificationsOpen ? (
                <AdminNotificationsPopover
                  items={adminActivity}
                  loading={activityLoading}
                  onNavigate={onNavigate}
                  onClose={() => setNotificationsOpen(false)}
                />
              ) : null}
            </div>
            <button
              type="button"
              className={`notifications-trigger [position:relative] [display:grid] [place-items:center] [width:42px] [height:42px] [padding:0] [border:1px_solid_var(--line)] [border-radius:50%] [background:var(--surface)] [color:var(--ink)] [&:hover]:[border-color:#d8c9bb] [&:hover]:[background:#faf8f5] [&.active]:[border-color:#d8c9bb] [&.active]:[background:#faf8f5] [&>svg]:[width:21px] [&>svg]:[height:21px] [&>svg]:[display:block] [&>b]:[position:absolute] [&>b]:[right:-5px] [&>b]:[top:-5px] [&>b]:[display:grid] [&>b]:[place-items:center] [&>b]:[min-width:19px] [&>b]:[height:19px] [&>b]:[padding:0_5px] [&>b]:[border:2px_solid_#faf9f6] [&>b]:[border-radius:10px] [&>b]:[background:var(--accent)] [&>b]:[color:#faf9f6] [&>b]:[font-size:9px] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] [&.active]:[border-color:var(--line)] [&.active]:[background:var(--surface-hover)] dark:[&>b]:[border-color:var(--surface)] max-[800px]:[width:38px] max-[800px]:[height:38px] settings-trigger [text-decoration:none] ${section === "settings" ? "active" : ""}`}
              aria-label="Open settings"
              title="Settings"
              onClick={() => {
                setNotificationsOpen(false);
                onNavigate("settings");
              }}
            >
              <GearSixIcon size={21} weight="duotone" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div
          className={`admin-content [width:min(1120px,100%)] [margin:auto] [padding:48px_42px_75px] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px] [width:min(1120px,_100%)] [margin:auto] [padding:48px_42px_75px] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,_4vw,_22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px] ${section === "support" || section === "bugs" || section === "features" ? "flex h-full min-h-0 flex-col overflow-hidden pb-8 max-[800px]:py-[18px] max-[800px]:pt-[22px]" : ""}`}
        >
          {(section === "overview" || visitedSections.has("overview")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "overview"}>
              <AdminOverviewPage onNavigate={onNavigate} />
            </div>
          )}
          {(section === "addresses" || visitedSections.has("addresses")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "addresses"}>
              <AddressChangeRequestsPanel />
            </div>
          )}
          {(section === "moderation" || visitedSections.has("moderation")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "moderation"}>
              <ModerationPanel />
            </div>
          )}
          {(section === "ownership" || visitedSections.has("ownership")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "ownership"}>
              <RestaurantOwnershipManager />
            </div>
          )}
          {(section === "support" || visitedSections.has("support")) && (
            <div
              className={`min-h-0 flex-1 flex-col ${section === "support" ? "flex" : "hidden"}`}
            >
              <SupportTicketsPanel />
            </div>
          )}
          {(section === "bugs" || visitedSections.has("bugs")) && (
            <div
              className={`min-h-0 flex-1 flex-col ${section === "bugs" ? "flex" : "hidden"}`}
            >
              <SupportTicketsPanel mode="bugs" />
            </div>
          )}
          {(section === "features" || visitedSections.has("features")) && (
            <div
              className={`min-h-0 flex-1 flex-col ${section === "features" ? "flex" : "hidden"}`}
            >
              <SupportTicketsPanel mode="features" />
            </div>
          )}
          {(section === "updates" || visitedSections.has("updates")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "updates"}>
              <ProductUpdatesAdmin />
            </div>
          )}
          {(section === "sounds" || visitedSections.has("sounds")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "sounds"}>
              <SoundCatalogAdmin />
            </div>
          )}
          {(section === "settings" || visitedSections.has("settings")) && (
            <div className="admin-page-slot [&[hidden]]:[display:none]" hidden={section !== "settings"}>
              <SettingsPage />
            </div>
          )}
          {section === "claims" ? (
            <>
              <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
                <div>
                  <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">ADMINISTRATION</p>
                  <h2>Restaurant claims</h2>
                  <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
                    Review ownership requests before granting access to
                    restaurant management.
                  </p>
                </div>
                <span className="claim-count [padding:8px_12px] [border-radius:20px] [background:#fff0ea] [color:#bf4629] [font-size:13px] [font-weight:800] [background:var(--accent-soft)] [color:var(--accent-dark)]">{claims.length} pending</span>
              </div>
              {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
              {claims.length === 0 ? (
                <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
                  <CheckCircleIcon
                    size={30}
                    weight="duotone"
                    aria-hidden="true"
                  />
                  <h3>You’re all caught up</h3>
                  <p>There are no pending restaurant claims.</p>
                </div>
              ) : (
                <div className="claims-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:16px] max-[800px]:[grid-template-columns:1fr]">
                  {claims.map((claim) => (
                    <article className="claim-card [padding:24px] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] dark:[box-shadow:0_8px_28px_#0003] max-[800px]:[padding:19px]" key={claim.id}>
                      <div className="claim-top [display:flex] [align-items:center] [gap:13px] [&>img]:[width:48px] [&>img]:[height:48px] [&>img]:[flex:0_0_auto] [&>img]:[border-radius:14px] [&>img]:[object-fit:cover] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px]">
                        <div className="restaurant-letter [display:grid] [place-items:center] [flex:0_0_auto] [width:48px] [height:48px] [border-radius:14px] [background:#f3e8df] [font-size:20px] [font-weight:900] [background:var(--avatar-surface)]">
                          {claim.restaurant.name.charAt(0)}
                        </div>
                        <div>
                          <h3>{claim.restaurant.name}</h3>
                          <p>
                            {[claim.restaurant.address, claim.restaurant.city]
                              .filter(Boolean)
                              .join(", ") || "No address provided"}
                          </p>
                        </div>
                      </div>
                      <div className="claim-person [&_p]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [margin-top:20px] [padding:15px] [border-radius:13px] [background:var(--soft)] [&_span]:[display:block] [&_span]:[margin-bottom:6px] [&_span]:[color:var(--muted)] [&_span]:[font-size:11px] [&_span]:[font-weight:800] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:0.07em] [.address-review-card_&_.admin-user-identity]:[margin-top:8px]">
                        <span>Requested by</span>
                        <strong>{claim.user.username}</strong>
                        <p>{claim.user.email}</p>
                      </div>
                      {claim.evidenceText && (
                        <div className="claim-evidence [&_p]:[margin:0] [margin-top:20px] [padding:15px] [border-radius:13px] [background:var(--soft)] [&_span]:[display:block] [&_span]:[margin-bottom:6px] [&_span]:[color:var(--muted)] [&_span]:[font-size:11px] [&_span]:[font-weight:800] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:0.07em] [&_p]:[line-height:1.5]">
                          <span>Evidence</span>
                          <p>{claim.evidenceText}</p>
                        </div>
                      )}
                      {claim.evidenceUrl && (
                        <a
                          className="evidence-link [display:inline-block] [margin-top:15px] [color:var(--ink)] [font-weight:800] [font-size:13px]"
                          href={claim.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open attached evidence ↗
                        </a>
                      )}
                      <div className="claim-actions [display:grid] [grid-template-columns:1fr_1.5fr] [gap:9px] [margin-top:22px] [&_.reject]:[color:#a6382a] [&_.approve]:[background:var(--green)] [&_.reject]:[color:var(--danger)] max-[600px]:[grid-template-columns:1fr]">
                        <button
                          className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] reject"
                          disabled={workingId === claim.id}
                          onClick={() => void decide(claim.id, "reject")}
                        >
                          Reject
                        </button>
                        <button
                          className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))] approve"
                          disabled={workingId === claim.id}
                          onClick={() => void decide(claim.id, "approve")}
                        >
                          {workingId === claim.id
                            ? "Working…"
                            : "Approve claim"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : section === "admins" ? (
            <>
              <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
                <div>
                  <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">ACCESS CONTROL</p>
                  <h2>Admins</h2>
                  <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
                    Give trusted existing FindEat users access to this web
                    administration area.
                  </p>
                </div>
                <span className="admin-total [padding:8px_12px] [border-radius:20px] [background:#f0e9f8] [color:#68418b] [font-size:13px] [font-weight:800] [background:var(--purple-soft)] [color:var(--purple)]">
                  {admins.length} {admins.length === 1 ? "admin" : "admins"}
                </span>
              </div>
              {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
              <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] admin-search-card [padding:24px] [&>div:first-child_h3]:[margin:0] [&>div:first-child_p]:[margin:0] [&>div:first-child_p]:[margin-top:5px] [&>div:first-child_p]:[color:var(--muted)] [&>div:first-child_p]:[font-size:13px] [&_form]:[display:grid] [&_form]:[grid-template-columns:1fr_auto] [&_form]:[gap:10px] [&_form]:[margin-top:20px] max-[800px]:[&_form]:[grid-template-columns:1fr] max-[800px]:[padding:19px]">
                <div>
                  <h3>Add an admin</h3>
                  <p>Search by display name, username, or email address.</p>
                </div>
                <form onSubmit={searchUsers}>
                  <input
                    type="search"
                    placeholder="Search existing users…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={searching}>
                    {searching ? "Searching…" : "Search"}
                  </button>
                </form>
                {searched && (
                  <div className="admin-search-results [margin-top:18px] [border-top:1px_solid_var(--line)]">
                    {results.length === 0 && !searching ? (
                      <div className="inline-empty [padding:24px_5px_6px] [color:var(--muted)] [font-size:13px] [text-align:center]">
                        No users found. Try another name, username, or email.
                      </div>
                    ) : (
                      results.map((user) => (
                        <div className="admin-user-row [display:flex] [align-items:center] [justify-content:space-between] [gap:20px] [min-height:76px] [padding:13px_4px] [border-bottom:1px_solid_var(--line)] [&:last-child]:[border-bottom:0] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[600px]:[gap:12px]" key={user.id}>
                          <UserIdentity user={user} />
                          {user.isAdmin ? (
                            <span className="access-status [padding:6px_9px] [border-radius:9px] [background:var(--soft)] [color:var(--muted)] [font-size:11px] [font-weight:800] [white-space:nowrap]">Already admin</span>
                          ) : (
                            <button
                              className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]"
                              disabled={workingId === user.id}
                              onClick={() => void grantAdmin(user)}
                            >
                              {workingId === user.id ? "Adding…" : "Add admin"}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
              <section className="admin-list-section [margin-top:28px]">
                <div className="section-title [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:13px] [.owner-ticket-history_&]:[margin-bottom:2px] max-[800px]:[&>div]:[min-width:0]">
                  <div>
                    <h3>Current admins</h3>
                    <p>
                      People who can approve restaurant claims and manage admin
                      access.
                    </p>
                  </div>
                </div>
                <div className="admin-list [margin-top:15px] [padding:0_20px] [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] max-[600px]:[padding:0_14px]">
                  {admins.map((user) => (
                    <div className="admin-user-row [display:flex] [align-items:center] [justify-content:space-between] [gap:20px] [min-height:76px] [padding:13px_4px] [border-bottom:1px_solid_var(--line)] [&:last-child]:[border-bottom:0] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[600px]:[gap:12px]" key={user.id}>
                      <UserIdentity user={user} />
                      <div className="admin-row-actions [display:flex] [align-items:center] [justify-content:flex-end] [gap:7px] max-[800px]:[width:100%] max-[800px]:[justify-content:flex-start] max-[600px]:[flex-wrap:wrap]">
                        {user.isProtectedAdmin && (
                          <span className="primary-admin-label [padding:6px_9px] [border-radius:9px] [background:var(--soft)] [color:var(--muted)] [font-size:11px] [font-weight:800] [white-space:nowrap] [background:#f0e9f8] [color:#68418b] [background:var(--purple-soft)] [color:var(--purple)]">
                            Primary admin
                          </span>
                        )}
                        {user.isCurrentUser && !user.isProtectedAdmin && (
                          <span className="access-status [padding:6px_9px] [border-radius:9px] [background:var(--soft)] [color:var(--muted)] [font-size:11px] [font-weight:800] [white-space:nowrap]">You</span>
                        )}
                        {!user.isProtectedAdmin && !user.isCurrentUser && (
                          <button
                            className={
                              confirmRemoveId === user.id
                                ? "confirm-remove"
                                : "remove-admin"
                            }
                            disabled={workingId === user.id}
                            onClick={() => void revokeAdmin(user)}
                          >
                            {workingId === user.id
                              ? "Removing…"
                              : confirmRemoveId === user.id
                                ? "Click again to remove"
                                : "Remove"}
                          </button>
                        )}
                        {confirmRemoveId === user.id && (
                          <button
                            className="cancel-remove [border:0] [border-radius:9px] [padding:8px_10px] [background:transparent] [color:#a6382a] [font-size:11px] [font-weight:800] [white-space:nowrap] [color:var(--muted)] [color:var(--danger)]"
                            onClick={() => setConfirmRemoveId(null)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

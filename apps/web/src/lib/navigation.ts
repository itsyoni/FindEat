import { useSyncExternalStore } from "react";
import type {
  AdminDashboardSection,
  BusinessDashboardSection,
} from "@findeat/types";

export const businessPaths: Record<BusinessDashboardSection, string> = {
  overview: "/home",
  dashboard: "/dashboard",
  menu: "/menu",
  reviews: "/reviews",
  badges: "/badges",
  offers: "/offers",
  reservations: "/reservations",
  pro: "/business-pro",
  posts: "/official-posts",
  team: "/team",
  messages: "/messages",
  notifications: "/home",
  profile: "/restaurant-profile",
  support: "/support",
  settings: "/settings",
  admin: "/admin/claims",
};

export const adminPaths: Record<AdminDashboardSection, string> = {
  overview: "/admin",
  directory: "/admin/directory",
  claims: "/admin/claims",
  addresses: "/admin/address-requests",
  moderation: "/admin/moderation",
  ownership: "/admin/ownership",
  support: "/admin/support",
  bugs: "/admin/bugs",
  knownIssues: "/admin/known-issues",
  features: "/admin/features",
  updates: "/admin/whats-new",
  sounds: "/admin/sounds",
  admins: "/admin/admins",
  settings: "/admin/settings",
};

function normalizedPath(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function businessSectionFromPath(
  pathname: string,
): BusinessDashboardSection | null {
  const path = normalizedPath(pathname);
  const match = Object.entries(businessPaths).find(
    ([section, route]) => section !== "notifications" && route === path,
  );
  return (match?.[0] as BusinessDashboardSection | undefined) ?? null;
}

export function adminSectionFromPath(
  pathname: string,
): AdminDashboardSection | null {
  const path = normalizedPath(pathname);
  if (path === "/admin/feedback" || path === "/admin/known-issues") return "bugs";
  const match = Object.entries(adminPaths).find(([, route]) => route === path);
  return (match?.[0] as AdminDashboardSection | undefined) ?? null;
}

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function currentPathname() {
  return window.location.pathname;
}

export function usePathname() {
  return useSyncExternalStore(subscribe, currentPathname, () => "/");
}

export function navigateTo(path: string, replace = false) {
  const nextPath = normalizedPath(path);
  if (normalizedPath(window.location.pathname) === nextPath) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", nextPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

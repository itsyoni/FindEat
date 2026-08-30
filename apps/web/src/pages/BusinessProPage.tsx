import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CrownSimpleIcon } from "@phosphor-icons/react/dist/csr/CrownSimple";
import { GiftIcon } from "@phosphor-icons/react/dist/csr/Gift";
import { LightbulbIcon } from "@phosphor-icons/react/dist/csr/Lightbulb";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/csr/Megaphone";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import type {
  ManagedRestaurant,
  RestaurantBusinessProStatus,
} from "@findeat/types";
import { request } from "../lib/api";
import { businessPaths, navigateTo } from "../lib/navigation";

const readyFeatures = [
  {
    icon: ChartLineUpIcon,
    title: "Advanced restaurant analytics",
    detail:
      "Understand followers, visits, saves, rating movement, guest experience, popular dishes, content performance, and booking intent.",
    action: "Open analytics",
    path: businessPaths.dashboard,
  },
  {
    icon: CalendarCheckIcon,
    title: "Native reservation management",
    detail:
      "Accept FindEat bookings, manage tables and covers, record guest requests, confirm arrivals, and track cancellations or no-shows.",
    action: "Open reservations",
    path: businessPaths.reservations,
  },
  {
    icon: GiftIcon,
    title: "Targeted offers and rewards",
    detail:
      "Create limited offers for followers, returning guests, favorites, and people who saved your restaurant—then measure claims and savings.",
    action: "Open offers",
    path: businessPaths.offers,
  },
  {
    icon: MegaphoneIcon,
    title: "Official restaurant content",
    detail:
      "Publish restaurant-owned photo posts without attaching them to an employee’s personal profile, with clear publisher accountability in the business dashboard.",
    action: "Create a post",
    path: businessPaths.posts,
  },
  {
    icon: UsersThreeIcon,
    title: "Team roles and permissions",
    detail:
      "Invite FindEat users to the restaurant team, create custom roles, and decide who can manage menus, bookings, offers, content, messages, or analytics.",
    action: "Manage team",
    path: businessPaths.team,
  },
  {
    icon: StorefrontIcon,
    title: "A stronger restaurant presence",
    detail:
      "Keep menus, multiple service menus, booking, profile details, reviews, badges, messages, and community activity connected in one workspace.",
    action: "Manage profile",
    path: businessPaths.profile,
  },
];

const upcomingFeatures = [
  {
    title: "Your own restaurant club",
    detail:
      "Create a free or paid member club with exclusive benefits, birthday perks, member consent, and a restaurant-owned audience inside FindEat.",
  },
  {
    title: "Loyalty points and member wallets",
    detail:
      "Reward visits and purchases, adjust balances, redeem benefits, and give guests one clear place to see what they have earned.",
  },
  {
    title: "Paid memberships",
    detail:
      "Monthly, annual, and one-time restaurant-club plans with membership status, renewal dates, and benefits for paid members.",
  },
  {
    title: "Reservation automations",
    detail:
      "Guest reminders, confirmation requests, waitlists, cancellation recovery, and post-visit follow-ups tied to the reservation timeline.",
  },
  {
    title: "Deeper guest segments",
    detail:
      "Reach club members, frequent visitors, lapsed guests, high-intent diners, and other useful groups without exposing personal user data.",
  },
  {
    title: "Multi-location reporting",
    detail:
      "Compare branches, menus, reviews, campaigns, and reservations across a restaurant group from one business account.",
  },
];

export function BusinessProPage({ restaurant }: { restaurant?: ManagedRestaurant }) {
  const [status, setStatus] = useState<RestaurantBusinessProStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!restaurant) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setStatus(
        await request<RestaurantBusinessProStatus>(
          `/restaurants/${restaurant.id}/business-pro/status`,
          { cache: "reload" },
        ),
      );
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Business Pro");
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    // The request initializes this server-backed workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function requestUpgrade() {
    if (!restaurant) {
      navigateTo("/login");
      return;
    }
    if (restaurant.accessRole !== "OWNER" && restaurant.accessRole !== "ADMIN") {
      setMessage("Only the restaurant owner can request the plan upgrade.");
      return;
    }
    setRequesting(true);
    try {
      const next = await request<RestaurantBusinessProStatus>(
        `/restaurants/${restaurant.id}/business-pro/request-upgrade`,
        { method: "POST" },
      );
      setStatus(next);
      setMessage(
        next.hasProAccess
          ? "Business Pro is active for this restaurant."
          : "Upgrade request received. We’ll contact the restaurant owner with activation details.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request the upgrade");
    } finally {
      setRequesting(false);
    }
  }

  const requested = status?.status === "REQUESTED";
  const active = status?.hasProAccess === true;
  const openFeature = (path: string) =>
    navigateTo(restaurant ? path : "/login");

  return (
    <div className="page-stack mx-auto grid w-full max-w-7xl gap-8 px-5 py-7 pb-16">
      <section className="relative overflow-hidden rounded-[32px] border border-line bg-[radial-gradient(circle_at_82%_10%,rgba(255,184,77,.34),transparent_28%),radial-gradient(circle_at_16%_100%,rgba(255,114,85,.28),transparent_38%),var(--surface)] p-10 max-[700px]:p-6">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
            <CrownSimpleIcon size={15} weight="fill" /> FindEat Business Pro
          </div>
          <h1 className="mb-0 mt-6 text-5xl font-black leading-[1.02] tracking-[-.05em] text-ink max-[700px]:text-4xl">Turn your FindEat profile into an operating system for your restaurant.</h1>
          <p className="mb-0 mt-5 max-w-2xl text-lg leading-8 text-muted max-[700px]:text-base max-[700px]:leading-7">Know what guests want, bring them back, manage bookings, and give your team the tools to act—all without mixing the restaurant with anyone’s personal profile.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {active ? (
              <button className="flex min-h-12 items-center gap-2 rounded-xl border-0 bg-ink px-5 font-black text-surface" onClick={() => openFeature(businessPaths.dashboard)}><CheckCircleIcon size={19} weight="fill" /> Pro is active</button>
            ) : (
              <button disabled={requesting || requested || loading} className="flex min-h-12 items-center gap-2 rounded-xl border-0 bg-accent px-5 font-black text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-65" onClick={() => void requestUpgrade()}>{!restaurant ? "Sign in to upgrade" : requested ? "Upgrade requested" : requesting ? "Sending request…" : "Upgrade to Business Pro"}<ArrowRightIcon size={18} weight="bold" /></button>
            )}
            <span className="text-xs font-bold text-muted">No price is charged until your plan and billing are confirmed.</span>
          </div>
          {message ? <p className="mb-0 mt-4 rounded-xl bg-surface/75 px-4 py-3 text-sm font-bold text-ink backdrop-blur">{message}</p> : null}
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="m-0 text-xs font-black uppercase tracking-[.15em] text-emerald-600">Ready to use</p><h2 className="mb-0 mt-2 text-3xl font-black tracking-tight text-ink">Tools already built into FindEat</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">Available now</span></div>
        <div className="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-2 max-[650px]:grid-cols-1">
          {readyFeatures.map((feature) => {
            const Icon = feature.icon;
            return <article className="group flex min-h-72 flex-col rounded-3xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5" key={feature.title}><span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon size={25} weight="duotone" /></span><h3 className="mb-0 mt-5 text-xl font-black text-ink">{feature.title}</h3><p className="mb-0 mt-3 text-sm leading-6 text-muted">{feature.detail}</p><button className="mt-auto flex items-center gap-2 self-start border-0 bg-transparent p-0 pt-6 text-sm font-black text-accent" onClick={() => openFeature(feature.path)}>{restaurant ? feature.action : "Sign in to explore"}<ArrowRightIcon size={16} weight="bold" /></button></article>;
          })}
        </div>
      </section>

      <section className="rounded-[30px] border border-line bg-surface-subtle p-7 max-[650px]:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-accent"><LightbulbIcon size={20} weight="duotone" /><p className="m-0 text-xs font-black uppercase tracking-[.15em]">Coming to Pro</p></div><h2 className="mb-0 mt-2 text-3xl font-black tracking-tight text-ink">The next layer of restaurant growth</h2><p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-muted">These features have product and data foundations, but are not yet ready for restaurant use. They are shown as roadmap items, not current plan promises.</p></div><span className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-muted">In development</span></div>
        <div className="mt-6 grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">{upcomingFeatures.map((feature, index) => <article className="rounded-2xl border border-line bg-surface p-5" key={feature.title}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.12em] text-accent">Roadmap {String(index + 1).padStart(2, "0")}</span><span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[9px] font-black text-muted">PLANNED</span></div><h3 className="mb-0 mt-3 text-lg font-black text-ink">{feature.title}</h3><p className="mb-0 mt-2 text-sm leading-6 text-muted">{feature.detail}</p></article>)}</div>
      </section>

      <section className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-3xl bg-ink p-8 text-surface max-[700px]:grid-cols-1 max-[700px]:p-6"><div><h2 className="m-0 text-3xl font-black">Built for the restaurant—not a personal profile.</h2><p className="mb-0 mt-3 max-w-3xl text-sm leading-6 opacity-75">Restaurant posts, reservations, analytics, offers, teams, and future club members remain restaurant-owned. Staff use their FindEat identity for secure access, while all business activity stays separate and attributable in the management workspace.</p></div>{!active ? <button disabled={requesting || requested} className="min-h-12 whitespace-nowrap rounded-xl border-0 bg-accent px-5 font-black text-white disabled:opacity-60" onClick={() => void requestUpgrade()}>{requested ? "Request received" : "Request Business Pro"}</button> : <CrownSimpleIcon size={44} weight="fill" className="text-amber-300" />}</section>
    </div>
  );
}

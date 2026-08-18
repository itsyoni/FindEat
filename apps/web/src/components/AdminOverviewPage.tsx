import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { BellRingingIcon } from "@phosphor-icons/react/dist/csr/BellRinging";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { DatabaseIcon } from "@phosphor-icons/react/dist/csr/Database";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { PulseIcon } from "@phosphor-icons/react/dist/csr/Pulse";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { TrendDownIcon } from "@phosphor-icons/react/dist/csr/TrendDown";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import type {
  AdminDashboardOverview,
  AdminDashboardSection,
} from "@findeat/types";
import { request } from "../lib/api";

type Props = {
  onNavigate: (section: AdminDashboardSection) => void;
};

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function trend(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function AdminOverviewPage({ onNavigate }: Props) {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setOverview(
        await request<AdminDashboardOverview>("/admin/overview", {
          cache: "reload",
        }),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load app monitoring data",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // The monitoring request initializes this externally-backed view.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  if (loading && !overview) {
    return <div className="admin-monitor-loading">Loading app health…</div>;
  }

  if (!overview) {
    return (
      <div className="empty admin-monitor-empty">
        <PulseIcon size={34} weight="duotone" />
        <h2>Monitoring is unavailable</h2>
        <p>{error || "FindEat could not load the current app status."}</p>
        <button className="secondary" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  const userTrend = trend(overview.users.new7d, overview.users.previous7d);
  const postTrend = trend(
    overview.content.posts7d,
    overview.content.previousPosts7d,
  );
  const openQueueTotal = Object.values(overview.queues).reduce(
    (total, value) => total + value,
    0,
  );
  const queueItems: Array<{
    label: string;
    value: number;
    section: AdminDashboardSection;
  }> = [
    { label: "Restaurant claims", value: overview.queues.pendingClaims, section: "claims" },
    { label: "Address requests", value: overview.queues.pendingAddressChanges, section: "addresses" },
    { label: "Moderation reports", value: overview.queues.pendingReports, section: "moderation" },
    { label: "Moderation appeals", value: overview.queues.pendingAppeals, section: "moderation" },
    { label: "Support requests", value: overview.queues.openSupport, section: "support" },
    { label: "Bug reports", value: overview.queues.openBugs, section: "bugs" },
    { label: "Feature suggestions", value: overview.queues.openFeatures, section: "features" },
  ];

  return (
    <div className="admin-monitor-page">
      <div className="page-heading admin-monitor-heading">
        <div>
          <p className="eyebrow">APP MONITORING</p>
          <h2>FindEat at a glance</h2>
          <p className="muted">
            Product activity, platform health, and queues that need attention.
          </p>
        </div>
        <div className="admin-monitor-heading-actions">
          <span>
            Updated {new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(overview.generatedAt))}
          </span>
          <button
            className="secondary"
            type="button"
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            <ArrowClockwiseIcon size={17} weight="bold" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <p className="error banner">{error}</p> : null}

      <section className="admin-health-strip" aria-label="Platform health">
        <div className="admin-health-status">
          <span><CheckCircleIcon size={21} weight="fill" /></span>
          <div><strong>Operational</strong><small>Database responded in {overview.queryDurationMs} ms</small></div>
        </div>
        <div><DatabaseIcon size={20} weight="duotone" /><span><strong>{number(overview.health.activePushTokens)}</strong><small>Active push tokens</small></span></div>
        <div><BellRingingIcon size={20} weight="duotone" /><span><strong>{overview.health.pushDeliveryRate24h == null ? "—" : `${overview.health.pushDeliveryRate24h}%`}</strong><small>Push dispatch · 24h</small></span></div>
        <div><PulseIcon size={20} weight="duotone" /><span><strong>{number(overview.health.notifications24h)}</strong><small>Notifications · 24h</small></span></div>
      </section>

      <section className="admin-monitor-kpis">
        <article>
          <span className="admin-monitor-icon users"><UsersThreeIcon size={22} weight="duotone" /></span>
          <small>Users</small><strong>{number(overview.users.total)}</strong>
          <p>{number(overview.users.new7d)} joined in 7 days</p>
          <span className={`admin-monitor-trend ${userTrend < 0 ? "down" : "up"}`}>
            {userTrend < 0 ? <TrendDownIcon /> : <TrendUpIcon />}{Math.abs(userTrend)}% vs previous week
          </span>
        </article>
        <article>
          <span className="admin-monitor-icon content"><ForkKnifeIcon size={22} weight="duotone" /></span>
          <small>Published posts</small><strong>{number(overview.content.posts)}</strong>
          <p>{number(overview.content.posts7d)} created in 7 days</p>
          <span className={`admin-monitor-trend ${postTrend < 0 ? "down" : "up"}`}>
            {postTrend < 0 ? <TrendDownIcon /> : <TrendUpIcon />}{Math.abs(postTrend)}% vs previous week
          </span>
        </article>
        <article>
          <span className="admin-monitor-icon restaurants"><StorefrontIcon size={22} weight="duotone" /></span>
          <small>Restaurants</small><strong>{number(overview.restaurants.total)}</strong>
          <p>{number(overview.restaurants.claimed)} claimed · {percent(overview.restaurants.claimed, overview.restaurants.total)}%</p>
          <span className="admin-monitor-meta">{number(overview.restaurants.new7d)} added this week</span>
        </article>
        <article>
          <span className="admin-monitor-icon queues"><FlagIcon size={22} weight="duotone" /></span>
          <small>Needs attention</small><strong>{number(openQueueTotal)}</strong>
          <p>Open operational and moderation items</p>
          <span className="admin-monitor-meta">Across 7 queues</span>
        </article>
      </section>

      <div className="admin-monitor-grid">
        <section className="admin-monitor-card">
          <div className="admin-monitor-card-heading"><div><p className="eyebrow">AUDIENCE</p><h3>User health</h3></div><UsersThreeIcon size={24} weight="duotone" /></div>
          <div className="admin-monitor-metrics">
            <div><strong>{number(overview.users.active7d)}</strong><span>Active in 7 days</span></div>
            <div><strong>{number(overview.users.onlineNow)}</strong><span>Online now</span></div>
            <div><strong>{percent(overview.users.verified, overview.users.total)}%</strong><span>Email verified</span></div>
            <div><strong>{number(overview.users.new24h)}</strong><span>New in 24 hours</span></div>
            <div><strong>{number(overview.users.new30d)}</strong><span>New in 30 days</span></div>
            <div><strong>{number(overview.users.suspended)}</strong><span>Suspended</span></div>
          </div>
        </section>

        <section className="admin-monitor-card">
          <div className="admin-monitor-card-heading"><div><p className="eyebrow">ACTIVITY · 7 DAYS</p><h3>Community activity</h3></div><PulseIcon size={24} weight="duotone" /></div>
          <div className="admin-monitor-metrics">
            <div><strong>{number(overview.content.contentPosts)}</strong><span>Content posts total</span></div>
            <div><strong>{number(overview.content.reviews)}</strong><span>Reviews total</span></div>
            <div><strong>{number(overview.content.likes7d)}</strong><span>Likes</span></div>
            <div><strong>{number(overview.content.comments7d)}</strong><span>Comments</span></div>
            <div><strong>{number(overview.content.messages7d)}</strong><span>Messages</span></div>
            <div><strong>{number(overview.content.snaps7d)}</strong><span>Snaps</span></div>
          </div>
          <div className="admin-monitor-inline-note"><ChatCircleDotsIcon size={17} weight="duotone" /> {number(overview.content.posts24h)} posts in the last 24 hours · {number(overview.content.activeSnaps)} snaps live now</div>
        </section>

        <section className="admin-monitor-card admin-queue-card">
          <div className="admin-monitor-card-heading"><div><p className="eyebrow">ACTION CENTER</p><h3>Open queues</h3></div><FlagIcon size={24} weight="duotone" /></div>
          <div className="admin-queue-list">
            {queueItems.map((item) => (
              <button key={item.label} type="button" onClick={() => onNavigate(item.section)}>
                <span>{item.label}</span><strong>{number(item.value)}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-monitor-card">
          <div className="admin-monitor-card-heading"><div><p className="eyebrow">RESTAURANT DATA</p><h3>Coverage</h3></div><StorefrontIcon size={24} weight="duotone" /></div>
          <div className="admin-coverage-number"><strong>{percent(overview.restaurants.claimed, overview.restaurants.total)}%</strong><span>of restaurant profiles are claimed</span></div>
          <div className="admin-progress"><span style={{ width: `${percent(overview.restaurants.claimed, overview.restaurants.total)}%` }} /></div>
          <div className="admin-monitor-metrics compact">
            <div><strong>{number(overview.restaurants.claimed)}</strong><span>Claimed</span></div>
            <div><strong>{number(overview.restaurants.withoutOwner)}</strong><span>Without owner</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

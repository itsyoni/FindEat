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
    return <div className="admin-monitor-loading [display:grid] [place-items:center] [min-height:420px] [color:var(--muted)]">Loading app health…</div>;
  }

  if (!overview) {
    return (
      <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px] admin-monitor-empty [min-height:420px]">
        <PulseIcon size={34} weight="duotone" />
        <h2>Monitoring is unavailable</h2>
        <p>{error || "FindEat could not load the current app status."}</p>
        <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={() => void load()}>
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
    <div className="admin-monitor-page [width:min(1240px,100%)] [margin:auto]">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column] admin-monitor-heading [align-items:center] max-[700px]:[align-items:flex-start]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">APP MONITORING</p>
          <h2>FindEat at a glance</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Product activity, platform health, and queues that need attention.
          </p>
        </div>
        <div className="admin-monitor-heading-actions [display:flex] [align-items:center] [gap:12px] [&>span]:[color:var(--muted)] [&>span]:[font-size:11px] [&_button]:[display:flex] [&_button]:[align-items:center] [&_button]:[gap:7px] max-[700px]:[align-items:flex-start] max-[700px]:[flex-direction:column]">
          <span>
            Updated {new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(overview.generatedAt))}
          </span>
          <button
            className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
            type="button"
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            <ArrowClockwiseIcon size={17} weight="bold" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p> : null}

      <section className="admin-health-strip [display:grid] [grid-template-columns:1.35fr_repeat(3,1fr)] [overflow:hidden] [margin-bottom:18px] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:var(--shadow)] [&>div]:[display:flex] [&>div]:[align-items:center] [&>div]:[gap:11px] [&>div]:[min-width:0] [&>div]:[padding:17px_19px] [&>div]:[border-left:1px_solid_var(--line)] [&>div:first-child]:[border-left:0] [&_svg]:[flex:0_0_auto] [&_svg]:[color:var(--accent)] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:14px] [&_small]:[margin-top:3px] [&_small]:[overflow:hidden] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] max-[1050px]:[grid-template-columns:repeat(2,1fr)] max-[1050px]:[&>div:nth-child(3)]:[border-left:0] max-[1050px]:[&>div:nth-child(3)]:[border-top:1px_solid_var(--line)] max-[1050px]:[&>div:nth-child(4)]:[border-top:1px_solid_var(--line)] max-[480px]:[grid-template-columns:1fr] max-[480px]:[&>div]:[border-top:1px_solid_var(--line)] max-[480px]:[&>div]:[border-left:0] max-[480px]:[&>div:first-child]:[border-top:0]" aria-label="Platform health">
        <div className="admin-health-status [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[width:38px] [&>span]:[height:38px] [&>span]:[border-radius:12px] [&>span]:[background:var(--success-soft)] [&>span]:[color:var(--success)] [&>span_svg]:[color:inherit]">
          <span><CheckCircleIcon size={21} weight="fill" /></span>
          <div><strong>Operational</strong><small>Database responded in {overview.queryDurationMs} ms</small></div>
        </div>
        <div><DatabaseIcon size={20} weight="duotone" /><span><strong>{number(overview.health.activePushTokens)}</strong><small>Active push tokens</small></span></div>
        <div><BellRingingIcon size={20} weight="duotone" /><span><strong>{overview.health.pushDeliveryRate24h == null ? "—" : `${overview.health.pushDeliveryRate24h}%`}</strong><small>Push dispatch · 24h</small></span></div>
        <div><PulseIcon size={20} weight="duotone" /><span><strong>{number(overview.health.notifications24h)}</strong><small>Notifications · 24h</small></span></div>
      </section>

      <section className="admin-monitor-kpis [display:grid] [grid-template-columns:repeat(4,minmax(0,1fr))] [gap:14px] [&_article]:[border:1px_solid_var(--line)] [&_article]:[border-radius:20px] [&_article]:[background:var(--surface)] [&_article]:[box-shadow:var(--shadow)] [&_article]:[position:relative] [&_article]:[min-width:0] [&_article]:[padding:20px] [&_article>small]:[display:block] [&_article>strong]:[display:block] [&_article>p]:[display:block] [&_article>small]:[margin-top:21px] [&_article>small]:[color:var(--muted)] [&_article>small]:[font-size:11px] [&_article>small]:[font-weight:800] [&_article>strong]:[margin-top:6px] [&_article>strong]:[font-size:31px] [&_article>strong]:[letter-spacing:-.04em] [&_article>p]:[min-height:30px] [&_article>p]:[margin:5px_0_12px] [&_article>p]:[color:var(--muted)] [&_article>p]:[font-size:10px] [&_article>p]:[line-height:1.45] max-[1050px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[480px]:[grid-template-columns:1fr]">
        <article>
          <span className="admin-monitor-icon [position:absolute] [top:17px] [right:17px] [display:grid] [place-items:center] [width:38px] [height:38px] [border-radius:12px] [color:var(--accent)] [background:var(--accent-soft)] [&.users]:[color:var(--purple)] [&.users]:[background:var(--purple-soft)] [&.restaurants]:[color:var(--success)] [&.restaurants]:[background:var(--success-soft)] [&.queues]:[color:var(--warning)] [&.queues]:[background:var(--warning-soft)] users"><UsersThreeIcon size={22} weight="duotone" /></span>
          <small>Users</small><strong>{number(overview.users.total)}</strong>
          <p>{number(overview.users.new7d)} joined in 7 days</p>
          <span className={`admin-monitor-trend [display:flex] [align-items:center] [gap:4px] [color:var(--success)] [font-size:9px] [font-weight:800] [&.down]:[color:var(--danger)] [&_svg]:[width:13px] [&_svg]:[height:13px] ${userTrend < 0 ? "down" : "up"}`}>
            {userTrend < 0 ? <TrendDownIcon /> : <TrendUpIcon />}{Math.abs(userTrend)}% vs previous week
          </span>
        </article>
        <article>
          <span className="absolute top-[17px] right-[17px] grid size-[38px] shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><ForkKnifeIcon size={22} weight="duotone" /></span>
          <small>Published posts</small><strong>{number(overview.content.posts)}</strong>
          <p>{number(overview.content.posts7d)} created in 7 days</p>
          <span className={`admin-monitor-trend [display:flex] [align-items:center] [gap:4px] [color:var(--success)] [font-size:9px] [font-weight:800] [&.down]:[color:var(--danger)] [&_svg]:[width:13px] [&_svg]:[height:13px] ${postTrend < 0 ? "down" : "up"}`}>
            {postTrend < 0 ? <TrendDownIcon /> : <TrendUpIcon />}{Math.abs(postTrend)}% vs previous week
          </span>
        </article>
        <article>
          <span className="admin-monitor-icon [position:absolute] [top:17px] [right:17px] [display:grid] [place-items:center] [width:38px] [height:38px] [border-radius:12px] [color:var(--accent)] [background:var(--accent-soft)] [&.users]:[color:var(--purple)] [&.users]:[background:var(--purple-soft)] [&.restaurants]:[color:var(--success)] [&.restaurants]:[background:var(--success-soft)] [&.queues]:[color:var(--warning)] [&.queues]:[background:var(--warning-soft)] restaurants [.admin-monitor-icon&]:[color:var(--success)] [.admin-monitor-icon&]:[background:var(--success-soft)]"><StorefrontIcon size={22} weight="duotone" /></span>
          <small>Restaurants</small><strong>{number(overview.restaurants.total)}</strong>
          <p>{number(overview.restaurants.claimed)} claimed · {percent(overview.restaurants.claimed, overview.restaurants.total)}%</p>
          <span className="admin-monitor-meta [display:flex] [align-items:center] [gap:4px] [color:var(--success)] [font-size:9px] [font-weight:800] [color:var(--muted)]">{number(overview.restaurants.new7d)} added this week</span>
        </article>
        <article>
          <span className="admin-monitor-icon [position:absolute] [top:17px] [right:17px] [display:grid] [place-items:center] [width:38px] [height:38px] [border-radius:12px] [color:var(--accent)] [background:var(--accent-soft)] [&.users]:[color:var(--purple)] [&.users]:[background:var(--purple-soft)] [&.restaurants]:[color:var(--success)] [&.restaurants]:[background:var(--success-soft)] [&.queues]:[color:var(--warning)] [&.queues]:[background:var(--warning-soft)] queues [.admin-monitor-icon&]:[color:var(--warning)] [.admin-monitor-icon&]:[background:var(--warning-soft)]"><FlagIcon size={22} weight="duotone" /></span>
          <small>Needs attention</small><strong>{number(openQueueTotal)}</strong>
          <p>Open operational and moderation items</p>
          <span className="admin-monitor-meta [display:flex] [align-items:center] [gap:4px] [color:var(--success)] [font-size:9px] [font-weight:800] [color:var(--muted)]">Across 7 queues</span>
        </article>
      </section>

      <div className="admin-monitor-grid [display:grid] [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:14px] [margin-top:14px] max-[700px]:[grid-template-columns:1fr]">
        <section className="admin-monitor-card [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:var(--shadow)] [min-width:0] [padding:21px]">
          <div className="admin-monitor-card-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [margin-bottom:18px] [&_.eyebrow]:[margin:0_0_5px] [&_h3]:[margin:0] [&_h3]:[font-size:19px] [&>svg]:[color:var(--accent)]"><div><p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">AUDIENCE</p><h3>User health</h3></div><UsersThreeIcon size={24} weight="duotone" /></div>
          <div className="admin-monitor-metrics [display:grid] [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:9px] [&>div]:[min-width:0] [&>div]:[padding:13px] [&>div]:[border-radius:13px] [&>div]:[background:var(--surface-subtle)] [&_strong]:[display:block] [&_span]:[display:block] [&_strong]:[font-size:19px] [&_span]:[margin-top:4px] [&_span]:[overflow:hidden] [&_span]:[color:var(--muted)] [&_span]:[font-size:9px] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&.compact]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[700px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[480px]:[grid-template-columns:1fr_1fr]">
            <div><strong>{number(overview.users.active7d)}</strong><span>Active in 7 days</span></div>
            <div><strong>{number(overview.users.onlineNow)}</strong><span>Online now</span></div>
            <div><strong>{percent(overview.users.verified, overview.users.total)}%</strong><span>Email verified</span></div>
            <div><strong>{number(overview.users.new24h)}</strong><span>New in 24 hours</span></div>
            <div><strong>{number(overview.users.new30d)}</strong><span>New in 30 days</span></div>
            <div><strong>{number(overview.users.suspended)}</strong><span>Suspended</span></div>
          </div>
        </section>

        <section className="admin-monitor-card [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:var(--shadow)] [min-width:0] [padding:21px]">
          <div className="admin-monitor-card-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [margin-bottom:18px] [&_.eyebrow]:[margin:0_0_5px] [&_h3]:[margin:0] [&_h3]:[font-size:19px] [&>svg]:[color:var(--accent)]"><div><p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">ACTIVITY · 7 DAYS</p><h3>Community activity</h3></div><PulseIcon size={24} weight="duotone" /></div>
          <div className="admin-monitor-metrics [display:grid] [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:9px] [&>div]:[min-width:0] [&>div]:[padding:13px] [&>div]:[border-radius:13px] [&>div]:[background:var(--surface-subtle)] [&_strong]:[display:block] [&_span]:[display:block] [&_strong]:[font-size:19px] [&_span]:[margin-top:4px] [&_span]:[overflow:hidden] [&_span]:[color:var(--muted)] [&_span]:[font-size:9px] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&.compact]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[700px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[480px]:[grid-template-columns:1fr_1fr]">
            <div><strong>{number(overview.content.contentPosts)}</strong><span>Content posts total</span></div>
            <div><strong>{number(overview.content.reviews)}</strong><span>Reviews total</span></div>
            <div><strong>{number(overview.content.likes7d)}</strong><span>Likes</span></div>
            <div><strong>{number(overview.content.comments7d)}</strong><span>Comments</span></div>
            <div><strong>{number(overview.content.messages7d)}</strong><span>Messages</span></div>
            <div><strong>{number(overview.content.snaps7d)}</strong><span>Snaps</span></div>
          </div>
          <div className="admin-monitor-inline-note [display:flex] [align-items:center] [gap:7px] [margin-top:11px] [padding:10px_12px] [border-radius:12px] [background:var(--soft)] [color:var(--muted)] [font-size:10px]"><ChatCircleDotsIcon size={17} weight="duotone" /> {number(overview.content.posts24h)} posts in the last 24 hours · {number(overview.content.activeSnaps)} snaps live now</div>
        </section>

        <section className="admin-monitor-card [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:var(--shadow)] [min-width:0] [padding:21px] admin-queue-card">
          <div className="admin-monitor-card-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [margin-bottom:18px] [&_.eyebrow]:[margin:0_0_5px] [&_h3]:[margin:0] [&_h3]:[font-size:19px] [&>svg]:[color:var(--accent)]"><div><p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">ACTION CENTER</p><h3>Open queues</h3></div><FlagIcon size={24} weight="duotone" /></div>
          <div className="admin-queue-list [display:grid] [gap:7px] [&_button]:[display:flex] [&_button]:[align-items:center] [&_button]:[justify-content:space-between] [&_button]:[gap:16px] [&_button]:[width:100%] [&_button]:[padding:11px_13px] [&_button]:[border:0] [&_button]:[border-radius:11px] [&_button]:[background:var(--surface-subtle)] [&_button]:[color:var(--ink)] [&_button]:[text-align:left] [&_button:hover]:[background:var(--surface-hover)] [&_button_span]:[font-size:11px] [&_button_span]:[font-weight:750] [&_button_strong]:[display:grid] [&_button_strong]:[place-items:center] [&_button_strong]:[min-width:25px] [&_button_strong]:[height:25px] [&_button_strong]:[padding:0_7px] [&_button_strong]:[border-radius:999px] [&_button_strong]:[background:var(--accent-soft)] [&_button_strong]:[color:var(--accent-dark)] [&_button_strong]:[font-size:10px]">
            {queueItems.map((item) => (
              <button key={item.label} type="button" onClick={() => onNavigate(item.section)}>
                <span>{item.label}</span><strong>{number(item.value)}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-monitor-card [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:var(--shadow)] [min-width:0] [padding:21px]">
          <div className="admin-monitor-card-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [margin-bottom:18px] [&_.eyebrow]:[margin:0_0_5px] [&_h3]:[margin:0] [&_h3]:[font-size:19px] [&>svg]:[color:var(--accent)]"><div><p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">RESTAURANT DATA</p><h3>Coverage</h3></div><StorefrontIcon size={24} weight="duotone" /></div>
          <div className="admin-coverage-number [&_strong]:[display:block] [&_span]:[display:block] [&_strong]:[font-size:42px] [&_strong]:[letter-spacing:-.05em] [&_span]:[margin-top:3px] [&_span]:[color:var(--muted)] [&_span]:[font-size:11px]"><strong>{percent(overview.restaurants.claimed, overview.restaurants.total)}%</strong><span>of restaurant profiles are claimed</span></div>
          <div className="admin-progress [height:9px] [margin:18px_0] [overflow:hidden] [border-radius:999px] [background:var(--soft)] [&>span]:[display:block] [&>span]:[height:100%] [&>span]:[max-width:100%] [&>span]:[border-radius:inherit] [&>span]:[background:linear-gradient(90deg,var(--accent),var(--warning))]"><span style={{ width: `${percent(overview.restaurants.claimed, overview.restaurants.total)}%` }} /></div>
          <div className="admin-monitor-metrics [display:grid] [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:9px] [&>div]:[min-width:0] [&>div]:[padding:13px] [&>div]:[border-radius:13px] [&>div]:[background:var(--surface-subtle)] [&_strong]:[display:block] [&_span]:[display:block] [&_strong]:[font-size:19px] [&_span]:[margin-top:4px] [&_span]:[overflow:hidden] [&_span]:[color:var(--muted)] [&_span]:[font-size:9px] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&.compact]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[700px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[480px]:[grid-template-columns:1fr_1fr] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]">
            <div><strong>{number(overview.restaurants.claimed)}</strong><span>Claimed</span></div>
            <div><strong>{number(overview.restaurants.withoutOwner)}</strong><span>Without owner</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

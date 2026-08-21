import { useEffect, useMemo, useState } from "react";
import type {
  Menu,
  RestaurantProAnalytics,
  RestaurantReview,
} from "@findeat/types";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { HeartIcon } from "@phosphor-icons/react/dist/csr/Heart";
import { LightbulbIcon } from "@phosphor-icons/react/dist/csr/Lightbulb";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { UsersIcon } from "@phosphor-icons/react/dist/csr/Users";
import { CustomDropdown } from "../components/CustomDropdown";
import { request } from "../lib/api";

type Range = "7" | "30" | "90" | "all";

function score(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

function trendLabel(change: number | null) {
  if (change == null) return "Not enough prior data";
  if (Math.abs(change) < 0.05) return "Stable vs previous period";
  return `${change > 0 ? "+" : ""}${change.toFixed(1)} vs previous period`;
}

export function AnalyticsPage({
  restaurantId,
  menus,
  reviews,
}: {
  restaurantId: string;
  menus: Menu[];
  reviews: RestaurantReview[];
}) {
  const [range, setRange] = useState<Range>("30");
  const requestKey = `${restaurantId}:${range}`;
  const [result, setResult] = useState<{
    key: string;
    analytics: RestaurantProAnalytics | null;
    error: string;
  }>({ key: "", analytics: null, error: "" });
  const analytics = result.key === requestKey ? result.analytics : null;
  const error = result.key === requestKey ? result.error : "";
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    void request<RestaurantProAnalytics>(
      `/restaurants/${restaurantId}/business/analytics?range=${range}`,
    )
      .then((result) => {
        if (!cancelled) {
          setResult({ key: requestKey, analytics: result, error: "" });
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            analytics: null,
            error:
              reason instanceof Error
                ? reason.message
                : "Could not load Pro insights",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range, requestKey, restaurantId]);

  const fallbackAverage = useMemo(() => {
    const values = reviews
      .map((review) => review.rating)
      .filter((value): value is number => value != null);
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }, [reviews]);

  const recommendations = useMemo(() => {
    if (!analytics) return [];
    const items: Array<{ title: string; detail: string; tone: string }> = [];
    const drivers: Array<{ label: string; value: number | null }> = [
      { label: "Service", value: analytics.experience.service },
      { label: "Value for money", value: analytics.experience.value },
      { label: "Atmosphere", value: analytics.experience.atmosphere },
    ];
    const weakest = drivers
      .filter((item) => item.value != null)
      .sort(
        (left, right) =>
          (left.value ?? Number.POSITIVE_INFINITY) -
          (right.value ?? Number.POSITIVE_INFINITY),
      )[0];

    if (analytics.overview.reviews.count < 5) {
      items.push({
        title: "Build a stronger review sample",
        detail: "There are fewer than five reviews in this period. More feedback will make trends more reliable.",
        tone: "neutral",
      });
    } else if (weakest?.value != null && weakest.value < 8) {
      items.push({
        title: `Focus on ${weakest.label.toLowerCase()}`,
        detail: `At ${weakest.value.toFixed(1)}/10, this is the clearest opportunity in recent customer feedback.`,
        tone: "attention",
      });
    }
    if (analytics.menuHealth.missingImage > 0) {
      items.push({
        title: "Complete dish photography",
        detail: `${analytics.menuHealth.missingImage} dish${analytics.menuHealth.missingImage === 1 ? " is" : "es are"} missing an image. Add the most popular dishes first.`,
        tone: "attention",
      });
    }
    if (analytics.menuHealth.missingPrice > 0) {
      items.push({
        title: "Fill pricing gaps",
        detail: `${analytics.menuHealth.missingPrice} menu item${analytics.menuHealth.missingPrice === 1 ? " has" : "s have"} no price, which makes planning harder for diners.`,
        tone: "neutral",
      });
    }
    if (
      analytics.overview.content.communityPosts > 0 &&
      analytics.overview.content.officialPosts === 0
    ) {
      items.push({
        title: "Join the conversation",
        detail: `${analytics.overview.content.communityPosts} community post${analytics.overview.content.communityPosts === 1 ? " mentions" : "s mention"} the restaurant, but there is no official post in this period.`,
        tone: "positive",
      });
    }
    if (items.length === 0) {
      items.push({
        title: "Your fundamentals look healthy",
        detail: "Keep the menu current and monitor the experience scores as new reviews arrive.",
        tone: "positive",
      });
    }
    return items.slice(0, 3);
  }, [analytics]);

  const menuItems = menus.flatMap((menu) => menu.items);
  const displayRating = analytics?.overview.reviews.overallRating ?? fallbackAverage;

  return (
    <div className="page-stack [width:min(1120px,100%)] [margin:auto] [padding:46px_42px_70px] [.restaurant-setup-shell>&]:[width:min(960px,100%)] [.restaurant-setup-shell>&]:[margin:auto] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px] pro-page [display:flex] [flex-direction:column] [gap:18px] [&>.page-heading]:[margin-bottom:12px]">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column] pro-heading [align-items:flex-end] [&_h2]:[max-width:700px]">
        <div>
          <div className="premium-title [display:flex] [align-items:center] [gap:10px] [&_.eyebrow]:[margin-bottom:8px] [&_span]:[padding:4px_7px] [&_span]:[border-radius:7px] [&_span]:[background:#fff0cc] [&_span]:[color:#815c00] [&_span]:[font-size:10px] [&_span]:[font-weight:900] [&_span]:[text-transform:uppercase] [&_span]:[background:var(--warning-soft)] [&_span]:[color:var(--warning)]">
            <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">FINDEAT PRO</p>
            <span>
              {analytics?.access.source === "ADMIN"
                ? "Admin · free access"
                : "Live insights"}
            </span>
          </div>
          <h2>Turn guest activity into better decisions</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Understand what brings people in, what they value, and what to improve next.
          </p>
        </div>
        <div className="pro-range [display:grid] [min-width:150px] [gap:6px] [color:var(--muted)] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:.06em] [&_.custom-dropdown]:[width:180px] [&_.custom-dropdown-trigger]:[height:44px] [&_.custom-dropdown-trigger]:[border-color:var(--line)] [&_.custom-dropdown-trigger]:[background:var(--surface)] [&_.custom-dropdown-trigger]:[font-size:12px] [&_.custom-dropdown-trigger]:[font-weight:750] [&_.custom-dropdown-menu]:[width:100%] [&_.custom-dropdown-menu]:[min-width:100%]">
          <span>Period</span>
          <CustomDropdown
            ariaLabel="Analytics period"
            value={range}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
              { value: "all", label: "All time" },
            ]}
            onChange={(value) => setRange(value as Range)}
          />
        </div>
      </div>

      {error ? <p className="banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)] error [color:#b32727] [font-size:13px] [color:var(--danger)]">{error}</p> : null}

      <div className={`pro-kpis [display:grid] [grid-template-columns:repeat(4,minmax(0,1fr))] [gap:13px] [&_article]:[min-width:0] [&_article]:[padding:19px] [&_article]:[border:1px_solid_var(--line)] [&_article]:[border-radius:18px] [&_article]:[background:var(--surface)] [&_article>svg]:[color:var(--accent)] [&_span]:[display:block] [&_small]:[display:block] [&_strong]:[display:block] [&_span]:[margin-top:13px] [&_span]:[color:var(--muted)] [&_span]:[font-size:11px] [&_span]:[font-weight:750] [&_strong]:[margin:5px_0_7px] [&_strong]:[font-size:30px] [&_strong]:[line-height:1] [&_strong]:[letter-spacing:-.04em] [&_small]:[min-height:26px] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] [&_small]:[line-height:1.4] [&.loading]:[opacity:.62] max-[800px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[520px]:[grid-template-columns:1fr] max-[600px]:[grid-template-columns:1fr] ${loading ? "loading" : ""}`}>
        <article>
          <UsersIcon size={21} weight="duotone" />
          <span>New followers</span>
          <strong>{analytics?.overview.followers.new ?? "—"}</strong>
          <small>{analytics ? `${analytics.overview.followers.total} total followers` : "Loading audience"}</small>
        </article>
        <article>
          <HeartIcon size={21} weight="duotone" />
          <span>Want to try</span>
          <strong>{analytics?.overview.intent.wantToTry ?? "—"}</strong>
          <small>Current dining intent</small>
        </article>
        <article>
          <CheckCircleIcon size={21} weight="duotone" />
          <span>Visits</span>
          <strong>{analytics?.overview.intent.visitsInPeriod ?? "—"}</strong>
          <small>{analytics ? `${analytics.overview.intent.visited} visitors recorded overall` : "Loading visits"}</small>
        </article>
        <article>
          <StarIcon size={21} weight="fill" />
          <span>Average rating</span>
          <strong>{score(displayRating)}</strong>
          <small>{analytics ? trendLabel(analytics.overview.reviews.ratingChange) : `${reviews.length} reviews loaded`}</small>
        </article>
      </div>

      <div className="pro-main-grid [display:grid] [grid-template-columns:minmax(0,_1.35fr)_minmax(300px,_0.8fr)] [gap:15px] [&>.card]:[padding:23px] [&_.panel-heading]:[align-items:flex-start] [&_.panel-heading_h3]:[margin-bottom:4px] [&_.panel-heading_p]:[margin:0] [&_.panel-heading_p]:[color:var(--muted)] [&_.panel-heading_p]:[font-size:11px] [&_.panel-heading>span]:[padding:5px_8px] [&_.panel-heading>span]:[border-radius:999px] [&_.panel-heading>span]:[background:var(--soft)] [&_.panel-heading>span]:[color:var(--muted)] [&_.panel-heading>span]:[font-size:9px] [&_.panel-heading>span]:[font-weight:800] max-[800px]:[grid-template-columns:1fr] max-[600px]:[&>.card]:[padding:18px]">
        <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] pro-experience">
          <div className="panel-heading [.rating-chart_&>span]:[display:inline-flex] [.rating-chart_&>span]:[align-items:center] [.rating-chart_&>span]:[gap:4px] [display:flex] [align-items:flex-start] [justify-content:space-between] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&>span]:[padding:7px_10px] [&>span]:[border-radius:9px] [&>span]:[background:#fff2c7] [&>span]:[color:#815c00] [&>span]:[font-weight:900] [.pro-secondary-grid_&]:[align-items:flex-start] [.pro-secondary-grid_&_h3]:[margin-bottom:4px] [.pro-secondary-grid_&_p]:[margin:0] [.pro-secondary-grid_&_p]:[color:var(--muted)] [.pro-secondary-grid_&_p]:[font-size:11px] [&>span]:[background:var(--warning-soft)] [&>span]:[color:var(--warning)]">
            <div>
              <h3>Experience drivers</h3>
              <p>See what shapes the overall guest rating</p>
            </div>
            <span>{analytics?.overview.reviews.count ?? reviews.length} reviews</span>
          </div>
          <div className="pro-score-list [display:grid] [gap:13px] [margin-top:22px] [&>div]:[display:grid] [&>div]:[grid-template-columns:110px_minmax(0,_1fr)_30px] [&>div]:[align-items:center] [&>div]:[gap:11px] [&_span]:[overflow:hidden] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_span]:[font-weight:750] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&>div>div]:[height:8px] [&>div>div]:[overflow:hidden] [&>div>div]:[border-radius:999px] [&>div>div]:[background:var(--soft)] [&_i]:[display:block] [&_i]:[height:100%] [&_i]:[border-radius:inherit] [&_i]:[background:linear-gradient(90deg,_var(--accent),_var(--warning))] [&_strong]:[font-size:11px] [&_strong]:[text-align:right] max-[520px]:[&>div]:[grid-template-columns:90px_minmax(0,_1fr)_28px] max-[600px]:[&>div]:[grid-template-columns:80px_minmax(0,_1fr)_26px]">
            {[
              ["Overall", analytics?.experience.overall ?? fallbackAverage],
              ["Atmosphere", analytics?.experience.atmosphere ?? null],
              ["Service", analytics?.experience.service ?? null],
              ["Value for money", analytics?.experience.value ?? null],
            ].map(([label, value]) => {
              const numeric = typeof value === "number" ? value : null;
              return (
                <div key={label as string}>
                  <span>{label}</span>
                  <div><i style={{ width: `${numeric == null ? 0 : numeric * 10}%` }} /></div>
                  <strong>{score(numeric)}</strong>
                </div>
              );
            })}
          </div>
          <div className="pro-return-intent [display:flex] [align-items:baseline] [gap:9px] [padding-top:18px] [margin-top:20px] [border-top:1px_solid_var(--line)] [&_strong]:[font-size:25px] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px]">
            <strong>{analytics?.experience.wouldReturnPercent ?? "—"}{analytics?.experience.wouldReturnPercent != null ? "%" : ""}</strong>
            <span>of guests said they would return</span>
          </div>
        </section>

        <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] pro-actions">
          <div className="panel-heading [.rating-chart_&>span]:[display:inline-flex] [.rating-chart_&>span]:[align-items:center] [.rating-chart_&>span]:[gap:4px] [display:flex] [align-items:flex-start] [justify-content:space-between] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&>span]:[padding:7px_10px] [&>span]:[border-radius:9px] [&>span]:[background:#fff2c7] [&>span]:[color:#815c00] [&>span]:[font-weight:900] [.pro-secondary-grid_&]:[align-items:flex-start] [.pro-secondary-grid_&_h3]:[margin-bottom:4px] [.pro-secondary-grid_&_p]:[margin:0] [.pro-secondary-grid_&_p]:[color:var(--muted)] [.pro-secondary-grid_&_p]:[font-size:11px] [&>span]:[background:var(--warning-soft)] [&>span]:[color:var(--warning)]">
            <div>
              <h3>Recommended next steps</h3>
              <p>Prioritized from your current data</p>
            </div>
            <LightbulbIcon size={22} weight="duotone" />
          </div>
          <div className="pro-action-list [display:grid] [gap:9px] [margin-top:18px] [&_article]:[display:grid] [&_article]:[grid-template-columns:8px_minmax(0,1fr)] [&_article]:[gap:11px] [&_article]:[padding:13px] [&_article]:[border:1px_solid_var(--line)] [&_article]:[border-radius:13px] [&_article]:[background:var(--soft)] [&_article>i]:[width:8px] [&_article>i]:[height:8px] [&_article>i]:[margin-top:4px] [&_article>i]:[border-radius:50%] [&_article>i]:[background:var(--muted)] [&_article.attention>i]:[background:var(--warning)] [&_article.positive>i]:[background:var(--success)] [&_strong]:[display:block] [&_strong]:[font-size:11px] [&_p]:[margin:4px_0_0] [&_p]:[color:var(--muted)] [&_p]:[font-size:9px] [&_p]:[line-height:1.5]">
            {recommendations.map((item) => (
              <article className={item.tone} key={item.title}>
                <i />
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="pro-secondary-grid [&>.card]:[padding:23px] [&_.panel-heading]:[align-items:flex-start] [&_.panel-heading_h3]:[margin-bottom:4px] [&_.panel-heading_p]:[margin:0] [&_.panel-heading_p]:[color:var(--muted)] [&_.panel-heading_p]:[font-size:11px] [display:grid] [grid-template-columns:minmax(0,1.15fr)_minmax(0,1fr)] [gap:15px] max-[800px]:[grid-template-columns:1fr] max-[600px]:[&>.card]:[padding:18px]">
        <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] pro-dishes">
          <div className="panel-heading [.rating-chart_&>span]:[display:inline-flex] [.rating-chart_&>span]:[align-items:center] [.rating-chart_&>span]:[gap:4px] [display:flex] [align-items:flex-start] [justify-content:space-between] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&>span]:[padding:7px_10px] [&>span]:[border-radius:9px] [&>span]:[background:#fff2c7] [&>span]:[color:#815c00] [&>span]:[font-weight:900] [.pro-secondary-grid_&]:[align-items:flex-start] [.pro-secondary-grid_&_h3]:[margin-bottom:4px] [.pro-secondary-grid_&_p]:[margin:0] [.pro-secondary-grid_&_p]:[color:var(--muted)] [.pro-secondary-grid_&_p]:[font-size:11px] [&>span]:[background:var(--warning-soft)] [&>span]:[color:var(--warning)]">
            <div><h3>Top dishes</h3><p>Ranked by favorites, reviews, and rating</p></div>
            <ForkKnifeIcon size={22} weight="duotone" />
          </div>
          <div className="pro-dish-list [display:grid] [gap:5px] [margin-top:17px] [&_article]:[display:flex] [&_article]:[align-items:center] [&_article]:[min-width:0] [&_article]:[gap:10px] [&_article]:[padding:8px] [&_article]:[border-radius:12px] [&_article:hover]:[background:var(--soft)] [&_article>b]:[width:17px] [&_article>b]:[flex:0_0_17px] [&_article>b]:[color:var(--muted)] [&_article>b]:[font-size:10px] [&_article>b]:[text-align:center] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:38px] [&_img]:[height:38px] [&_img]:[flex:0_0_38px] [&_img]:[border-radius:10px] [&_img]:[background:var(--neutral-chip)] [&_img]:[object-fit:cover] [&_img]:[font-size:11px] [&_img]:[font-weight:900] [&_article>span]:[display:grid] [&_article>span]:[place-items:center] [&_article>span]:[width:38px] [&_article>span]:[height:38px] [&_article>span]:[flex:0_0_38px] [&_article>span]:[border-radius:10px] [&_article>span]:[background:var(--neutral-chip)] [&_article>span]:[object-fit:cover] [&_article>span]:[font-size:11px] [&_article>span]:[font-weight:900] [&_article>div]:[min-width:0] [&_article>div]:[flex:1] [&_strong]:[display:block] [&_strong]:[overflow:hidden] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_small]:[display:block] [&_small]:[overflow:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_strong]:[font-size:11px] [&_small]:[margin-top:3px] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] [&_em]:[font-size:11px] [&_em]:[font-style:normal] [&_em]:[font-weight:900]">
            {(analytics?.topDishes ?? []).map((dish, index) => (
              <article key={dish.id}>
                <b>{index + 1}</b>
                {dish.imageUrl ? <img src={dish.imageUrl} alt="" /> : <span>{dish.name.charAt(0)}</span>}
                <div><strong>{dish.name}</strong><small>{dish.reviews} reviews · {dish.favorites} favorites</small></div>
                <em>{score(dish.averageRating)}</em>
              </article>
            ))}
            {!loading && analytics?.topDishes.length === 0 ? (
              <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Dish rankings will appear after menu items receive activity.</p>
            ) : null}
          </div>
        </section>

        <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] pro-word-of-mouth">
          <div className="panel-heading [.rating-chart_&>span]:[display:inline-flex] [.rating-chart_&>span]:[align-items:center] [.rating-chart_&>span]:[gap:4px] [display:flex] [align-items:flex-start] [justify-content:space-between] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&>span]:[padding:7px_10px] [&>span]:[border-radius:9px] [&>span]:[background:#fff2c7] [&>span]:[color:#815c00] [&>span]:[font-weight:900] [.pro-secondary-grid_&]:[align-items:flex-start] [.pro-secondary-grid_&_h3]:[margin-bottom:4px] [.pro-secondary-grid_&_p]:[margin:0] [.pro-secondary-grid_&_p]:[color:var(--muted)] [.pro-secondary-grid_&_p]:[font-size:11px] [&>span]:[background:var(--warning-soft)] [&>span]:[color:var(--warning)]">
            <div><h3>Word of mouth</h3><p>How the community is creating demand</p></div>
            <ChartLineUpIcon size={22} weight="duotone" />
          </div>
          <div className="pro-mini-grid [display:grid] [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:8px] [margin-top:17px] [&_article]:[padding:13px] [&_article]:[border:1px_solid_var(--line)] [&_article]:[border-radius:13px] [&_article]:[background:var(--soft)] [&_span]:[display:block] [&_strong]:[display:block] [&_span]:[color:var(--muted)] [&_span]:[font-size:9px] [&_strong]:[margin-top:7px] [&_strong]:[font-size:21px] max-[520px]:[grid-template-columns:1fr] max-[600px]:[grid-template-columns:1fr]">
            <article><span>Community posts</span><strong>{analytics?.overview.content.communityPosts ?? "—"}</strong></article>
            <article><span>Post engagement</span><strong>{analytics ? analytics.overview.content.likes + analytics.overview.content.comments : "—"}</strong></article>
            <article><span>Attributed visits</span><strong>{analytics?.recommendationImpact.VISITED ?? 0}</strong></article>
            <article><span>Favorites</span><strong>{analytics?.overview.intent.favorites ?? "—"}</strong></article>
          </div>
          <p className="pro-data-note [margin:14px_0_0] [color:var(--muted)] [font-size:9px] [line-height:1.5]">
            Profile views and map impressions are not shown yet because FindEat does not currently track those events.
          </p>
        </section>
      </div>

      <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] pro-menu-health [display:grid] [grid-template-columns:minmax(220px,.8fr)_minmax(0,1.6fr)] [align-items:center] [gap:30px] [padding:24px] [&_h3]:[margin:5px_0] [&_h3]:[font-size:19px] [&_p]:[margin:0] [&_p]:[color:var(--muted)] [&_p]:[font-size:10px] max-[800px]:[grid-template-columns:1fr] max-[600px]:[padding:18px]">
        <div>
          <span className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">MENU READINESS</span>
          <h3>Make every menu visit useful</h3>
          <p>Complete information helps diners compare dishes and decide faster.</p>
        </div>
        <div className="pro-menu-metrics [display:grid] [grid-template-columns:repeat(4,minmax(0,1fr))] [gap:8px] [&_article]:[padding:13px] [&_article]:[border-left:1px_solid_var(--line)] [&_strong]:[display:block] [&_span]:[display:block] [&_strong]:[font-size:23px] [&_span]:[margin-top:5px] [&_span]:[color:var(--muted)] [&_span]:[font-size:9px] max-[800px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[520px]:[grid-template-columns:1fr] max-[600px]:[grid-template-columns:1fr] max-[600px]:[&_article]:[border-top:1px_solid_var(--line)] max-[600px]:[&_article]:[border-left:0]">
          <article><strong>{analytics?.menuHealth.available ?? menuItems.filter((item) => item.isAvailable).length}</strong><span>Available</span></article>
          <article><strong>{analytics?.menuHealth.missingImage ?? menuItems.filter((item) => !item.imageUrl).length}</strong><span>Missing images</span></article>
          <article><strong>{analytics?.menuHealth.missingDescription ?? menuItems.filter((item) => !item.description).length}</strong><span>Missing descriptions</span></article>
          <article><strong>{analytics?.menuHealth.missingPrice ?? menuItems.filter((item) => item.price == null).length}</strong><span>Missing prices</span></article>
        </div>
      </section>
    </div>
  );
}

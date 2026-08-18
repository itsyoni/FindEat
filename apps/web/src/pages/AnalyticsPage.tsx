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
    <div className="page-stack pro-page">
      <div className="page-heading pro-heading">
        <div>
          <div className="premium-title">
            <p className="eyebrow">FINDEAT PRO</p>
            <span>
              {analytics?.access.source === "ADMIN"
                ? "Admin · free access"
                : "Live insights"}
            </span>
          </div>
          <h2>Turn guest activity into better decisions</h2>
          <p className="muted">
            Understand what brings people in, what they value, and what to improve next.
          </p>
        </div>
        <div className="pro-range">
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

      {error ? <p className="banner error">{error}</p> : null}

      <div className={`pro-kpis ${loading ? "loading" : ""}`}>
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

      <div className="pro-main-grid">
        <section className="card pro-experience">
          <div className="panel-heading">
            <div>
              <h3>Experience drivers</h3>
              <p>See what shapes the overall guest rating</p>
            </div>
            <span>{analytics?.overview.reviews.count ?? reviews.length} reviews</span>
          </div>
          <div className="pro-score-list">
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
          <div className="pro-return-intent">
            <strong>{analytics?.experience.wouldReturnPercent ?? "—"}{analytics?.experience.wouldReturnPercent != null ? "%" : ""}</strong>
            <span>of guests said they would return</span>
          </div>
        </section>

        <section className="card pro-actions">
          <div className="panel-heading">
            <div>
              <h3>Recommended next steps</h3>
              <p>Prioritized from your current data</p>
            </div>
            <LightbulbIcon size={22} weight="duotone" />
          </div>
          <div className="pro-action-list">
            {recommendations.map((item) => (
              <article className={item.tone} key={item.title}>
                <i />
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="pro-secondary-grid">
        <section className="card pro-dishes">
          <div className="panel-heading">
            <div><h3>Top dishes</h3><p>Ranked by favorites, reviews, and rating</p></div>
            <ForkKnifeIcon size={22} weight="duotone" />
          </div>
          <div className="pro-dish-list">
            {(analytics?.topDishes ?? []).map((dish, index) => (
              <article key={dish.id}>
                <b>{index + 1}</b>
                {dish.imageUrl ? <img src={dish.imageUrl} alt="" /> : <span>{dish.name.charAt(0)}</span>}
                <div><strong>{dish.name}</strong><small>{dish.reviews} reviews · {dish.favorites} favorites</small></div>
                <em>{score(dish.averageRating)}</em>
              </article>
            ))}
            {!loading && analytics?.topDishes.length === 0 ? (
              <p className="muted">Dish rankings will appear after menu items receive activity.</p>
            ) : null}
          </div>
        </section>

        <section className="card pro-word-of-mouth">
          <div className="panel-heading">
            <div><h3>Word of mouth</h3><p>How the community is creating demand</p></div>
            <ChartLineUpIcon size={22} weight="duotone" />
          </div>
          <div className="pro-mini-grid">
            <article><span>Community posts</span><strong>{analytics?.overview.content.communityPosts ?? "—"}</strong></article>
            <article><span>Post engagement</span><strong>{analytics ? analytics.overview.content.likes + analytics.overview.content.comments : "—"}</strong></article>
            <article><span>Attributed visits</span><strong>{analytics?.recommendationImpact.VISITED ?? 0}</strong></article>
            <article><span>Favorites</span><strong>{analytics?.overview.intent.favorites ?? "—"}</strong></article>
          </div>
          <p className="pro-data-note">
            Profile views and map impressions are not shown yet because FindEat does not currently track those events.
          </p>
        </section>
      </div>

      <section className="card pro-menu-health">
        <div>
          <span className="eyebrow">MENU READINESS</span>
          <h3>Make every menu visit useful</h3>
          <p>Complete information helps diners compare dishes and decide faster.</p>
        </div>
        <div className="pro-menu-metrics">
          <article><strong>{analytics?.menuHealth.available ?? menuItems.filter((item) => item.isAvailable).length}</strong><span>Available</span></article>
          <article><strong>{analytics?.menuHealth.missingImage ?? menuItems.filter((item) => !item.imageUrl).length}</strong><span>Missing images</span></article>
          <article><strong>{analytics?.menuHealth.missingDescription ?? menuItems.filter((item) => !item.description).length}</strong><span>Missing descriptions</span></article>
          <article><strong>{analytics?.menuHealth.missingPrice ?? menuItems.filter((item) => item.price == null).length}</strong><span>Missing prices</span></article>
        </div>
      </section>
    </div>
  );
}

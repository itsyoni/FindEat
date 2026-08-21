import { useEffect, useMemo } from "react";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { HeartIcon } from "@phosphor-icons/react/dist/csr/Heart";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/csr/LockSimple";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { Dish } from "@findeat/types";

type DishInsightsModalProps = {
  dish: Dish;
  allDishes: Dish[];
  onClose: () => void;
};

export function DishInsightsModal({
  dish,
  allDishes,
  onClose,
}: DishInsightsModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const favoriteRank = useMemo(() => {
    const ranked = [...allDishes].sort(
      (left, right) =>
        (right.favoriteCount ?? 0) - (left.favoriteCount ?? 0) ||
        (right.reviewsCount ?? 0) - (left.reviewsCount ?? 0),
    );
    const index = ranked.findIndex((item) => item.id === dish.id);
    return index < 0 ? null : index + 1;
  }, [allDishes, dish.id]);

  return (
    <div
      className="dish-insights-backdrop [position:fixed] [z-index:110] [inset:0] [display:grid] [place-items:center] [padding:24px] [background:#17171775] [backdrop-filter:blur(5px)] max-[600px]:[align-items:end] max-[600px]:[padding:0]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="dish-insights [width:min(760px,100%)] [max-height:calc(100dvh_-_48px)] [overflow:hidden] [border:1px_solid_#ffffff30] [border-radius:24px] [background:var(--surface)] [box-shadow:0_30px_100px_#0005] max-[600px]:[width:100%] max-[600px]:[max-height:calc(100dvh_-_12px)] max-[600px]:[border-radius:19px_19px_0_0]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-insights-title"
      >
        <header className="dish-insights-header flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5 [height:auto] [min-height:90px] [padding:17px_20px_17px_24px] [border-bottom:1px_solid_var(--line)] [border-radius:24px_24px_0_0] [&>button]:[display:grid] [&>button]:[place-items:center] [&>button]:[width:36px] [&>button]:[height:36px] [&>button]:[padding:0] [&>button]:[border:0] [&>button]:[border-radius:50%] [&>button]:[background:var(--soft)] [&>button]:[color:var(--ink)] max-[600px]:[min-height:78px] max-[600px]:[padding:13px_15px] max-[600px]:[border-radius:19px_19px_0_0]">
          <div className="dish-insights-identity [display:flex] [align-items:center] [min-width:0] [gap:13px] [&>img]:[display:grid] [&>img]:[place-items:center] [&>img]:[width:54px] [&>img]:[height:54px] [&>img]:[flex:0_0_54px] [&>img]:[border-radius:15px] [&>img]:[background:#eee8df] [&>img]:[object-fit:cover] [&>img]:[color:#715b45] [&>img]:[font-size:20px] [&>img]:[font-weight:900] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[width:54px] [&>span]:[height:54px] [&>span]:[flex:0_0_54px] [&>span]:[border-radius:15px] [&>span]:[background:#eee8df] [&>span]:[object-fit:cover] [&>span]:[color:#715b45] [&>span]:[font-size:20px] [&>span]:[font-weight:900] [&>div]:[min-width:0] [&_small]:[display:block] [&_small]:[margin-bottom:3px] [&_small]:[color:#6d4ac7] [&_small]:[font-size:10px] [&_small]:[font-weight:900] [&_small]:[letter-spacing:0.1em] [&_small]:[text-transform:uppercase] [&_h2]:[max-width:560px] [&_h2]:[margin:0] [&_h2]:[overflow:hidden] [&_h2]:[font-size:22px] [&_h2]:[text-overflow:ellipsis] [&_h2]:[white-space:nowrap] max-[600px]:[&>img]:[width:46px] max-[600px]:[&>img]:[height:46px] max-[600px]:[&>img]:[flex-basis:46px] max-[600px]:[&>img]:[border-radius:13px] max-[600px]:[&>span]:[width:46px] max-[600px]:[&>span]:[height:46px] max-[600px]:[&>span]:[flex-basis:46px] max-[600px]:[&>span]:[border-radius:13px] [&>img]:[background:var(--avatar-surface)] [&>span]:[background:var(--avatar-surface)]">
            {dish.imageUrl ? (
              <img src={dish.imageUrl} alt="" />
            ) : (
              <span>{dish.name.charAt(0).toUpperCase()}</span>
            )}
            <div>
              <small>Dish statistics</small>
              <h2 id="dish-insights-title">{dish.name}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close statistics">
            <XIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>

        <div className="dish-insights-body [max-height:calc(100dvh_-_138px)] [overflow-y:auto] [overscroll-behavior:contain] [padding:24px] max-[600px]:[max-height:calc(100dvh_-_90px)] max-[600px]:[padding:17px_15px_calc(17px_+_env(safe-area-inset-bottom))]">
          <div className="dish-insights-section-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [&_h3]:[margin:7px_0_3px] [&_h3]:[font-size:18px] [&_p]:[margin:0] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px]">
            <div>
              <span className="dish-insights-plan [display:inline-flex] [padding:4px_8px] [border-radius:999px] [font-size:9px] [font-weight:900] [letter-spacing:.08em] [text-transform:uppercase] [&.free]:[background:#e7f5ed] [&.free]:[color:#18734a] [&.pro]:[background:#eee9ff] [&.pro]:[color:#6742c1] [&.free]:[background:var(--success-soft)] [&.free]:[color:var(--success)] [&.pro]:[background:var(--purple-soft)] [&.pro]:[color:var(--purple)] free">Free</span>
              <h3>Quick statistics</h3>
              <p>Current performance at a glance.</p>
            </div>
            <ChartLineUpIcon size={25} weight="duotone" aria-hidden="true" />
          </div>

          <div className="dish-insights-quick-grid [display:grid] [grid-template-columns:repeat(4,minmax(0,1fr))] [gap:10px] [margin-top:18px] [&_article]:[position:relative] [&_article]:[min-width:0] [&_article]:[min-height:116px] [&_article]:[padding:15px] [&_article]:[border:1px_solid_var(--line)] [&_article]:[border-radius:16px] [&_article]:[background:var(--page)] [&_article>svg]:[color:#9a713f] [&_article:nth-child(3)>svg]:[color:#be3455] [&_span]:[display:block] [&_strong]:[display:block] [&_span]:[margin-top:12px] [&_span]:[overflow:hidden] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_span]:[font-weight:700] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&_strong]:[margin-top:4px] [&_strong]:[font-size:24px] max-[600px]:[grid-template-columns:repeat(2,minmax(0,1fr))] dark:[&_article]:[background:var(--surface-subtle)] max-[600px]:[grid-template-columns:1fr_1fr] max-[380px]:[grid-template-columns:1fr]">
            <article>
              <StarIcon size={20} weight="fill" aria-hidden="true" />
              <span>Average rating</span>
              <strong>{dish.averageRating?.toFixed(1) ?? "—"}</strong>
            </article>
            <article>
              <ChartLineUpIcon size={20} weight="duotone" aria-hidden="true" />
              <span>Total reviews</span>
              <strong>{dish.reviewsCount ?? 0}</strong>
            </article>
            <article>
              <HeartIcon size={20} weight="fill" aria-hidden="true" />
              <span>Customer favorites</span>
              <strong>{dish.favoriteCount ?? 0}</strong>
            </article>
            <article>
              <ChartLineUpIcon size={20} weight="duotone" aria-hidden="true" />
              <span>Favorite rank</span>
              <strong>{favoriteRank ? `#${favoriteRank}` : "—"}</strong>
            </article>
          </div>

          <section className="dish-insights-pro [position:relative] [margin-top:22px] [padding:20px] [overflow:hidden] [border:1px_solid_#dfd6fa] [border-radius:19px] [background:linear-gradient(135deg,#fbf9ff,#f4f0ff)] [&>.dish-insights-section-heading>svg]:[color:#7655ca] max-[600px]:[padding:16px] dark:[border-color:#4b3e69] dark:[background:linear-gradient(135deg,#211d2a,#282137)]">
            <div className="dish-insights-section-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:20px] [&_h3]:[margin:7px_0_3px] [&_h3]:[font-size:18px] [&_p]:[margin:0] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px]">
              <div>
                <span className="dish-insights-plan [display:inline-flex] [padding:4px_8px] [border-radius:999px] [font-size:9px] [font-weight:900] [letter-spacing:.08em] [text-transform:uppercase] [&.free]:[background:#e7f5ed] [&.free]:[color:#18734a] [&.pro]:[background:#eee9ff] [&.pro]:[color:#6742c1] [&.free]:[background:var(--success-soft)] [&.free]:[color:var(--success)] [&.pro]:[background:var(--purple-soft)] [&.pro]:[color:var(--purple)] pro">Pro</span>
                <h3>Deep dish analytics</h3>
                <p>Understand discovery, conversion, and performance over time.</p>
              </div>
              <LockSimpleIcon size={23} weight="fill" aria-hidden="true" />
            </div>
            <div className="dish-insights-pro-grid [display:grid] [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:9px] [margin-top:17px] [filter:blur(1.5px)] [opacity:.43] [user-select:none] [&_article]:[padding:13px] [&_article]:[border:1px_solid_#ddd4f4] [&_article]:[border-radius:13px] [&_article]:[background:var(--surface)] [&_span]:[display:block] [&_strong]:[display:block] [&_small]:[display:block] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_span]:[font-weight:700] [&_strong]:[margin:4px_0] [&_strong]:[font-size:20px] [&_small]:[color:#888] [&_small]:[font-size:9px] dark:[&_article]:[border-color:#433958]" aria-hidden="true">
              <article><span>Menu impressions</span><strong>—</strong><small>Reach and discovery sources</small></article>
              <article><span>Dish page views</span><strong>—</strong><small>Views and engagement trend</small></article>
              <article><span>Favorite conversion</span><strong>—</strong><small>Favorites compared with views</small></article>
              <article><span>Performance trend</span><strong>—</strong><small>Changes after featuring</small></article>
            </div>
            <div className="dish-insights-pro-lock [position:absolute] [left:50%] [bottom:32px] [display:flex] [align-items:center] [gap:11px] [width:max-content] [max-width:calc(100%_-_36px)] [padding:11px_14px] [border:1px_solid_#d7cdf1] [border-radius:13px] [background:#fffffff2] [box-shadow:0_12px_30px_#5d438f1c] [color:#6742c1] [transform:translateX(-50%)] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:11px] [&_small]:[margin-top:2px] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] max-[600px]:[bottom:24px] max-[600px]:[&_small]:[display:none] dark:[border-color:#554773] dark:[background:#211d2af2] dark:[color:#c7b6ff]">
              <LockSimpleIcon size={22} weight="fill" aria-hidden="true" />
              <div>
                <strong>Available with FindEat Pro</strong>
                <small>Historical tracking and plan upgrades are coming next.</small>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

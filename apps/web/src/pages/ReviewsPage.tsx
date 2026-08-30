import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { RestaurantReview } from "@findeat/types";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ChatCircleIcon } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { HeartIcon } from "@phosphor-icons/react/dist/csr/Heart";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";

export function ReviewsPage({ reviews }: { reviews: RestaurantReview[] }) {
  const [query, setQuery] = useState("");
  const [selectedReview, setSelectedReview] =
    useState<RestaurantReview | null>(null);
  const filteredReviews = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return reviews;
    return reviews.filter((review) =>
      [
        review.author.username,
        review.author.username,
        review.description,
        ...review.items.map((item) => item.name),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(clean)),
    );
  }, [query, reviews]);
  const ratedReviews = reviews.filter((review) => review.rating != null);
  const average = ratedReviews.length
    ? ratedReviews.reduce(
        (total, review) => total + (review.rating || 0),
        0,
      ) / ratedReviews.length
    : 0;

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    review: RestaurantReview,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelectedReview(review);
  }

  if (selectedReview) {
    return (
      <div className="page-stack [width:min(1120px,100%)] [margin:auto] [padding:46px_42px_70px] [.restaurant-setup-shell>&]:[width:min(960px,100%)] [.restaurant-setup-shell>&]:[margin:auto] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px] review-detail-page [width:min(980px,100%)] [margin:0_auto]">
        <button
          className="review-detail-back [display:inline-flex] [align-items:center] [gap:8px] [align-self:flex-start] [padding:9px_12px] [margin-bottom:20px] [border:0] [border-radius:10px] [background:var(--soft)] [color:var(--ink)] [font-weight:800]"
          onClick={() => setSelectedReview(null)}
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />
          Back to public reviews
        </button>

        <article className="review-detail-card [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:22px] [background:var(--surface)] [box-shadow:0_16px_50px_#2f21140b] dark:[box-shadow:0_8px_28px_#0003]">
          <div className="review-detail-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:18px] [padding:22px_24px] [border-bottom:1px_solid_var(--line)] max-[800px]:[padding:18px] max-[600px]:[align-items:flex-start]">
            <div className="reviewer [display:flex] [align-items:center] [gap:10px] [min-width:160px] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:34px] [&_img]:[height:34px] [&_img]:[flex:0_0_auto] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#eee7df] [&_img]:[font-weight:900] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[width:34px] [&>span]:[height:34px] [&>span]:[flex:0_0_auto] [&>span]:[border-radius:50%] [&>span]:[object-fit:cover] [&>span]:[background:#eee7df] [&>span]:[font-weight:900] [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[margin-top:2px] [&_small]:[color:var(--muted)] [&_img]:[background:var(--avatar-surface)] [&>span]:[background:var(--avatar-surface)] max-[800px]:[min-width:0] review-detail-reviewer [&_img]:[width:46px] [&_img]:[height:46px] [&>span]:[width:46px] [&>span]:[height:46px]">
              {selectedReview.author.avatarUrl ? (
                <img src={selectedReview.author.avatarUrl} alt="" />
              ) : (
                <span>
                  {selectedReview.author.username.charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <strong>
                  {selectedReview.author.username}
                </strong>
              </div>
            </div>
            <div className="review-detail-rating [display:flex] [align-items:baseline] [gap:4px] [padding:9px_12px] [border-radius:12px] [background:#fff2c7] [color:#815c00] [&_svg]:[align-self:center] [&_strong]:[font-size:21px] [&_span]:[font-size:11px] [&_span]:[font-weight:800] [background:var(--warning-soft)] [color:var(--warning)] max-[600px]:[padding:7px_9px] max-[600px]:[&_strong]:[font-size:18px]">
              <StarIcon size={18} weight="fill" aria-hidden="true" />
              <strong>{selectedReview.rating?.toFixed(1) || "—"}</strong>
              <span>/ 10</span>
            </div>
          </div>

          {selectedReview.imageUrl && (
            <img
              className="review-detail-cover [display:block] [width:100%] [max-height:460px] [object-fit:cover]"
              src={selectedReview.imageUrl}
              alt="Review"
            />
          )}

          <div className="review-detail-body [display:grid] [gap:24px] [padding:26px] max-[800px]:[padding:18px]">
            <div className="review-detail-copy [&>span]:[color:var(--muted)] [&>span]:[font-size:10px] [&>span]:[font-weight:900] [&>span]:[letter-spacing:.08em] [&>span]:[text-transform:uppercase] [&_p]:[margin:9px_0_0] [&_p]:[font-size:16px] [&_p]:[line-height:1.65] [&_p]:[white-space:pre-wrap] max-[600px]:[&_p]:[font-size:14px]">
              <span>Full review</span>
              <p>
                {selectedReview.description || "No written comment was added."}
              </p>
            </div>

            <div className="review-detail-meta [display:flex] [flex-wrap:wrap] [align-items:center] [gap:10px_18px] [padding:14px_0] [border-top:1px_solid_var(--line)] [border-bottom:1px_solid_var(--line)] [color:var(--muted)] [font-size:12px] [&_span]:[display:flex] [&_span]:[align-items:center] [&_span]:[gap:6px] [&_time]:[margin-left:auto] max-[800px]:[&_time]:[width:100%] max-[800px]:[&_time]:[margin-left:0]">
              <span>
                <HeartIcon size={16} weight="duotone" aria-hidden="true" />
                {selectedReview._count.likes} likes
              </span>
              <span>
                <ChatCircleIcon
                  size={16}
                  weight="duotone"
                  aria-hidden="true"
                />
                {selectedReview._count.comments} comments
              </span>
              <time>
                {selectedReview.createdAt
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "long",
                    }).format(new Date(selectedReview.createdAt))
                  : "Date unavailable"}
              </time>
            </div>

            <section className="review-detail-dishes [&>div:first-child]:[display:flex] [&>div:first-child]:[align-items:center] [&>div:first-child]:[gap:10px] [&_h3]:[margin:0] [&>div:first-child_p]:[margin:0] [&>div:first-child_p]:[margin-top:3px] [&>div:first-child_p]:[color:var(--muted)] [&>div:first-child_p]:[font-size:11px]">
              <div>
                <ForkKnifeIcon size={22} weight="duotone" aria-hidden="true" />
                <div>
                  <h3>Dishes ordered</h3>
                  <p>
                    {selectedReview.items.length}{" "}
                    {selectedReview.items.length === 1 ? "dish" : "dishes"}
                  </p>
                </div>
              </div>
              {selectedReview.items.length === 0 ? (
                <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">No dishes were attached to this review.</p>
              ) : (
                <div className="review-dish-list mt-4 grid gap-2.5">
                  {selectedReview.items.map((item) => (
                    <article className="grid min-h-24 grid-cols-[160px_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-line bg-surface-subtle max-[560px]:min-h-20 max-[560px]:grid-cols-[112px_minmax(0,1fr)]" key={item.id}>
                      {item.imageUrl ? (
                        <img className="h-full min-h-24 w-full object-cover max-[560px]:min-h-20" src={item.imageUrl} alt={item.name} />
                      ) : (
                        <div className="grid min-h-24 place-items-center bg-soft text-muted max-[560px]:min-h-20">
                          <ForkKnifeIcon size={27} weight="duotone" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 self-center p-4 max-[560px]:p-3">
                        <div className="flex items-start justify-between gap-3">
                          <strong className="min-w-0 text-sm leading-5">{item.name}</strong>
                          {item.rating != null ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-warning-soft px-2 py-1 text-[11px] font-black text-warning">
                              <StarIcon size={12} weight="fill" aria-hidden="true" />
                              {item.rating}/10
                            </span>
                          ) : null}
                        </div>
                        {item.text ? <p className="mt-2 mb-0 text-xs leading-5 text-muted">{item.text}</p> : <p className="mt-2 mb-0 text-xs text-muted">No dish caption was added.</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="page-stack [width:min(1120px,100%)] [margin:auto] [padding:46px_42px_70px] [.restaurant-setup-shell>&]:[width:min(960px,100%)] [.restaurant-setup-shell>&]:[margin:auto] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px] reviews-page">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">CUSTOMER FEEDBACK</p>
          <h2>Public reviews</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Only public reviews are visible here and included in your public
            rating. Friends-only and private reviews remain private.
          </p>
        </div>
        <div className="review-summary [display:flex] [flex-direction:column] [align-items:flex-end] [&_strong]:[font-size:30px] [&_span]:[color:var(--muted)] [&_span]:[font-size:12px]">
          <strong>{Number.isFinite(average) ? average.toFixed(1) : "—"}</strong>
          <span>public average</span>
        </div>
      </div>
      <div className="review-toolbar [display:flex] [align-items:center] [justify-content:space-between] [gap:18px] [padding:14px] [margin-bottom:16px] [border:1px_solid_var(--line)] [border-radius:16px] [background:var(--surface)] [&_input]:[max-width:430px] [&_span]:[color:var(--muted)] [&_span]:[white-space:nowrap] [&_span]:[font-size:12px] [&_span]:[font-weight:700] max-[800px]:[align-items:stretch] max-[800px]:[flex-direction:column] max-[800px]:[gap:9px] max-[800px]:[&_input]:[max-width:none] max-[800px]:[&_span]:[align-self:flex-end]">
        <input
          type="search"
          placeholder="Search reviewer, review, or dish…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span>
          {filteredReviews.length} of {reviews.length} reviews
        </span>
      </div>
      {reviews.length === 0 ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
          <StarIcon size={34} weight="duotone" aria-hidden="true" />
          <h3>No public reviews yet</h3>
          <p>New public customer reviews will appear here automatically.</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
          <h3>No matching reviews</h3>
          <p>Try a different search.</p>
        </div>
      ) : (
        <div className="review-table-wrap [overflow:auto] [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] max-[800px]:[overflow:visible] max-[800px]:[border:0] max-[800px]:[background:transparent]">
          <table className="review-table [width:100%] [min-width:980px] [border-collapse:collapse] [text-align:left] [&_th]:[padding:14px_16px] [&_th]:[background:var(--soft)] [&_th]:[color:var(--muted)] [&_th]:[font-size:11px] [&_th]:[text-transform:uppercase] [&_th]:[letter-spacing:.06em] [&_td]:[padding:16px] [&_td]:[border-top:1px_solid_var(--line)] [&_td]:[vertical-align:top] [&_td]:[font-size:13px] [&_td>small]:[color:var(--muted)] [&_td>small]:[white-space:nowrap] max-[800px]:[display:grid] max-[800px]:[width:100%] max-[800px]:[min-width:0] max-[800px]:[gap:12px] max-[800px]:[&_tbody]:[display:grid] max-[800px]:[&_tbody]:[width:100%] max-[800px]:[&_tbody]:[min-width:0] max-[800px]:[&_tbody]:[gap:12px] max-[800px]:[&_thead]:[display:none] max-[800px]:[&_tr]:[display:grid] max-[800px]:[&_tr]:[grid-template-columns:minmax(0,1fr)_auto] max-[800px]:[&_tr]:[gap:11px] max-[800px]:[&_tr]:[padding:16px] max-[800px]:[&_tr]:[border:1px_solid_var(--line)] max-[800px]:[&_tr]:[border-radius:17px] max-[800px]:[&_tr]:[background:var(--surface)] max-[800px]:[&_td]:[display:block] max-[800px]:[&_td]:[min-width:0] max-[800px]:[&_td]:[padding:0] max-[800px]:[&_td]:[border:0] max-[800px]:[&_td:nth-child(1)]:[grid-column:1] max-[800px]:[&_td:nth-child(2)]:[grid-column:2] max-[800px]:[&_td:nth-child(2)]:[grid-row:1] max-[800px]:[&_td:nth-child(3)]:[grid-column:1/-1] max-[800px]:[&_td:nth-child(4)]:[grid-column:1/-1] max-[800px]:[&_td:nth-child(5)]:[color:var(--muted)] max-[800px]:[&_td:nth-child(5)]:[font-size:11px] max-[800px]:[&_td:nth-child(6)]:[color:var(--muted)] max-[800px]:[&_td:nth-child(6)]:[font-size:11px] max-[800px]:[&_td:nth-child(6)]:[text-align:right] max-[600px]:[&_tr]:[grid-template-columns:minmax(0,1fr)_auto] max-[600px]:[&_tr]:[padding:14px] max-[380px]:[&_td:nth-child(5)]:[grid-column:1/-1] max-[380px]:[&_td:nth-child(5)]:[text-align:left] max-[380px]:[&_td:nth-child(6)]:[grid-column:1/-1] max-[380px]:[&_td:nth-child(6)]:[text-align:left]">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Dishes</th>
                <th>Engagement</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review) => (
                <tr
                  className="review-table-row [cursor:pointer] [transition:background_.16s_ease] [&:hover]:[background:#fffaf4] [&:hover]:[outline:none] [&:focus]:[background:#fffaf4] [&:focus]:[outline:none] [&:focus-visible]:[box-shadow:inset_0_0_0_2px_var(--accent)] dark:[&:hover]:[background:var(--surface-hover)] dark:[&:focus]:[background:var(--surface-hover)] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] [&:focus]:[border-color:var(--line)] [&:focus]:[background:var(--surface-hover)]"
                  key={review.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open review by ${review.author.username}`}
                  onClick={() => setSelectedReview(review)}
                  onKeyDown={(event) => handleRowKeyDown(event, review)}
                >
                  <td>
                    <div className="reviewer [display:flex] [align-items:center] [gap:10px] [min-width:160px] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:34px] [&_img]:[height:34px] [&_img]:[flex:0_0_auto] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#eee7df] [&_img]:[font-weight:900] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[width:34px] [&>span]:[height:34px] [&>span]:[flex:0_0_auto] [&>span]:[border-radius:50%] [&>span]:[object-fit:cover] [&>span]:[background:#eee7df] [&>span]:[font-weight:900] [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[margin-top:2px] [&_small]:[color:var(--muted)] [&_img]:[background:var(--avatar-surface)] [&>span]:[background:var(--avatar-surface)] max-[800px]:[min-width:0]">
                      {review.author.avatarUrl ? (
                        <img src={review.author.avatarUrl} alt="" />
                      ) : (
                        <span>
                          {review.author.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <strong>
                          {review.author.username}
                        </strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="rating-pill [display:inline-flex] [align-items:center] [gap:4px] [display:inline-block] [padding:5px_8px] [border-radius:8px] [background:#fff2c7] [color:#815c00] [font-weight:900] [white-space:nowrap] [background:var(--warning-soft)] [color:var(--warning)]">
                      <StarIcon size={13} weight="fill" aria-hidden="true" />
                      {review.rating?.toFixed(1) || "—"}
                    </span>
                  </td>
                  <td>
                    <p className="review-copy [min-width:230px] [max-width:360px] [margin:0] [line-height:1.45] max-[800px]:[min-width:0] max-[800px]:[max-width:none] max-[800px]:[display:-webkit-box] max-[800px]:[overflow:hidden] max-[800px]:[-webkit-box-orient:vertical] max-[800px]:[-webkit-line-clamp:3]">
                      {review.description || "No written comment"}
                    </p>
                  </td>
                  <td>
                    <div className="dish-tags [display:flex] [flex-direction:column] [align-items:flex-start] [gap:5px] [min-width:150px] [&_span]:[padding:4px_7px] [&_span]:[border-radius:6px] [&_span]:[background:var(--soft)] [&_span]:[font-size:11px] [&_span]:[font-weight:700] [&_small]:[color:var(--muted)] [&.compact]:[display:inline-flex] [&.compact]:[flex-direction:row] [&.compact]:[align-items:center] [&.compact]:[gap:6px] [&.compact]:[width:auto] [&.compact]:[max-width:190px] [&.compact]:[min-width:0] [&.compact]:[white-space:nowrap] [&.compact_span]:[display:block] [&.compact_span]:[flex:0_1_auto] [&.compact_span]:[max-width:112px] [&.compact_span]:[overflow:hidden] [&.compact_span]:[text-overflow:ellipsis] [&.compact_span]:[white-space:nowrap] [&.compact_small]:[white-space:nowrap] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]">
                      {review.items.length ? (
                        <>
                          <span>{review.items[0].name}</span>
                          {review.items.length > 1 && (
                            <small>+{review.items.length - 1} more</small>
                          )}
                        </>
                      ) : (
                        <small>—</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <small>
                      {review._count.likes} likes · {review._count.comments}{" "}
                      comments
                    </small>
                  </td>
                  <td>
                    <small>
                      {review.createdAt
                        ? new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                          }).format(new Date(review.createdAt))
                        : "—"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

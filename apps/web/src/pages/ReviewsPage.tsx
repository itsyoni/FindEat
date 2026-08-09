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
      <div className="page-stack review-detail-page">
        <button
          className="review-detail-back"
          onClick={() => setSelectedReview(null)}
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />
          Back to public reviews
        </button>

        <article className="review-detail-card">
          <div className="review-detail-heading">
            <div className="reviewer review-detail-reviewer">
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
            <div className="review-detail-rating">
              <StarIcon size={18} weight="fill" aria-hidden="true" />
              <strong>{selectedReview.rating?.toFixed(1) || "—"}</strong>
              <span>/ 10</span>
            </div>
          </div>

          {selectedReview.imageUrl && (
            <img
              className="review-detail-cover"
              src={selectedReview.imageUrl}
              alt="Review"
            />
          )}

          <div className="review-detail-body">
            <div className="review-detail-copy">
              <span>Full review</span>
              <p>
                {selectedReview.description || "No written comment was added."}
              </p>
            </div>

            <div className="review-detail-meta">
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

            <section className="review-detail-dishes">
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
                <p className="muted">No dishes were attached to this review.</p>
              ) : (
                <div className="review-dish-grid">
                  {selectedReview.items.map((item) => (
                    <article key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        {item.rating != null && (
                          <span>
                            <StarIcon size={12} weight="fill" aria-hidden="true" />
                            {item.rating}/10
                          </span>
                        )}
                      </div>
                      {item.text && <p>{item.text}</p>}
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
    <div className="page-stack reviews-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER FEEDBACK</p>
          <h2>Public reviews</h2>
          <p className="muted">
            Only public reviews are visible here and included in your public
            rating. Friends-only and private reviews remain private.
          </p>
        </div>
        <div className="review-summary">
          <strong>{Number.isFinite(average) ? average.toFixed(1) : "—"}</strong>
          <span>public average</span>
        </div>
      </div>
      <div className="review-toolbar">
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
        <div className="empty">
          <StarIcon size={34} weight="duotone" aria-hidden="true" />
          <h3>No public reviews yet</h3>
          <p>New public customer reviews will appear here automatically.</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="empty">
          <h3>No matching reviews</h3>
          <p>Try a different search.</p>
        </div>
      ) : (
        <div className="review-table-wrap">
          <table className="review-table">
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
                  className="review-table-row"
                  key={review.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open review by ${review.author.username}`}
                  onClick={() => setSelectedReview(review)}
                  onKeyDown={(event) => handleRowKeyDown(event, review)}
                >
                  <td>
                    <div className="reviewer">
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
                    <span className="rating-pill">
                      <StarIcon size={13} weight="fill" aria-hidden="true" />
                      {review.rating?.toFixed(1) || "—"}
                    </span>
                  </td>
                  <td>
                    <p className="review-copy">
                      {review.description || "No written comment"}
                    </p>
                  </td>
                  <td>
                    <div className="dish-tags compact">
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

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/csr/ArrowsLeftRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { UserPlusIcon } from "@phosphor-icons/react/dist/csr/UserPlus";
import type {
  AdminUser,
  RestaurantOwnershipRecord,
  RestaurantOwnershipUser,
} from "@findeat/types";
import { request } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";

type OwnerAction =
  | { kind: "add"; restaurantId: string }
  | { kind: "transfer"; restaurantId: string; fromUserId: string }
  | null;

function UserSummary({ user }: { user: RestaurantOwnershipUser }) {
  return (
    <div className="admin-user-identity">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" />
      ) : (
        <span>{user.username.charAt(0).toUpperCase()}</span>
      )}
      <div>
        <strong>{user.username}</strong>
        <small>{user.email}</small>
      </div>
    </div>
  );
}

export function RestaurantOwnershipManager() {
  const [restaurants, setRestaurants] = useState<RestaurantOwnershipRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<OwnerAction>(null);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [expandedOwners, setExpandedOwners] = useState<Record<string, boolean>>({});

  async function load(nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const suffix = nextQuery.trim()
        ? `?q=${encodeURIComponent(nextQuery.trim())}`
        : "";
      setRestaurants(
        await request<RestaurantOwnershipRecord[]>(
          `/admin/restaurant-ownership${suffix}`,
          { cache: "reload" },
        ),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load restaurant ownership",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    request<RestaurantOwnershipRecord[]>("/admin/restaurant-ownership")
      .then((records) => {
        if (!cancelled) setRestaurants(records);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not load restaurant ownership",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function searchRestaurants(event: FormEvent) {
    event.preventDefault();
    await load(query);
  }

  function startAction(nextAction: NonNullable<OwnerAction>) {
    setAction(nextAction);
    setUserQuery("");
    setUsers([]);
    setError("");
  }

  async function searchUsers(event: FormEvent) {
    event.preventDefault();
    if (userQuery.trim().length < 2) {
      setError("Enter at least 2 characters to search users.");
      return;
    }
    setSearchingUsers(true);
    setError("");
    try {
      setUsers(
        await request<AdminUser[]>(
          `/admin/users?q=${encodeURIComponent(userQuery.trim())}`,
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not search users");
    } finally {
      setSearchingUsers(false);
    }
  }

  async function chooseUser(user: AdminUser) {
    if (!action) return;
    const actionKey = `${action.kind}:${action.restaurantId}:${user.id}`;
    setWorkingId(actionKey);
    setError("");
    try {
      if (action.kind === "add") {
        await request(`/admin/restaurants/${action.restaurantId}/owners`, {
          method: "POST",
          body: JSON.stringify({ userId: user.id }),
        });
      } else {
        await request(
          `/admin/restaurants/${action.restaurantId}/owners/${action.fromUserId}/transfer`,
          {
            method: "POST",
            body: JSON.stringify({ toUserId: user.id }),
          },
        );
      }
      setAction(null);
      setUsers([]);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update ownership");
    } finally {
      setWorkingId(null);
    }
  }

  async function removeOwner(
    restaurant: RestaurantOwnershipRecord,
    owner: RestaurantOwnershipRecord["members"][number],
  ) {
    const removingLastOwner = restaurant.members.length === 1;
    const warning = removingLastOwner
      ? `Remove ${owner.user.username} from ${restaurant.name}? This is the final owner, so the restaurant will become unclaimed.`
      : `Remove ${owner.user.username} as an owner of ${restaurant.name}?`;
    if (!(await confirmAction({
      title: "Remove restaurant owner?",
      message: warning,
      confirmLabel: "Remove owner",
      tone: "destructive",
    }))) return;

    const actionKey = `remove:${restaurant.id}:${owner.user.id}`;
    setWorkingId(actionKey);
    setError("");
    try {
      await request(
        `/admin/restaurants/${restaurant.id}/owners/${owner.user.id}`,
        { method: "DELETE" },
      );
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not remove owner");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OWNERSHIP CONTROL</p>
          <h2>Restaurant ownership</h2>
          <p className="muted">
            Add, remove, or transfer dashboard access for any restaurant.
          </p>
        </div>
        <span className="admin-total">{restaurants.length} shown</span>
      </div>

      <form className="ownership-search" onSubmit={searchRestaurants}>
        <MagnifyingGlassIcon size={20} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search restaurant, owner, username, or email…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="primary" disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {error && <p className="error banner">{error}</p>}

      {loading ? (
        <div className="empty ownership-empty">Loading restaurants…</div>
      ) : restaurants.length === 0 ? (
        <div className="empty ownership-empty">
          <StorefrontIcon size={32} weight="duotone" aria-hidden="true" />
          <h3>No restaurants found</h3>
          <p>Try searching with another restaurant or owner name.</p>
        </div>
      ) : (
        <div className="ownership-list">
          {restaurants.map((restaurant) => (
            <article className="ownership-card" key={restaurant.id}>
              <div className="ownership-restaurant">
                {restaurant.logoUrl ? (
                  <img src={restaurant.logoUrl} alt="" />
                ) : (
                  <span>{restaurant.name.charAt(0).toUpperCase()}</span>
                )}
                <div>
                  <div className="ownership-title">
                    <h3>{restaurant.name}</h3>
                    <b className={restaurant.status === "CLAIMED" ? "claimed" : "unclaimed"}>
                      {restaurant.status === "CLAIMED" ? "Claimed" : "Unclaimed"}
                    </b>
                  </div>
                  <p>
                    {[restaurant.address, restaurant.city].filter(Boolean).join(", ") ||
                      "No address provided"}
                  </p>
                </div>
                <button
                  className="secondary ownership-add"
                  onClick={() => startAction({ kind: "add", restaurantId: restaurant.id })}
                >
                  <UserPlusIcon size={17} weight="bold" aria-hidden="true" /> Add owner
                </button>
              </div>

              <div className="ownership-columns">
                <section>
                  <h4>Current owners <span>{restaurant.members.length}</span></h4>
                  {restaurant.members.length === 0 ? (
                    <p className="ownership-none">No one currently has owner access.</p>
                  ) : (
                    <>
                      {restaurant.members.length > 1 && (
                        <button
                          className="owners-accordion-trigger"
                          aria-expanded={!!expandedOwners[restaurant.id]}
                          onClick={() =>
                            setExpandedOwners((current) => ({
                              ...current,
                              [restaurant.id]: !current[restaurant.id],
                            }))
                          }
                        >
                          <span className="owner-avatar-stack" aria-hidden="true">
                            {restaurant.members.slice(0, 3).map((owner) =>
                              owner.user.avatarUrl ? (
                                <img key={owner.id} src={owner.user.avatarUrl} alt="" />
                              ) : (
                                <i key={owner.id}>
                                  {owner.user.username
                                    .charAt(0)
                                    .toUpperCase()}
                                </i>
                              ),
                            )}
                          </span>
                          <span className="owners-accordion-copy">
                            <strong>{restaurant.members.length} owners</strong>
                            <small>
                              {restaurant.members
                                .slice(0, 2)
                                .map((owner) => owner.user.username)
                                .join(", ")}
                              {restaurant.members.length > 2
                                ? ` +${restaurant.members.length - 2}`
                                : ""}
                            </small>
                          </span>
                          <span className="owners-manage-label">
                            {expandedOwners[restaurant.id] ? "Close" : "Manage"}
                          </span>
                          <CaretDownIcon
                            className={expandedOwners[restaurant.id] ? "expanded" : ""}
                            size={17}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </button>
                      )}
                      {(restaurant.members.length === 1 ||
                        expandedOwners[restaurant.id]) && (
                        <div className="ownership-owner-list">
                          {restaurant.members.map((owner) => (
                            <div className="ownership-owner" key={owner.id}>
                              <UserSummary user={owner.user} />
                              <div className="ownership-actions">
                                <button
                                  className="ownership-transfer"
                                  onClick={() =>
                                    startAction({
                                      kind: "transfer",
                                      restaurantId: restaurant.id,
                                      fromUserId: owner.user.id,
                                    })
                                  }
                                >
                                  <ArrowsLeftRightIcon size={16} aria-hidden="true" /> Transfer
                                </button>
                                <button
                                  className="ownership-remove"
                                  disabled={workingId === `remove:${restaurant.id}:${owner.user.id}`}
                                  onClick={() => void removeOwner(restaurant, owner)}
                                  aria-label={`Remove ${owner.user.username} as owner`}
                                >
                                  <TrashIcon size={17} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
                <section>
                  <h4>Recent claim history <span>{restaurant.claims.length}</span></h4>
                  {restaurant.claims.length === 0 ? (
                    <p className="ownership-none">No claim requests for this restaurant.</p>
                  ) : (
                    restaurant.claims.map((claim) => (
                      <div className="ownership-claim" key={claim.id}>
                        <UserSummary user={claim.user} />
                        <span className={`claim-status ${claim.status.toLowerCase()}`}>
                          {claim.status.toLowerCase()}
                        </span>
                      </div>
                    ))
                  )}
                </section>
              </div>

              {action?.restaurantId === restaurant.id && (
                <div className="ownership-picker">
                  <div>
                    <strong>
                      {action.kind === "add" ? "Add an owner" : "Transfer ownership"}
                    </strong>
                    <p>Choose an existing FindEat user.</p>
                  </div>
                  <button className="ownership-close" onClick={() => setAction(null)}>
                    Cancel
                  </button>
                  <form onSubmit={searchUsers}>
                    <input
                      autoFocus
                      type="search"
                      placeholder="Search name, username, or email…"
                      value={userQuery}
                      onChange={(event) => setUserQuery(event.target.value)}
                    />
                    <button className="primary" disabled={searchingUsers}>
                      {searchingUsers ? "Searching…" : "Find user"}
                    </button>
                  </form>
                  {users.length > 0 && (
                    <div className="ownership-user-results">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          disabled={workingId?.endsWith(`:${user.id}`)}
                          onClick={() => void chooseUser(user)}
                        >
                          <UserSummary user={user} />
                          <b>{workingId?.endsWith(`:${user.id}`) ? "Saving…" : "Choose"}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

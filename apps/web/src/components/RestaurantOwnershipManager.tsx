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
import { UserIdentity } from "./UserIdentity";

type OwnerAction =
  | { kind: "add"; restaurantId: string }
  | { kind: "transfer"; restaurantId: string; fromUserId: string }
  | null;

function UserSummary({ user }: { user: RestaurantOwnershipUser }) {
  return <UserIdentity user={user} />;
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
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">OWNERSHIP CONTROL</p>
          <h2>Restaurant ownership</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Add, remove, or transfer dashboard access for any restaurant.
          </p>
        </div>
        <span className="admin-total [padding:8px_12px] [border-radius:20px] [background:#f0e9f8] [color:#68418b] [font-size:13px] [font-weight:800] [background:var(--purple-soft)] [color:var(--purple)]">{restaurants.length} shown</span>
      </div>

      <form className="ownership-search [display:grid] [grid-template-columns:auto_minmax(0,1fr)_auto] [align-items:center] [gap:10px] [padding:10px_10px_10px_16px] [margin-bottom:20px] [border:1px_solid_var(--line)] [border-radius:16px] [background:var(--surface)] [color:var(--muted)] [&_input]:[padding-left:4px] [&_input]:[border:0] [&_input]:[box-shadow:none] [&_input:focus]:[box-shadow:none] max-[800px]:[grid-template-columns:auto_minmax(0,1fr)] max-[800px]:[padding:9px_10px] max-[800px]:[&_button]:[grid-column:1/-1] max-[800px]:[&_button]:[width:100%]" onSubmit={searchRestaurants}>
        <MagnifyingGlassIcon size={20} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search restaurant, owner, username, or email…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}

      {loading ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px] ownership-empty [margin-top:18px]">Loading restaurants…</div>
      ) : restaurants.length === 0 ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px] ownership-empty [margin-top:18px]">
          <StorefrontIcon size={32} weight="duotone" aria-hidden="true" />
          <h3>No restaurants found</h3>
          <p>Try searching with another restaurant or owner name.</p>
        </div>
      ) : (
        <div className="ownership-list [display:grid] [gap:16px]">
          {restaurants.map((restaurant) => (
            <article className="ownership-card [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] dark:[box-shadow:0_8px_28px_#0003]" key={restaurant.id}>
              <div className="ownership-restaurant [display:grid] [grid-template-columns:52px_minmax(0,1fr)_auto] [align-items:center] [gap:14px] [padding:20px_22px] [border-bottom:1px_solid_var(--line)] [&>img]:[display:grid] [&>img]:[place-items:center] [&>img]:[width:52px] [&>img]:[height:52px] [&>img]:[border-radius:50%] [&>img]:[object-fit:cover] [&>img]:[background:#eee7df] [&>img]:[font-size:20px] [&>img]:[font-weight:900] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[width:52px] [&>span]:[height:52px] [&>span]:[border-radius:50%] [&>span]:[object-fit:cover] [&>span]:[background:#eee7df] [&>span]:[font-size:20px] [&>span]:[font-weight:900] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] max-[800px]:[grid-template-columns:46px_minmax(0,1fr)] max-[800px]:[&>img]:[width:46px] max-[800px]:[&>img]:[height:46px] max-[800px]:[&>span]:[width:46px] max-[800px]:[&>span]:[height:46px] [&>img]:[background:var(--avatar-surface)] [&>span]:[background:var(--avatar-surface)] max-[800px]:[padding:16px]">
                {restaurant.logoUrl ? (
                  <img src={restaurant.logoUrl} alt="" />
                ) : (
                  <span>{restaurant.name.charAt(0).toUpperCase()}</span>
                )}
                <div>
                  <div className="ownership-title [display:flex] [align-items:center] [gap:9px] [&_h3]:[overflow:hidden] [&_h3]:[text-overflow:ellipsis] [&_h3]:[white-space:nowrap] [&_b]:[flex:0_0_auto] [&_.unclaimed]:[padding:4px_9px] [&_.unclaimed]:[border-radius:20px] [&_.unclaimed]:[background:#fff0e8] [&_.unclaimed]:[color:#b94a2e] [&_.unclaimed]:[font-size:10px] [&_.unclaimed]:[text-transform:capitalize] [&_.unclaimed]:[background:var(--accent-soft)] [&_.unclaimed]:[color:var(--accent-dark)] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:5px]">
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
                  className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] ownership-add [display:flex] [align-items:center] [gap:7px] [white-space:nowrap] max-[800px]:[grid-column:1/-1] max-[800px]:[justify-content:center]"
                  onClick={() => startAction({ kind: "add", restaurantId: restaurant.id })}
                >
                  <UserPlusIcon size={17} weight="bold" aria-hidden="true" /> Add owner
                </button>
              </div>

              <div className="ownership-columns [display:grid] [grid-template-columns:1fr_1fr] [&>section]:[min-width:0] [&>section]:[padding:20px_22px] [&>section+section]:[border-left:1px_solid_var(--line)] [&_h4]:[display:flex] [&_h4]:[align-items:center] [&_h4]:[gap:7px] [&_h4]:[margin-bottom:10px] [&_h4]:[font-size:12px] [&_h4]:[text-transform:uppercase] [&_h4]:[letter-spacing:.06em] [&_h4_span]:[display:grid] [&_h4_span]:[place-items:center] [&_h4_span]:[min-width:20px] [&_h4_span]:[height:20px] [&_h4_span]:[padding:0_5px] [&_h4_span]:[border-radius:10px] [&_h4_span]:[background:var(--soft)] [&_h4_span]:[color:var(--muted)] [&_h4_span]:[font-size:10px] max-[800px]:[grid-template-columns:1fr] max-[800px]:[&>section+section]:[border-top:1px_solid_var(--line)] max-[800px]:[&>section+section]:[border-left:0]">
                <section>
                  <h4>Current owners <span>{restaurant.members.length}</span></h4>
                  {restaurant.members.length === 0 ? (
                    <p className="ownership-none [margin:18px_0_8px] [color:var(--muted)] [font-size:12px]">No one currently has owner access.</p>
                  ) : (
                    <>
                      {restaurant.members.length > 1 && (
                        <button
                          className="owners-accordion-trigger [display:grid] [grid-template-columns:auto_minmax(0,1fr)_auto_auto] [align-items:center] [gap:11px] [width:100%] [min-height:66px] [padding:10px_12px] [border:1px_solid_var(--line)] [border-radius:14px] [background:var(--soft)] [color:var(--ink)] [text-align:left] [&:hover]:[border-color:#d8c9bb] [&:hover]:[background:#f2efeb] [&:hover_.owner-avatar-stack_img]:[border-color:#f2efeb] [&:hover_.owner-avatar-stack_i]:[border-color:#f2efeb] [&>svg]:[transition:transform_.18s_ease] [&>svg.expanded]:[transform:rotate(180deg)] [&:hover]:[border-color:var(--line)] [&:hover]:[background:var(--surface-hover)] dark:[&:hover_.owner-avatar-stack_img]:[border-color:var(--soft)] dark:[&:hover_.owner-avatar-stack_i]:[border-color:var(--soft)] max-[800px]:[grid-template-columns:auto_minmax(0,1fr)_auto]"
                          aria-expanded={!!expandedOwners[restaurant.id]}
                          onClick={() =>
                            setExpandedOwners((current) => ({
                              ...current,
                              [restaurant.id]: !current[restaurant.id],
                            }))
                          }
                        >
                          <span className="owner-avatar-stack [display:flex] [align-items:center] [padding-left:8px] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:34px] [&_img]:[height:34px] [&_img]:[margin-left:-8px] [&_img]:[border:2px_solid_var(--soft)] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#e7ded5] [&_img]:[color:var(--ink)] [&_img]:[font-size:11px] [&_img]:[font-style:normal] [&_img]:[font-weight:900] [&_i]:[display:grid] [&_i]:[place-items:center] [&_i]:[width:34px] [&_i]:[height:34px] [&_i]:[margin-left:-8px] [&_i]:[border:2px_solid_var(--soft)] [&_i]:[border-radius:50%] [&_i]:[object-fit:cover] [&_i]:[background:#e7ded5] [&_i]:[color:var(--ink)] [&_i]:[font-size:11px] [&_i]:[font-style:normal] [&_i]:[font-weight:900] [&_img]:[background:var(--avatar-surface)] [&_i]:[background:var(--avatar-surface)] dark:[&_img]:[border-color:var(--soft)] dark:[&_i]:[border-color:var(--soft)]" aria-hidden="true">
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
                          <span className="owners-accordion-copy [min-width:0] [&_strong]:[display:block] [&_strong]:[overflow:hidden] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_small]:[display:block] [&_small]:[overflow:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_strong]:[font-size:12px] [&_small]:[margin-top:3px] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px]">
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
                          <span className="owners-manage-label [color:var(--muted)] [font-size:10px] [font-weight:800] max-[800px]:[display:none]">
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
                        <div className="ownership-owner-list [margin-top:8px] [padding:0_3px] [border-top:1px_solid_var(--line)]">
                          {restaurant.members.map((owner) => (
                            <div className="ownership-owner [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [min-height:67px] [padding:10px_0] [border-top:1px_solid_var(--line)] [&:first-of-type]:[border-top:0] [&_.admin-user-identity]:[min-width:0] [&_.admin-user-identity>img]:[width:37px] [&_.admin-user-identity>img]:[height:37px] [&_.admin-user-identity>span]:[width:37px] [&_.admin-user-identity>span]:[height:37px] [&_.admin-user-identity_small]:[max-width:250px] [&_.admin-user-identity_small]:[font-size:10px] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]" key={owner.id}>
                              <UserSummary user={owner.user} />
                              <div className="ownership-actions [display:flex] [align-items:center] [gap:5px] max-[600px]:[align-items:stretch] max-[600px]:[flex-direction:column]">
                                <button
                                  className="ownership-transfer [display:flex] [align-items:center] [gap:5px] [padding:8px_9px] [border:0] [border-radius:9px] [background:var(--soft)] [color:#555] [font-size:11px] [font-weight:800] [color:var(--muted)]"
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
                                  className="ownership-remove [display:flex] [align-items:center] [gap:5px] [padding:8px_9px] [border:0] [border-radius:9px] [background:var(--soft)] [color:#555] [font-size:11px] [font-weight:800] [color:#a6382a] [&:hover]:[background:#fff0ed] [color:var(--danger)] [&:hover]:[background:var(--danger-soft)] [&:hover]:[color:var(--danger)]"
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
                    <p className="ownership-none [margin:18px_0_8px] [color:var(--muted)] [font-size:12px]">No claim requests for this restaurant.</p>
                  ) : (
                    restaurant.claims.map((claim) => (
                      <div className="ownership-claim [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [min-height:67px] [padding:10px_0] [border-top:1px_solid_var(--line)] [&:first-of-type]:[border-top:0] [&_.admin-user-identity]:[min-width:0] [&_.admin-user-identity>img]:[width:37px] [&_.admin-user-identity>img]:[height:37px] [&_.admin-user-identity>span]:[width:37px] [&_.admin-user-identity>span]:[height:37px] [&_.admin-user-identity_small]:[max-width:250px] [&_.admin-user-identity_small]:[font-size:10px] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]" key={claim.id}>
                        <UserSummary user={claim.user} />
                        <span className={`claim-status [padding:5px_8px] [border-radius:8px] [font-size:10px] [font-weight:900] [text-transform:capitalize] [&.approved]:[background:#e6f4ec] [&.approved]:[color:var(--green)] [&.pending]:[background:#fff0cc] [&.pending]:[color:#8a6200] [&.rejected]:[background:#fff0ed] [&.rejected]:[color:#a6382a] [&.pending]:[background:var(--warning-soft)] [&.pending]:[color:var(--warning)] [&.approved]:[background:var(--success-soft)] [&.approved]:[color:var(--success)] [&.rejected]:[background:var(--accent-soft)] [&.rejected]:[color:var(--accent-dark)] ${claim.status.toLowerCase()}`}>
                          {claim.status.toLowerCase()}
                        </span>
                      </div>
                    ))
                  )}
                </section>
              </div>

              {action?.restaurantId === restaurant.id && (
                <div className="ownership-picker [display:grid] [grid-template-columns:minmax(0,1fr)_auto] [gap:15px] [padding:20px_22px] [border-top:1px_solid_#eadfd7] [background:#fff8f4] [&_h4]:[margin:0] [&_p]:[margin:0] [&_strong]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&>form]:[grid-column:1/-1] [&>form]:[display:grid] [&>form]:[grid-template-columns:minmax(0,1fr)_auto] [&>form]:[gap:9px] dark:[background:#2c211e] [border-color:var(--line)] [background:color-mix(in_srgb,var(--accent-soft)_54%,var(--surface))] max-[800px]:[grid-template-columns:1fr] max-[800px]:[&>form]:[grid-template-columns:1fr] max-[800px]:[&>form_button]:[width:100%]">
                  <div>
                    <strong>
                      {action.kind === "add" ? "Add an owner" : "Transfer ownership"}
                    </strong>
                    <p>Choose an existing FindEat user.</p>
                  </div>
                  <button className="ownership-close [display:flex] [align-items:center] [gap:5px] [padding:8px_9px] [border:0] [border-radius:9px] [background:var(--soft)] [color:#555] [font-size:11px] [font-weight:800] [align-self:start] [background:transparent] [color:var(--muted)]" onClick={() => setAction(null)}>
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
                    <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={searchingUsers}>
                      {searchingUsers ? "Searching…" : "Find user"}
                    </button>
                  </form>
                  {users.length > 0 && (
                    <div className="ownership-user-results [grid-column:1/-1] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:14px] [background:var(--surface)] [&>button]:[display:flex] [&>button]:[align-items:center] [&>button]:[justify-content:space-between] [&>button]:[gap:15px] [&>button]:[width:100%] [&>button]:[min-height:66px] [&>button]:[padding:10px_13px] [&>button]:[border:0] [&>button]:[border-bottom:1px_solid_var(--line)] [&>button]:[background:var(--surface)] [&>button]:[text-align:left] [&>button:last-child]:[border-bottom:0] [&>button:hover]:[background:var(--soft)] [&>button>b]:[color:var(--green)] [&>button>b]:[font-size:11px] max-[600px]:[&>button]:[align-items:flex-start] max-[600px]:[&>button]:[flex-direction:column]">
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

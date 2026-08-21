import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import type { AdminRestaurantAddressChangeRequest } from "@findeat/types";
import { request } from "../lib/api";
import { UserIdentity } from "./UserIdentity";

export function AddressChangeRequestsPanel() {
  const [items, setItems] = useState<AdminRestaurantAddressChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(
        await request<AdminRestaurantAddressChangeRequest[]>(
          "/restaurants/address-change-requests/pending",
        ),
      );
      setError("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load address requests",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading is intentionally tied to opening this admin panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function decide(
    item: AdminRestaurantAddressChangeRequest,
    decision: "approve" | "reject",
  ) {
    const reason = reasons[item.id]?.trim();
    if (decision === "reject" && !reason) {
      setError("Add a rejection reason before rejecting the request.");
      return;
    }
    setWorkingId(item.id);
    setError("");
    try {
      await request(
        `/restaurants/address-change-requests/${item.id}/${decision}`,
        {
          method: "POST",
          body:
            decision === "reject" ? JSON.stringify({ reason }) : undefined,
        },
      );
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : `Could not ${decision} request`,
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <>
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">LOCATION VERIFICATION</p>
          <h2>Address change requests</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Review restaurant moves and corrections before changing their map
            location.
          </p>
        </div>
        <span className="claim-count [padding:8px_12px] [border-radius:20px] [background:#fff0ea] [color:#bf4629] [font-size:13px] [font-weight:800] [background:var(--accent-soft)] [color:var(--accent-dark)]">{items.length} pending</span>
      </div>
      {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
      {loading ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">Loading address requests…</div>
      ) : items.length === 0 ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
          <CheckCircleIcon size={30} weight="duotone" aria-hidden="true" />
          <h3>All addresses are up to date</h3>
          <p>There are no pending restaurant address requests.</p>
        </div>
      ) : (
        <div className="claims-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:16px] max-[800px]:[grid-template-columns:1fr]">
          {items.map((item) => (
            <article className="claim-card [padding:24px] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] dark:[box-shadow:0_8px_28px_#0003] max-[800px]:[padding:19px] address-review-card [&_.claim-person_.admin-user-identity]:[margin-top:8px]" key={item.id}>
              <div className="claim-top [display:flex] [align-items:center] [gap:13px] [&>img]:[width:48px] [&>img]:[height:48px] [&>img]:[flex:0_0_auto] [&>img]:[border-radius:14px] [&>img]:[object-fit:cover] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px]">
                {item.restaurant.logoUrl ? (
                  <img src={item.restaurant.logoUrl} alt="" />
                ) : (
                  <div className="restaurant-letter [display:grid] [place-items:center] [flex:0_0_auto] [width:48px] [height:48px] [border-radius:14px] [background:#f3e8df] [font-size:20px] [font-weight:900] [background:var(--avatar-surface)]">
                    {item.restaurant.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3>{item.restaurant.name}</h3>
                  <p>{item.restaurant.city || "City not available"}</p>
                </div>
              </div>
              <div className="address-comparison [display:grid] [gap:9px] [margin-top:20px] [&>div]:[padding:13px_15px] [&>div]:[border:1px_solid_var(--line)] [&>div]:[border-radius:12px] [&>div]:[background:var(--surface-subtle)] [&_.proposed]:[border-color:#b9dfc8] [&_.proposed]:[background:#f0faf4] [&_span]:[display:block] [&_span]:[margin-bottom:5px] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_span]:[font-weight:900] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:.07em] [&_p]:[margin:0] [&_p]:[font-size:13px] [&_p]:[line-height:1.45] [&_small]:[display:block] [&_small]:[margin-top:5px] [&_small]:[color:#27714a] [&_small]:[font-weight:800] dark:[&>div]:[background:var(--surface-subtle)] [&_.proposed]:[border-color:var(--success-border)] [&_.proposed]:[background:var(--success-soft)] [&_small]:[color:var(--success)]">
                <div>
                  <span>Current address</span>
                  <p>{item.restaurant.address || "No current address"}</p>
                </div>
                <div className="proposed">
                  <span>Proposed address</span>
                  <p>{item.proposedAddress}</p>
                  <small>{item.proposedCity}</small>
                </div>
              </div>
              <div className="claim-person [&_p]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [margin-top:20px] [padding:15px] [border-radius:13px] [background:var(--soft)] [&_span]:[display:block] [&_span]:[margin-bottom:6px] [&_span]:[color:var(--muted)] [&_span]:[font-size:11px] [&_span]:[font-weight:800] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:0.07em] [.address-review-card_&_.admin-user-identity]:[margin-top:8px]">
                <span>Requested by</span>
                <UserIdentity user={item.requestedBy} />
              </div>
              {item.reason && (
                <div className="claim-evidence [&_p]:[margin:0] [margin-top:20px] [padding:15px] [border-radius:13px] [background:var(--soft)] [&_span]:[display:block] [&_span]:[margin-bottom:6px] [&_span]:[color:var(--muted)] [&_span]:[font-size:11px] [&_span]:[font-weight:800] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:0.07em] [&_p]:[line-height:1.5]">
                  <span>Reason</span>
                  <p>{item.reason}</p>
                </div>
              )}
              <textarea
                className="address-rejection-reason [width:100%] [margin-top:16px] [min-height:62px] [resize:vertical]"
                value={reasons[item.id] || ""}
                onChange={(event) =>
                  setReasons((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder="Rejection reason (required only when rejecting)"
                rows={2}
              />
              <div className="claim-actions [display:grid] [grid-template-columns:1fr_1.5fr] [gap:9px] [margin-top:22px] [&_.reject]:[color:#a6382a] [&_.approve]:[background:var(--green)] [&_.reject]:[color:var(--danger)] max-[600px]:[grid-template-columns:1fr]">
                <button
                  className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] reject"
                  disabled={workingId === item.id}
                  onClick={() => void decide(item, "reject")}
                >
                  Reject
                </button>
                <button
                  className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))] approve"
                  disabled={workingId === item.id}
                  onClick={() => void decide(item, "approve")}
                >
                  {workingId === item.id ? "Working…" : "Approve address"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

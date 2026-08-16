import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { SealCheckIcon } from "@phosphor-icons/react/dist/csr/SealCheck";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { HeadsetIcon } from "@phosphor-icons/react/dist/csr/Headset";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { MapPinLineIcon } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { MusicNotesIcon } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { LightbulbIcon } from "@phosphor-icons/react/dist/csr/Lightbulb";
import type {
  AdminDashboardSection,
  AdminUser,
  BusinessAccount,
  RestaurantClaim,
} from "@findeat/types";
import { AccountAvatar } from "../components/AccountAvatar";
import { RestaurantOwnershipManager } from "../components/RestaurantOwnershipManager";
import { SupportTicketsPanel } from "../components/SupportTicketsPanel";
import { ProductUpdatesAdmin } from "../components/ProductUpdatesAdmin";
import { SettingsPage } from "./SettingsPage";
import { WEB_VERSION } from "../lib/version";
import { UserIdentity } from "../components/UserIdentity";
import { ModerationPanel } from "../components/ModerationPanel";
import { AddressChangeRequestsPanel } from "../components/AddressChangeRequestsPanel";
import { SoundCatalogAdmin } from "../components/SoundCatalogAdmin";
import { request } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";

export function AdminPage({
  claims,
  admins,
  account,
  reload,
  onLogout,
  section,
  onNavigate,
  onBackToBusiness,
}: {
  claims: RestaurantClaim[];
  admins: AdminUser[];
  account: BusinessAccount;
  reload: () => Promise<void>;
  onLogout: () => void;
  section: AdminDashboardSection;
  onNavigate: (section: AdminDashboardSection) => void;
  onBackToBusiness?: () => void;
}) {
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [visitedSections, setVisitedSections] = useState<
    Set<AdminDashboardSection>
  >(() => new Set([section]));

  useEffect(() => {
    // Preserve loaded admin panels when moving between sections.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedSections((current) => {
      if (current.has(section)) return current;
      return new Set([...current, section]);
    });
  }, [section]);

  async function decide(claimId: string, decision: "approve" | "reject") {
    if (
      decision === "reject" &&
      !(await confirmAction({
        title: "Reject this restaurant claim?",
        message: "The claimant will be notified that their request was rejected.",
        confirmLabel: "Reject claim",
        tone: "warning",
      }))
    )
      return;
    setWorkingId(claimId);
    setError("");
    try {
      await request(`/restaurants/claims/${claimId}/${decision}`, {
        method: "POST",
        body:
          decision === "reject"
            ? JSON.stringify({ reason: "Rejected by admin" })
            : undefined,
      });
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : `Could not ${decision} claim`,
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function searchUsers(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least 2 characters to search users.");
      return;
    }
    setSearching(true);
    setSearched(true);
    setError("");
    try {
      setResults(
        await request<AdminUser[]>(
          `/admin/users?q=${encodeURIComponent(query.trim())}`,
        ),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not search users",
      );
    } finally {
      setSearching(false);
    }
  }

  async function grantAdmin(user: AdminUser) {
    setWorkingId(user.id);
    setError("");
    try {
      await request(`/admin/admins/${user.id}`, { method: "POST" });
      setResults((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, isAdmin: true } : item,
        ),
      );
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not add admin",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function revokeAdmin(user: AdminUser) {
    if (confirmRemoveId !== user.id) {
      setConfirmRemoveId(user.id);
      return;
    }
    setWorkingId(user.id);
    setError("");
    try {
      await request(`/admin/admins/${user.id}`, { method: "DELETE" });
      setConfirmRemoveId(null);
      setResults((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, isAdmin: false } : item,
        ),
      );
      await reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not remove admin",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="dashboard admin-dashboard">
      <aside className={mobileNavOpen ? "mobile-nav-open" : ""}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FindEat</strong>
            <small>Admin workspace</small>
          </div>
        </div>
        <div className="admin-chip">
          <ShieldCheckIcon size={22} weight="duotone" aria-hidden="true" />
          <div>
            <strong>Platform administration</strong>
            <small>Restricted access</small>
          </div>
        </div>
        <div className="mobile-nav-bar admin-mobile-nav-bar">
          <div className="mobile-nav-title">
            <ShieldCheckIcon size={20} weight="duotone" aria-hidden="true" />
            <div>
              <strong>Admin workspace</strong>
              <small>FindEat administration</small>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-navigation"
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            {mobileNavOpen ? (
              <XIcon size={21} weight="bold" aria-hidden="true" />
            ) : (
              <ListIcon size={23} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
        <nav id="admin-navigation" onClick={() => setMobileNavOpen(false)}>
          {onBackToBusiness && (
            <button onClick={onBackToBusiness}>
              <ArrowLeftIcon className="nav-icon" weight="duotone" /> Restaurant dashboard
            </button>
          )}
          <button
            className={section === "claims" ? "active" : ""}
            onClick={() => {
              onNavigate("claims");
              setError("");
            }}
          >
            <SealCheckIcon className="nav-icon" weight="duotone" /> Restaurant claims{" "}
            <small className="nav-count">{claims.length}</small>
          </button>
          <button
            className={section === "addresses" ? "active" : ""}
            onClick={() => {
              onNavigate("addresses");
              setError("");
            }}
          >
            <MapPinLineIcon className="nav-icon" weight="duotone" /> Address requests
          </button>
          <button
            className={section === "moderation" ? "active" : ""}
            onClick={() => {
              onNavigate("moderation");
              setError("");
            }}
          >
            <FlagIcon className="nav-icon" weight="duotone" /> Moderation
          </button>
          <button
            className={section === "ownership" ? "active" : ""}
            onClick={() => {
              onNavigate("ownership");
              setError("");
            }}
          >
            <StorefrontIcon className="nav-icon" weight="duotone" /> Ownership
          </button>
          <button
            className={section === "support" ? "active" : ""}
            onClick={() => {
              onNavigate("support");
              setError("");
            }}
          >
            <HeadsetIcon className="nav-icon" weight="duotone" /> Support
          </button>
          <button
            className={section === "feedback" ? "active" : ""}
            onClick={() => {
              onNavigate("feedback");
              setError("");
            }}
          >
            <LightbulbIcon className="nav-icon" weight="duotone" /> Feedback
          </button>
          <button
            className={section === "updates" ? "active" : ""}
            onClick={() => {
              onNavigate("updates");
              setError("");
            }}
          >
            <SparkleIcon className="nav-icon" weight="duotone" /> What’s new
          </button>
          <button
            className={section === "sounds" ? "active" : ""}
            onClick={() => {
              onNavigate("sounds");
              setError("");
            }}
          >
            <MusicNotesIcon className="nav-icon" weight="duotone" /> Sounds
          </button>
          <button
            className={section === "admins" ? "active" : ""}
            onClick={() => {
              onNavigate("admins");
              setError("");
            }}
          >
            <UsersThreeIcon className="nav-icon" weight="duotone" /> Admins{" "}
            <small className="nav-count neutral">{admins.length}</small>
          </button>
          <button
            className={section === "settings" ? "active" : ""}
            onClick={() => {
              onNavigate("settings");
              setError("");
            }}
          >
            <GearSixIcon className="nav-icon" weight="duotone" /> Settings
          </button>
        </nav>
        <div className="aside-footer">
          <p>Admin access</p>
          <small>
            Only trusted users should be able to approve claims or manage other
            admins.
          </small>
          <button onClick={onLogout}>Sign out</button>
          <small className="web-version">Web v{WEB_VERSION}</small>
        </div>
      </aside>
      <main className="content">
        <header>
          <div>
            <strong>Admin workspace</strong>
            <span className="admin-badge">Admin</span>
          </div>
          <AccountAvatar account={account} />
        </header>
        <div className={`admin-content ${section === "support" || section === "feedback" ? "support-admin-content" : ""}`}>
          {(section === "addresses" || visitedSections.has("addresses")) && (
            <div className="admin-page-slot" hidden={section !== "addresses"}>
              <AddressChangeRequestsPanel />
            </div>
          )}
          {(section === "moderation" || visitedSections.has("moderation")) && (
            <div className="admin-page-slot" hidden={section !== "moderation"}>
              <ModerationPanel />
            </div>
          )}
          {(section === "ownership" || visitedSections.has("ownership")) && (
            <div className="admin-page-slot" hidden={section !== "ownership"}>
              <RestaurantOwnershipManager />
            </div>
          )}
          {(section === "support" || visitedSections.has("support")) && (
            <div
              className="admin-page-slot admin-support-slot"
              hidden={section !== "support"}
            >
              <SupportTicketsPanel />
            </div>
          )}
          {(section === "feedback" || visitedSections.has("feedback")) && (
            <div
              className="admin-page-slot admin-support-slot"
              hidden={section !== "feedback"}
            >
              <SupportTicketsPanel mode="feedback" />
            </div>
          )}
          {(section === "updates" || visitedSections.has("updates")) && (
            <div className="admin-page-slot" hidden={section !== "updates"}>
              <ProductUpdatesAdmin />
            </div>
          )}
          {(section === "sounds" || visitedSections.has("sounds")) && (
            <div className="admin-page-slot" hidden={section !== "sounds"}>
              <SoundCatalogAdmin />
            </div>
          )}
          {(section === "settings" || visitedSections.has("settings")) && (
            <div className="admin-page-slot" hidden={section !== "settings"}>
              <SettingsPage />
            </div>
          )}
          {section === "claims" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ADMINISTRATION</p>
                  <h2>Restaurant claims</h2>
                  <p className="muted">
                    Review ownership requests before granting access to
                    restaurant management.
                  </p>
                </div>
                <span className="claim-count">{claims.length} pending</span>
              </div>
              {error && <p className="error banner">{error}</p>}
              {claims.length === 0 ? (
                <div className="empty">
                  <CheckCircleIcon size={30} weight="duotone" aria-hidden="true" />
                  <h3>You’re all caught up</h3>
                  <p>There are no pending restaurant claims.</p>
                </div>
              ) : (
                <div className="claims-grid">
                  {claims.map((claim) => (
                    <article className="claim-card" key={claim.id}>
                      <div className="claim-top">
                        <div className="restaurant-letter">
                          {claim.restaurant.name.charAt(0)}
                        </div>
                        <div>
                          <h3>{claim.restaurant.name}</h3>
                          <p>
                            {[claim.restaurant.address, claim.restaurant.city]
                              .filter(Boolean)
                              .join(", ") || "No address provided"}
                          </p>
                        </div>
                      </div>
                      <div className="claim-person">
                        <span>Requested by</span>
                        <strong>{claim.user.username}</strong>
                        <p>
                          {claim.user.email}
                        </p>
                      </div>
                      {claim.evidenceText && (
                        <div className="claim-evidence">
                          <span>Evidence</span>
                          <p>{claim.evidenceText}</p>
                        </div>
                      )}
                      {claim.evidenceUrl && (
                        <a
                          className="evidence-link"
                          href={claim.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open attached evidence ↗
                        </a>
                      )}
                      <div className="claim-actions">
                        <button
                          className="secondary reject"
                          disabled={workingId === claim.id}
                          onClick={() => void decide(claim.id, "reject")}
                        >
                          Reject
                        </button>
                        <button
                          className="primary approve"
                          disabled={workingId === claim.id}
                          onClick={() => void decide(claim.id, "approve")}
                        >
                          {workingId === claim.id
                            ? "Working…"
                            : "Approve claim"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : section === "admins" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ACCESS CONTROL</p>
                  <h2>Admins</h2>
                  <p className="muted">
                    Give trusted existing FindEat users access to this web
                    administration area.
                  </p>
                </div>
                <span className="admin-total">
                  {admins.length} {admins.length === 1 ? "admin" : "admins"}
                </span>
              </div>
              {error && <p className="error banner">{error}</p>}
              <section className="card admin-search-card">
                <div>
                  <h3>Add an admin</h3>
                  <p>Search by display name, username, or email address.</p>
                </div>
                <form onSubmit={searchUsers}>
                  <input
                    type="search"
                    placeholder="Search existing users…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button className="primary" disabled={searching}>
                    {searching ? "Searching…" : "Search"}
                  </button>
                </form>
                {searched && (
                  <div className="admin-search-results">
                    {results.length === 0 && !searching ? (
                      <div className="inline-empty">
                        No users found. Try another name, username, or email.
                      </div>
                    ) : (
                      results.map((user) => (
                        <div className="admin-user-row" key={user.id}>
                          <UserIdentity user={user} />
                          {user.isAdmin ? (
                            <span className="access-status">Already admin</span>
                          ) : (
                            <button
                              className="primary compact"
                              disabled={workingId === user.id}
                              onClick={() => void grantAdmin(user)}
                            >
                              {workingId === user.id ? "Adding…" : "Add admin"}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
              <section className="admin-list-section">
                <div className="section-title">
                  <div>
                    <h3>Current admins</h3>
                    <p>
                      People who can approve restaurant claims and manage admin
                      access.
                    </p>
                  </div>
                </div>
                <div className="admin-list">
                  {admins.map((user) => (
                    <div className="admin-user-row" key={user.id}>
                      <UserIdentity user={user} />
                      <div className="admin-row-actions">
                        {user.isProtectedAdmin && (
                          <span className="primary-admin-label">
                            Primary admin
                          </span>
                        )}
                        {user.isCurrentUser && !user.isProtectedAdmin && (
                          <span className="access-status">You</span>
                        )}
                        {!user.isProtectedAdmin && !user.isCurrentUser && (
                          <button
                            className={
                              confirmRemoveId === user.id
                                ? "confirm-remove"
                                : "remove-admin"
                            }
                            disabled={workingId === user.id}
                            onClick={() => void revokeAdmin(user)}
                          >
                            {workingId === user.id
                              ? "Removing…"
                              : confirmRemoveId === user.id
                                ? "Click again to remove"
                                : "Remove"}
                          </button>
                        )}
                        {confirmRemoveId === user.id && (
                          <button
                            className="cancel-remove"
                            onClick={() => setConfirmRemoveId(null)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

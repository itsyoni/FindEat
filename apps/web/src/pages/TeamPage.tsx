import { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import type { ManagedRestaurant, RestaurantPermission, RestaurantTeam } from "@findeat/types";
import { request } from "../lib/api";

const permissionCopy: Record<RestaurantPermission, { title: string; detail: string }> = {
  VIEW_OVERVIEW: { title: "Overview", detail: "See restaurant setup and high-level activity." },
  VIEW_ANALYTICS: { title: "Analytics", detail: "See performance and audience insights." },
  MANAGE_MENU: { title: "Menu", detail: "Create menus, sections, dishes, and opening availability." },
  VIEW_REVIEWS: { title: "Reviews", detail: "Read reviews and shared customer feedback." },
  MANAGE_OFFERS: { title: "Offers & rewards", detail: "Create and manage offers, rewards, and reservations." },
  PUBLISH_POSTS: { title: "Official posts", detail: "Publish and manage posts as the restaurant." },
  MANAGE_PROFILE: { title: "Restaurant profile", detail: "Update public restaurant details, hours, and media." },
  MANAGE_MESSAGES: { title: "Messages", detail: "Read and reply to restaurant conversations." },
  VIEW_NOTIFICATIONS: { title: "Business notifications", detail: "See activity addressed to the restaurant." },
  CONTACT_SUPPORT: { title: "Support", detail: "Contact FindEat support for this restaurant." },
};

export function TeamPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const [team, setTeam] = useState<RestaurantTeam | null>(null);
  const [identity, setIdentity] = useState("");
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<RestaurantPermission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    request<RestaurantTeam>(`/restaurants/${restaurant.id}/business/team`, {
      cache: "reload",
    }).then((nextTeam) => {
      if (active) setTeam(nextTeam);
    }).catch((nextError: unknown) => {
      if (active) {
        setError(nextError instanceof Error ? nextError.message : "Could not load the restaurant team");
      }
    });
    return () => { active = false; };
  }, [restaurant.id]);

  const availablePermissions = useMemo(
    () => team?.availablePermissions ?? (Object.keys(permissionCopy) as RestaurantPermission[]),
    [team],
  );

  async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const next = await request<RestaurantTeam>(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      setTeam(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update team access");
      throw nextError;
    } finally {
      setBusy(false);
    }
  }

  async function addMember() {
    const value = identity.trim();
    if (!value) return;
    await mutate(`/restaurants/${restaurant.id}/business/team/members`, "POST", { identity: value });
    setIdentity("");
  }

  async function saveRole() {
    const name = roleName.trim();
    if (!name) return;
    await mutate(
      editingRoleId
        ? `/restaurants/${restaurant.id}/business/team/roles/${editingRoleId}`
        : `/restaurants/${restaurant.id}/business/team/roles`,
      editingRoleId ? "PATCH" : "POST",
      { name, permissions: selectedPermissions },
    );
    setRoleName("");
    setSelectedPermissions([]);
    setEditingRoleId(null);
  }

  return (
    <div className="mx-auto w-full max-w-280 px-10.5 py-11 max-[800px]:px-4 max-[800px]:py-6">
      <p className="mb-2 text-xs font-black tracking-[.12em] text-accent">BUSINESS ACCESS</p>
      <h2 className="mb-2 text-[clamp(30px,4vw,44px)] tracking-[-.04em]">Team & roles</h2>
      <p className="m-0 max-w-3xl text-sm leading-6 text-muted">Add an existing FindEat user to {restaurant.name} first, then assign a role. Their personal profile stays separate from everything they do for the restaurant.</p>
      {error ? <p className="mt-5 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{error}</p> : null}

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)] gap-5 max-[900px]:grid-cols-1">
        <section className="rounded-[24px] border border-line bg-surface p-5 shadow-panel">
          <h3 className="m-0 text-xl">Restaurant team</h3>
          <p className="mt-1 text-sm text-muted">Adding a user does not grant access until you assign a role.</p>
          <div className="mt-4 flex gap-2 max-[560px]:flex-col">
            <input className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface-subtle px-4 text-sm text-ink outline-none focus:border-accent" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Username or email" />
            <button type="button" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-0 bg-accent px-5 font-extrabold text-[#faf9f6] disabled:opacity-45" disabled={busy || !identity.trim()} onClick={() => void addMember()}><PlusIcon size={18} weight="bold" /> Add user</button>
          </div>
          <div className="mt-5 grid gap-3">
            {team?.members.map((member) => {
              const owner = member.role === "OWNER";
              return <article key={member.id} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(150px,220px)_auto] items-center gap-3 rounded-2xl border border-line bg-surface-subtle p-3 max-[620px]:grid-cols-[auto_minmax(0,1fr)_auto]">
                {member.user.avatarUrl ? <img className="size-11 rounded-full object-cover" src={member.user.avatarUrl} alt="" /> : <span className="grid size-11 place-items-center rounded-full bg-soft text-muted"><UserCircleIcon size={28} /></span>}
                <div className="min-w-0"><strong className="block truncate text-sm">{member.user.displayName || member.user.username}</strong><small className="block truncate text-xs text-muted">@{member.user.username}</small></div>
                {owner ? <span className="rounded-full bg-accent-soft px-3 py-2 text-center text-xs font-extrabold text-accent-dark">Owner · full access</span> : <select className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink max-[620px]:col-span-2 max-[620px]:col-start-2" value={member.teamRoleId ?? ""} disabled={busy} onChange={(event) => void mutate(`/restaurants/${restaurant.id}/business/team/members/${member.id}`, "PATCH", { teamRoleId: event.target.value || null })}><option value="">No access</option>{team?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>}
                <button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-surface p-0 text-danger disabled:opacity-30" disabled={busy || owner} onClick={() => void mutate(`/restaurants/${restaurant.id}/business/team/members/${member.id}`, "DELETE")} aria-label={`Remove ${member.user.displayName || member.user.username}`}><TrashIcon size={18} weight="duotone" /></button>
              </article>;
            })}
          </div>
        </section>

        <section className="rounded-[24px] border border-line bg-surface p-5 shadow-panel">
          <h3 className="m-0 text-xl">Create a role</h3>
          <p className="mt-1 text-sm text-muted">Name the job, then choose exactly what it can access.</p>
          <input className="mt-4 min-h-12 w-full rounded-xl border border-line bg-surface-subtle px-4 text-sm text-ink outline-none focus:border-accent" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="For example: Social media manager" />
          <div className="mt-4 grid gap-2">
            {availablePermissions.map((permission) => {
              const selected = selectedPermissions.includes(permission);
              const copy = permissionCopy[permission];
              return <button key={permission} type="button" className={`rounded-xl border p-3 text-left transition ${selected ? "border-accent bg-accent-soft" : "border-line bg-surface-subtle"}`} onClick={() => setSelectedPermissions((current) => selected ? current.filter((item) => item !== permission) : [...current, permission])}><strong className="block text-sm">{copy.title}</strong><small className="mt-1 block text-xs leading-4 text-muted">{copy.detail}</small></button>;
            })}
          </div>
          <button type="button" className="mt-4 min-h-12 w-full rounded-xl border-0 bg-accent px-4 font-extrabold text-[#faf9f6] disabled:opacity-45" disabled={busy || !roleName.trim()} onClick={() => void saveRole()}>{editingRoleId ? "Save role" : "Create role"}</button>
          {editingRoleId ? <button type="button" className="mt-2 min-h-10 w-full rounded-xl border border-line bg-surface text-sm font-bold text-muted" onClick={() => { setEditingRoleId(null); setRoleName(""); setSelectedPermissions([]); }}>Cancel editing</button> : null}
          {team?.roles.length ? <div className="mt-6 border-t border-line pt-4"><h4 className="m-0 text-sm">Saved roles</h4><div className="mt-3 flex flex-wrap gap-2">{team.roles.map((role) => <span key={role.id} className="inline-flex items-center gap-2 rounded-full bg-soft px-3 py-2 text-xs font-bold"><button type="button" className="border-0 bg-transparent p-0 text-xs font-bold text-ink" onClick={() => { setEditingRoleId(role.id); setRoleName(role.name); setSelectedPermissions(role.permissions); }}>{role.name}</button><button type="button" className="grid size-5 place-items-center border-0 bg-transparent p-0 text-danger" disabled={busy} onClick={() => void mutate(`/restaurants/${restaurant.id}/business/team/roles/${role.id}`, "DELETE")} aria-label={`Delete ${role.name}`}><TrashIcon size={14} /></button></span>)}</div></div> : null}
        </section>
      </div>
    </div>
  );
}

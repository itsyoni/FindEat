type IdentityUser = {
  username: string
  displayName?: string | null
  email?: string
  avatarUrl?: string | null
}

export function UserIdentity({ user }: { user: IdentityUser }) {
  const avatarClass = "grid size-10.5 shrink-0 place-items-center rounded-full bg-[#eee7df] object-cover font-black dark:bg-[#302c28]"

  return <div className="flex min-w-0 items-center gap-3">
    {user.avatarUrl
      ? <img className={avatarClass} src={user.avatarUrl} alt="" />
      : <span className={avatarClass}>{user.username.charAt(0).toUpperCase()}</span>}
    <div className="min-w-0">
      <strong className="block">{user.username}</strong>
      {user.email ? <small className="mt-0.5 block max-w-130 truncate text-xs text-muted">{user.email}</small> : null}
    </div>
  </div>
}

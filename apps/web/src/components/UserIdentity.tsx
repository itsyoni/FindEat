type IdentityUser = {
  username: string
  displayName?: string | null
  email?: string
  avatarUrl?: string | null
}

export function UserIdentity({ user }: { user: IdentityUser }) {
  return <div className="admin-user-identity">
    {user.avatarUrl
      ? <img src={user.avatarUrl} alt="" />
      : <span>{user.username.charAt(0).toUpperCase()}</span>}
    <div>
      <strong>{user.username}</strong>
      {user.email ? <small>{user.email}</small> : null}
    </div>
  </div>
}

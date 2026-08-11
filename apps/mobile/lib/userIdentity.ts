type NamedUser = {
  username?: string | null;
  displayName?: string | null;
};

export function usernameLabel(username?: string | null) {
  const normalized = username?.trim().replace(/^@+/, "");
  return normalized ? `@${normalized}` : "";
}

export function userDisplayName(user?: NamedUser | null) {
  return user?.displayName?.trim() || usernameLabel(user?.username);
}

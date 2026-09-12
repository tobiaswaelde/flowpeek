/** Safe identity fields shared by authenticated-user and user-resource responses. */
export interface UserIdentity {
  firstName?: string | null;
  lastName?: string | null;
  username: string;
}

/** Prefer a user's personal name while retaining their login name as a fallback. */
export function getUserDisplayName(user: UserIdentity): string {
  return (
    [user.firstName, user.lastName].filter((value): value is string => Boolean(value?.trim())).join(' ') ||
    user.username
  );
}

/** Show the stable login name alongside a configured personal name. */
export function getUserIdentityLabel(user: UserIdentity): string {
  const displayName = getUserDisplayName(user);
  return displayName === user.username ? user.username : `${displayName} (@${user.username})`;
}

/** Build two-letter avatar initials from personal names or the login-name fallback. */
export function getUserInitials(user: UserIdentity): string {
  const personalNames = [user.firstName, user.lastName].filter((value): value is string => Boolean(value?.trim()));
  if (personalNames.length > 0) return `${personalNames[0]?.[0] ?? ''}${personalNames.at(-1)?.[0] ?? ''}`.toUpperCase();

  const usernameParts = user.username
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (usernameParts.length > 1) return `${usernameParts[0]?.[0] ?? ''}${usernameParts.at(-1)?.[0] ?? ''}`.toUpperCase();
  return user.username.slice(0, 2).toUpperCase();
}

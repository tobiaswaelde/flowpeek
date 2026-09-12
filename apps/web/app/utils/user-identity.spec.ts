import { describe, expect, it } from 'vitest';

import { getUserDisplayName, getUserIdentityLabel, getUserInitials } from './user-identity';

describe('user identity presentation', () => {
  it('prefers personal names while keeping the login username visible', () => {
    const user = { firstName: 'Vera', lastName: 'Viewer', username: 'viewer' };

    expect(getUserDisplayName(user)).toBe('Vera Viewer');
    expect(getUserIdentityLabel(user)).toBe('Vera Viewer (@viewer)');
    expect(getUserInitials(user)).toBe('VV');
  });

  it('falls back to the username when no personal name is configured', () => {
    const user = { firstName: null, lastName: null, username: 'release.manager' };

    expect(getUserDisplayName(user)).toBe('release.manager');
    expect(getUserIdentityLabel(user)).toBe('release.manager');
    expect(getUserInitials(user)).toBe('RM');
  });
});

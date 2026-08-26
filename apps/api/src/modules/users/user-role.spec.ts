import { UserRole } from '../../generated/prisma/client.js';

describe('UserRole', () => {
  it('defines the Flowpeek authorization roles', () => {
    expect(Object.values(UserRole)).toEqual(['SYSTEM_ADMIN', 'VIEWER', 'MANAGER']);
  });
});

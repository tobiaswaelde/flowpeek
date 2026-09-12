import { UserRole } from '../../generated/prisma/client.js';

describe('UserRole', () => {
  it('defines the ezRepo authorization roles', () => {
    expect(Object.values(UserRole)).toEqual(['SYSTEM_ADMIN', 'VIEWER', 'MANAGER']);
  });
});

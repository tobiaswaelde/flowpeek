import { ForbiddenException } from '@nestjs/common';

import { RepositoriesQueryService } from './repositories-query.service.js';

describe('RepositoriesQueryService', () => {
  const ability = {};
  const abilityFactory = { createForUser: jest.fn(() => ability) };
  const prisma = { repository: {} };
  const service = new RepositoriesQueryService(prisma as never, abilityFactory as never);

  beforeEach(() => jest.clearAllMocks());

  it('gives system administrators an unrestricted repository ability', () => {
    expect(service.getReadAbility({ id: 'admin', role: 'SYSTEM_ADMIN', username: 'admin' })).toBe(ability);
    expect(abilityFactory.createForUser).toHaveBeenCalledWith(
      { id: 'admin', role: 'SYSTEM_ADMIN', username: 'admin' },
      [],
    );
  });

  it('rejects non-administrators before building a repository query', () => {
    expect(() => service.getReadAbility({ id: 'viewer', role: 'VIEWER', username: 'viewer' })).toThrow(
      ForbiddenException,
    );
  });

  it('uses a stable repository order when the table has no selected sort', () => {
    expect(service.toQueryOptions({ page: 1, perPage: 10 })).toMatchObject({
      orderBy: [{ owner: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      page: 1,
      perPage: 10,
    });
  });
});

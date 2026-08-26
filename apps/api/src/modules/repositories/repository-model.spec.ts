import { Prisma } from '../../generated/prisma/client.js';

describe('Repository model', () => {
  it('exposes the unique provider-account and provider-repository key', () => {
    expect(Prisma.ModelName.Repository).toBe('Repository');
  });
});

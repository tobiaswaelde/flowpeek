import { HealthController } from './health.controller.js';
import type { HealthService } from './health.service.js';

describe('HealthController', () => {
  it('returns the health service result', async () => {
    const health = {
      api: 'ok',
      database: 'ok',
      providers: [],
      status: 'ok',
    } as const;
    const healthService = { getHealth: jest.fn().mockResolvedValue(health) } as unknown as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.getHealth()).resolves.toEqual(health);
    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
  });
});

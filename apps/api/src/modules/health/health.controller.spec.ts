import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns an online status', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: 'ok',
    });
  });
});

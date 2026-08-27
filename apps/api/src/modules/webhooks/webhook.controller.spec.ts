import { BadRequestException } from '@nestjs/common';

import { WebhookController } from './webhook.controller.js';
import type { WebhookService } from './webhook.service.js';

describe('WebhookController', () => {
  it('passes the unmodified raw body to the provider-specific service', async () => {
    const service = {
      receive: jest.fn().mockResolvedValue({ accepted: true, duplicate: false }),
    } as unknown as WebhookService;
    const controller = new WebhookController(service);
    const request = {
      headers: { 'x-github-delivery': 'delivery-id' },
      rawBody: Buffer.from('{"repository":{"id":42}}'),
    };

    await expect(controller.github('account-id', request as never)).resolves.toEqual({
      accepted: true,
      duplicate: false,
    });
    expect(service.receive).toHaveBeenCalledWith('GITHUB', 'account-id', {
      headers: request.headers,
      payload: request.rawBody,
    });
  });

  it('rejects a request when the raw signed body is unavailable', () => {
    const controller = new WebhookController({} as WebhookService);

    expect(() => controller.gitlab('account-id', { headers: {} } as never)).toThrow(BadRequestException);
  });

  it('passes a Gitea delivery to the dedicated provider endpoint', async () => {
    const service = {
      receive: jest.fn().mockResolvedValue({ accepted: true, duplicate: false }),
    } as unknown as WebhookService;
    const controller = new WebhookController(service);
    const request = {
      headers: { 'x-gitea-delivery': 'delivery-id' },
      rawBody: Buffer.from('{"repository":{"id":42}}'),
    };

    await controller.gitea('account-id', request as never);

    expect(service.receive).toHaveBeenCalledWith('GITEA', 'account-id', {
      headers: request.headers,
      payload: request.rawBody,
    });
  });
});

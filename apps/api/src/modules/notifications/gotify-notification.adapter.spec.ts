import type { NotificationChannel } from '../../generated/prisma/client.js';
import type { CredentialEncryptionService } from '../../security/credential-encryption.service.js';
import { GotifyNotificationAdapter } from './gotify-notification.adapter.js';

describe('GotifyNotificationAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends the complete structured workflow context without persisting the plaintext token', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const adapter = new GotifyNotificationAdapter({
      decrypt: jest.fn().mockReturnValue('gotify-token'),
    } as unknown as CredentialEncryptionService);

    await adapter.send(
      {
        configuration: { serverUrl: 'https://gotify.example.test' },
        encryptedSecret: 'encrypted-token',
        type: 'GOTIFY',
      } as unknown as NotificationChannel,
      {
        completedAt: new Date('2026-08-26T12:00:00.000Z'),
        durationMs: 60_000,
        provider: 'GITHUB',
        repository: 'flowpeek/flowpeek',
        runUrl: 'https://github.com/flowpeek/flowpeek/actions/runs/1',
        status: 'FAILED',
        workflowName: 'Test',
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://gotify.example.test/message'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-gotify-key': 'gotify-token' }),
        method: 'POST',
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('Repository: flowpeek/flowpeek');
  });
});

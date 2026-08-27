import { AppriseNotificationAdapter } from './apprise-notification.adapter.js';

describe('AppriseNotificationAdapter', () => {
  it('does not attempt to decrypt a channel that has no replacement URL', async () => {
    const credentials = { decrypt: jest.fn() };
    const adapter = new AppriseNotificationAdapter(credentials as never);

    await expect(
      adapter.send({ encryptedUrl: null } as never, {
        completedAt: null,
        durationMs: null,
        provider: 'GITHUB',
        repository: 'flowpeek/flowpeek',
        runUrl: 'https://example.test/run/1',
        status: 'FAILED',
        workflowName: 'CI',
      }),
    ).rejects.toThrow('Apprise notification delivery failed.');
    expect(credentials.decrypt).not.toHaveBeenCalled();
  });
});

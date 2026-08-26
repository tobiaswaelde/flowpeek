import { Injectable } from '@nestjs/common';

import type { NotificationChannel } from '../../generated/prisma/client.js';
import { NotificationChannelType } from '../../generated/prisma/client.js';
import { CredentialEncryptionService } from '../../security/credential-encryption.service.js';
import {
  formatNotificationMessage,
  type NotificationChannelAdapter,
  type NotificationPayload,
} from './notification-channel-adapter.js';

/** Delivers Gotify messages with a decrypted write-only application token. */
@Injectable()
export class GotifyNotificationAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannelType.GOTIFY;

  constructor(private readonly credentials: CredentialEncryptionService) {}

  /** Send a structured message through the configured Gotify server. */
  async send(channel: NotificationChannel, payload: NotificationPayload): Promise<void> {
    const serverUrl = this.getServerUrl(channel.configuration);
    if (!channel.encryptedSecret) throw new Error('Gotify channel credentials are not configured.');
    const response = await fetch(new URL('message', this.normalizeUrl(serverUrl)), {
      body: JSON.stringify({
        message: formatNotificationMessage(payload),
        priority: payload.status === 'FAILED' ? 8 : 2,
        title: `Flowpeek: ${payload.repository} / ${payload.workflowName}`,
      }),
      headers: {
        'content-type': 'application/json',
        'x-gotify-key': this.credentials.decrypt(channel.encryptedSecret),
      },
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Gotify returned HTTP ${response.status}.`);
  }

  private getServerUrl(configuration: unknown): string {
    if (!configuration || typeof configuration !== 'object' || !('serverUrl' in configuration)) {
      throw new Error('Gotify channel configuration is invalid.');
    }
    if (typeof configuration.serverUrl !== 'string') throw new Error('Gotify channel configuration is invalid.');
    return configuration.serverUrl;
  }

  private normalizeUrl(serverUrl: string): string {
    return serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
  }
}

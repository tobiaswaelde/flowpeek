import { Injectable } from '@nestjs/common';

import type { NotificationChannel } from '../../generated/prisma/client.js';
import { NotificationChannelType } from '../../generated/prisma/client.js';
import { CredentialEncryptionService } from '../../security/credential-encryption.service.js';
import {
  formatNotificationMessage,
  type NotificationChannelAdapter,
  type NotificationPayload,
} from './notification-channel-adapter.js';

/** Delivers ntfy messages using an optional decrypted bearer token. */
@Injectable()
export class NtfyNotificationAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannelType.NTFY;

  constructor(private readonly credentials: CredentialEncryptionService) {}

  /** Send a structured message to the configured ntfy topic. */
  async send(channel: NotificationChannel, payload: NotificationPayload): Promise<void> {
    const { serverUrl, topic } = this.getConfiguration(channel.configuration);
    const response = await fetch(new URL(topic, this.normalizeUrl(serverUrl)), {
      body: formatNotificationMessage(payload),
      headers: {
        ...(channel.encryptedSecret
          ? { authorization: `Bearer ${this.credentials.decrypt(channel.encryptedSecret)}` }
          : {}),
        tags: payload.status === 'FAILED' ? 'warning' : 'white_check_mark',
        title: `Flowpeek: ${payload.repository} / ${payload.workflowName}`,
      },
      method: 'POST',
    });
    if (!response.ok) throw new Error(`ntfy returned HTTP ${response.status}.`);
  }

  private getConfiguration(configuration: unknown): { serverUrl: string; topic: string } {
    if (
      !configuration ||
      typeof configuration !== 'object' ||
      !('serverUrl' in configuration) ||
      !('topic' in configuration)
    ) {
      throw new Error('ntfy channel configuration is invalid.');
    }
    if (typeof configuration.serverUrl !== 'string' || typeof configuration.topic !== 'string') {
      throw new Error('ntfy channel configuration is invalid.');
    }
    return { serverUrl: configuration.serverUrl, topic: configuration.topic };
  }

  private normalizeUrl(serverUrl: string): string {
    return serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
  }
}

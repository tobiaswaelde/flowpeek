import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

import { ENV } from '../../config/env.js';
import type { NotificationChannel } from '../../generated/prisma/client.js';
import { NotificationChannelType } from '../../generated/prisma/client.js';
import {
  formatNotificationMessage,
  type NotificationChannelAdapter,
  type NotificationPayload,
} from './notification-channel-adapter.js';

/** Delivers email channels through the globally configured SMTP transport. */
@Injectable()
export class EmailNotificationAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannelType.EMAIL;

  /** Send an email to the channel's validated recipient list. */
  async send(channel: NotificationChannel, payload: NotificationPayload): Promise<void> {
    if (!ENV.SMTP_HOST || !ENV.SMTP_FROM) throw new Error('SMTP transport is not configured.');
    const recipients = this.getRecipients(channel.configuration);
    const transport = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      ...(ENV.SMTP_USERNAME ? { auth: { user: ENV.SMTP_USERNAME, pass: ENV.SMTP_PASSWORD } } : {}),
    });
    await transport.sendMail({
      from: ENV.SMTP_FROM,
      subject: `[Flowpeek] ${payload.status}: ${payload.repository} / ${payload.workflowName}`,
      text: formatNotificationMessage(payload),
      to: recipients,
    });
  }

  private getRecipients(configuration: unknown): string[] {
    if (!configuration || typeof configuration !== 'object' || !('recipients' in configuration)) {
      throw new Error('Email channel configuration is invalid.');
    }
    const recipients = configuration.recipients;
    if (!Array.isArray(recipients) || !recipients.every((recipient) => typeof recipient === 'string')) {
      throw new Error('Email channel configuration is invalid.');
    }
    return recipients;
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { NotificationDelivery, NotificationDeliveryAttempt } from '../../../generated/prisma/client.js';

/** Safe delivery-attempt metadata visible to authorized repository managers. */
export class NotificationDeliveryAttemptDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  notificationChannelId!: string;

  @ApiProperty()
  attempt!: number;

  @ApiPropertyOptional()
  deliveredAt!: Date | null;

  @ApiPropertyOptional()
  error!: string | null;

  @ApiProperty()
  createdAt!: Date;

  /** Convert an attempt without exposing any channel configuration or secret. */
  static fromModel(model: NotificationDeliveryAttempt): NotificationDeliveryAttemptDto {
    return {
      id: model.id,
      notificationChannelId: model.notificationChannelId,
      attempt: model.attempt,
      deliveredAt: model.deliveredAt,
      error: model.error,
      createdAt: model.createdAt,
    };
  }
}

/** Safe delivery history representation for a repository workflow run. */
export class NotificationDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  notificationRuleId!: string;

  @ApiProperty({ format: 'uuid' })
  workflowRunId!: string;

  @ApiProperty({ format: 'uuid' })
  repositoryId!: string;

  @ApiProperty()
  status!: NotificationDelivery['status'];

  @ApiPropertyOptional()
  finalError!: string | null;

  @ApiPropertyOptional()
  nextAttemptAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [NotificationDeliveryAttemptDto] })
  attempts!: NotificationDeliveryAttemptDto[];

  /** Convert a delivery and its attempts without channel credentials or configuration. */
  static fromModel(
    model: NotificationDelivery & {
      notificationRule: { repositoryId: string };
      attempts: NotificationDeliveryAttempt[];
    },
  ): NotificationDeliveryDto {
    return {
      id: model.id,
      notificationRuleId: model.notificationRuleId,
      workflowRunId: model.workflowRunId,
      repositoryId: model.notificationRule.repositoryId,
      status: model.status,
      finalError: model.finalError,
      nextAttemptAt: model.nextAttemptAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      attempts: model.attempts.map(NotificationDeliveryAttemptDto.fromModel),
    };
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import type { NotificationChannel } from '../../../generated/prisma/client.js';

/** Safe response representation of a repository-scoped notification channel. */
export class NotificationChannelDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  repositoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional({ example: 'discord' })
  urlScheme!: string | null;

  @ApiProperty()
  requiresReconfiguration!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  /** Convert a database model without exposing encrypted credentials. */
  static fromModel(model: NotificationChannel): NotificationChannelDto {
    return {
      id: model.id,
      repositoryId: model.repositoryId,
      name: model.name,
      enabled: model.enabled,
      urlScheme: model.urlScheme,
      requiresReconfiguration: model.requiresReconfiguration,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}

/** Input accepted when creating a notification channel. */
export class CreateNotificationChannelDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  repositoryId!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name!: string;

  /** Write-only Apprise notification URL. It is encrypted before persistence. */
  @ApiProperty({ writeOnly: true, maxLength: 4096, example: 'discord://webhook-id/webhook-token' })
  @IsString()
  @MaxLength(4096)
  url!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Input accepted when updating a notification channel. */
export class UpdateNotificationChannelDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Replace the write-only Apprise notification URL. */
  @ApiPropertyOptional({ writeOnly: true, maxLength: 4096 })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

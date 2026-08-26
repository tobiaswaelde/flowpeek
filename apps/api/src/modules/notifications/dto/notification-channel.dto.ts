import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import type { NotificationChannel } from '../../../generated/prisma/client.js';
import { NotificationChannelType } from '../../../generated/prisma/client.js';

/** Safe response representation of a repository-scoped notification channel. */
export class NotificationChannelDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  repositoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: NotificationChannelType })
  type!: NotificationChannelType;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true })
  configuration!: Record<string, unknown>;

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
      type: model.type,
      enabled: model.enabled,
      configuration: model.configuration as Record<string, unknown>,
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

  @ApiProperty({ enum: NotificationChannelType })
  @IsEnum(NotificationChannelType)
  type!: NotificationChannelType;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

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

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import {
  CreateNotificationChannelDto,
  NotificationChannelDto,
  UpdateNotificationChannelDto,
} from './dto/notification-channel.dto.js';
import { NotificationsService } from './notifications.service.js';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

/** Provides configuration endpoints for repository-scoped notification channels. */
@ApiTags('notifications')
@Authenticated()
@Controller('notification-channels')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** List only channels that belong to repositories visible to the caller. */
  @Get()
  @ApiOperation({ summary: 'List visible notification channels' })
  @ApiOkResponse({ type: NotificationChannelDto, isArray: true })
  async list(
    @Req() request: AuthenticatedRequest,
    @Query('repositoryId') repositoryId?: string,
  ): Promise<NotificationChannelDto[]> {
    return (await this.notifications.listChannels(request.user, repositoryId)).map(NotificationChannelDto.fromModel);
  }

  /** Create a channel for a repository the caller manages. */
  @Post()
  @ApiOperation({ summary: 'Create a notification channel' })
  @ApiOkResponse({ type: NotificationChannelDto })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateNotificationChannelDto,
  ): Promise<NotificationChannelDto> {
    return NotificationChannelDto.fromModel(await this.notifications.createChannel(request.user, input));
  }

  /** Update a channel after repository-level management authorization. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification channel' })
  @ApiOkResponse({ type: NotificationChannelDto })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateNotificationChannelDto,
  ): Promise<NotificationChannelDto> {
    return NotificationChannelDto.fromModel(await this.notifications.updateChannel(request.user, id, input));
  }

  /** Delete a channel after repository-level management authorization. */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a notification channel' })
  @ApiNoContentResponse()
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    await this.notifications.deleteChannel(request.user, id);
  }
}

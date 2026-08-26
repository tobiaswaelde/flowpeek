import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { NotificationDeliveryDto } from './dto/notification-delivery.dto.js';
import { NotificationsService } from './notifications.service.js';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

/** Exposes delivery history only within the caller's repository management scope. */
@ApiTags('notifications')
@Authenticated()
@Controller('notification-deliveries')
export class NotificationDeliveriesController {
  constructor(private readonly notifications: NotificationsService) {}

  /** List delivery history visible to a system administrator or repository manager. */
  @Get()
  @ApiOperation({ summary: 'List visible notification delivery history' })
  @ApiOkResponse({ type: NotificationDeliveryDto, isArray: true })
  async list(
    @Req() request: AuthenticatedRequest,
    @Query('repositoryId') repositoryId?: string,
  ): Promise<NotificationDeliveryDto[]> {
    return (await this.notifications.listDeliveryHistory(request.user, repositoryId)).map(
      NotificationDeliveryDto.fromModel,
    );
  }
}

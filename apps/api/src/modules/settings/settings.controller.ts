import { Body, Controller, ForbiddenException, Get, Patch, Req } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { ApplicationSettingsDto, UpdateApplicationSettingsDto } from './dto/application-settings.dto.js';
import { SettingsService } from './settings.service.js';

/** Exposes global settings to authenticated clients and administrative updates. */
@ApiTags('settings')
@Authenticated()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Return settings used across the application. */
  @Get()
  @ApiOperation({ summary: 'Get global application settings' })
  @ApiOkResponse({ type: ApplicationSettingsDto })
  get(): Promise<ApplicationSettingsDto> {
    return this.settings.get();
  }

  /** Replace mutable global settings as a system administrator. */
  @Patch()
  @ApiOperation({ summary: 'Update global application settings' })
  @ApiOkResponse({ type: ApplicationSettingsDto })
  @ApiForbiddenResponse({ description: 'System administrator access is required.' })
  update(
    @Req() request: { user: AuthenticatedUser },
    @Body() input: UpdateApplicationSettingsDto,
  ): Promise<ApplicationSettingsDto> {
    if (request.user.role !== 'SYSTEM_ADMIN') {
      throw new ForbiddenException('System administrator access is required.');
    }
    return this.settings.update(input);
  }
}

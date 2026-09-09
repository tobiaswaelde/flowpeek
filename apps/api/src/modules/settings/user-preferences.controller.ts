import { Controller, Delete, Get, HttpCode, Param, Put, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/authenticated.decorator.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { IntroBannerParamsDto, UserPreferencesDto } from './dto/user-preferences.dto.js';
import { UserPreferencesService } from './user-preferences.service.js';

/** Exposes personal interface preferences only to their authenticated owner. */
@ApiTags('settings')
@Authenticated()
@Controller('settings/preferences')
export class UserPreferencesController {
  constructor(private readonly preferences: UserPreferencesService) {}

  /** Return preferences belonging to the current authenticated user. */
  @Get()
  @ApiOperation({ summary: 'Get personal interface preferences' })
  @ApiOkResponse({ type: UserPreferencesDto })
  get(@Req() request: { user: AuthenticatedUser }): Promise<UserPreferencesDto> {
    return this.preferences.get(request.user.id);
  }

  /** Dismiss one introductory page banner for the current authenticated user. */
  @Put('intro-banners/:bannerId')
  @ApiOperation({ summary: 'Dismiss an introductory page banner' })
  @ApiOkResponse({ type: UserPreferencesDto })
  dismissIntroBanner(
    @Req() request: { user: AuthenticatedUser },
    @Param() params: IntroBannerParamsDto,
  ): Promise<UserPreferencesDto> {
    return this.preferences.dismissIntroBanner(request.user.id, params.bannerId);
  }

  /** Restore every introductory page banner for the current authenticated user. */
  @Delete('intro-banners')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore all introductory page banners' })
  @ApiOkResponse({ type: UserPreferencesDto })
  restoreIntroBanners(@Req() request: { user: AuthenticatedUser }): Promise<UserPreferencesDto> {
    return this.preferences.restoreIntroBanners(request.user.id);
  }
}

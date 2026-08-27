import { Controller, Get, Query, Redirect } from '@nestjs/common';

import { ENV } from '../../config/env.js';
import { ProviderOAuthCallbackDto } from './dto/provider-oauth.dto.js';
import { ProviderOAuthService } from './provider-oauth.service.js';

/** Receives provider OAuth redirects and returns the administrator to the provider-account screen. */
@Controller('provider-accounts/oauth')
export class ProviderOAuthController {
  constructor(private readonly oauth: ProviderOAuthService) {}

  /** Completes an OAuth authorization and redirects without exposing provider error details. */
  @Get('callback')
  @Redirect(ENV.PUBLIC_URL, 302)
  async callback(@Query() query: ProviderOAuthCallbackDto): Promise<{ url: string }> {
    const redirectUrl = new URL('/admin/providers', ENV.PUBLIC_URL);

    try {
      if (!query.code) throw new Error('The provider did not return an authorization code.');
      await this.oauth.complete(query.state, query.code);
      redirectUrl.searchParams.set('oauth', 'connected');
    } catch {
      redirectUrl.searchParams.set('oauth', 'failed');
    }

    return { url: redirectUrl.toString() };
  }
}

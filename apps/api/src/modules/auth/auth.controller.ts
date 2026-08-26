import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { Authenticated } from './authenticated.decorator.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import type { AuthenticatedUser } from './types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signin')
  @HttpCode(200)
  signIn(@Body() body: SignInDto) {
    return this.auth.signIn(body.username, body.password);
  }

  @Get('me')
  @Authenticated()
  me(@Req() request: { user: AuthenticatedUser }) {
    return request.user;
  }

  @Post('signout')
  @HttpCode(204)
  @Authenticated()
  signOut(): void {}

  @Post('password')
  @HttpCode(204)
  @Authenticated()
  async updatePassword(@Req() request: { user: AuthenticatedUser }, @Body() body: UpdatePasswordDto): Promise<void> {
    await this.auth.updatePassword(request.user.id, body.currentPassword, body.newPassword);
  }
}

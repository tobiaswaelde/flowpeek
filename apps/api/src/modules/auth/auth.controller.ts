import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() request: { user: AuthenticatedUser }) {
    return request.user;
  }

  @Post('signout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  signOut(): void {}

  @Post('password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updatePassword(@Req() request: { user: AuthenticatedUser }, @Body() body: UpdatePasswordDto): Promise<void> {
    await this.auth.updatePassword(request.user.id, body.currentPassword, body.newPassword);
  }
}

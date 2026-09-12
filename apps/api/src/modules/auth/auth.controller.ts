import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { Authenticated } from './authenticated.decorator.js';
import { AvatarService } from './avatar.service.js';
import { RemoteAvatarDto } from './dto/avatar.dto.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import type { AuthenticatedUser } from './types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly avatars: AvatarService,
  ) {}

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

  /** Store a normalized avatar for the current user. */
  @Put('me/avatar')
  @Authenticated()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } },
  })
  async updateAvatar(
    @Req() request: { user: AuthenticatedUser },
    @UploadedFile() file?: { buffer: Buffer; mimetype: string },
  ): Promise<AuthenticatedUser> {
    if (!file) throw new BadRequestException('An avatar image is required.');
    const avatarUpdatedAt = await this.avatars.save(request.user.id, { data: file.buffer, mimeType: file.mimetype });
    return { ...request.user, avatarUpdatedAt };
  }

  /** Remove the current user's avatar. */
  @Delete('me/avatar')
  @Authenticated()
  async deleteAvatar(@Req() request: { user: AuthenticatedUser }): Promise<AuthenticatedUser> {
    await this.avatars.remove(request.user.id);
    return { ...request.user, avatarUpdatedAt: null };
  }

  /** Download a protected remote image for client-side crop preview. */
  @Post('me/avatar/remote-preview')
  @Authenticated()
  async previewRemoteAvatar(@Body() body: RemoteAvatarDto): Promise<StreamableFile> {
    const source = await this.avatars.download(body.url);
    return new StreamableFile(source.data, { type: source.mimeType });
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

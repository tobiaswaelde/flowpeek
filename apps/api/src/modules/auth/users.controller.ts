import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiErrorResponses,
  ApiPaginatedResponse,
  ApiResourceQuery,
  QueryTransformPipe,
  ResourceQuery,
} from '@querry-kit/nest';
import bcrypt from 'bcrypt';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';

import { PrismaService } from '../../prisma/prisma.service.js';
import { Authenticated } from './authenticated.decorator.js';
import { AvatarService } from './avatar.service.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { UserDto, type UserWithAvatar } from './dto/user.dto.js';
import type { AuthenticatedUser } from './types.js';
import { UsersQueryService } from './users-query.service.js';

class CreateUserDto {
  @IsString() @MaxLength(255) username!: string;
  @IsString() @MinLength(12) password!: string;
  @IsEnum(['SYSTEM_ADMIN', 'VIEWER', 'MANAGER']) role!: 'SYSTEM_ADMIN' | 'VIEWER' | 'MANAGER';
}

/** Provides safe system-administrator user management endpoints. */
@Authenticated()
@Controller('users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersQueryService,
    private readonly avatars: AvatarService,
  ) {}

  /** Query system users with server-side filtering, sorting, field selection, and pagination. */
  @Get()
  @ApiResourceQuery()
  @ApiPaginatedResponse({ description: 'System users.', model: UserDto })
  @ApiErrorResponses({ badRequestDescription: 'Invalid user query.' })
  async query(@Req() request: { user: AuthenticatedUser }, @Query(new QueryTransformPipe()) query: UserQueryDto) {
    const ability = this.users.getReadAbility(request.user);
    return ResourceQuery.query({
      ability,
      include: { avatar: { select: { updatedAt: true } } },
      map: (user: UserWithAvatar, currentAbility) => UserDto.fromModel(user, currentAbility),
      query: this.users.toQueryOptions(query),
      schema: UserDto,
      service: this.users,
    });
  }
  /** Return one normalized avatar to authenticated users without exposing its database record. */
  @Get(':id/avatar')
  async avatar(@Param('id') id: string, @Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
    const avatar = await this.avatars.get(id);
    response.set({ 'Cache-Control': 'private, max-age=3600', ETag: `"${avatar.etag}"` });
    return new StreamableFile(Buffer.from(avatar.data), { type: 'image/webp' });
  }
  @Post() async create(@Req() request: { user: AuthenticatedUser }, @Body() body: CreateUserDto) {
    this.assertAdmin(request.user);
    return UserDto.fromModel(
      await this.prisma.user.create({
        data: { username: body.username, role: body.role, passwordHash: await bcrypt.hash(body.password, 12) },
      }),
    );
  }
  @Delete(':id') async remove(@Req() request: { user: AuthenticatedUser }, @Param('id') id: string): Promise<void> {
    this.assertAdmin(request.user);
    if (id === request.user.id) throw new ForbiddenException('System administrators cannot delete their own account.');
    await this.prisma.user.delete({ where: { id } });
  }
  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
  }
}

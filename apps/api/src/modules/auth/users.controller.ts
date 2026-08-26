import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { PrismaService } from '../../prisma/prisma.service.js';
import { Authenticated } from './authenticated.decorator.js';
import type { AuthenticatedUser } from './types.js';

class CreateUserDto {
  @IsString() @MaxLength(255) username!: string;
  @IsString() @MinLength(12) password!: string;
  @IsEnum(['SYSTEM_ADMIN', 'VIEWER', 'MANAGER']) role!: 'SYSTEM_ADMIN' | 'VIEWER' | 'MANAGER';
}

/** Provides safe system-administrator user management endpoints. */
@Authenticated()
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@Req() request: { user: AuthenticatedUser }) {
    this.assertAdmin(request.user);
    return this.prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { username: 'asc' },
    });
  }
  @Post() async create(@Req() request: { user: AuthenticatedUser }, @Body() body: CreateUserDto) {
    this.assertAdmin(request.user);
    return this.prisma.user.create({
      data: { username: body.username, role: body.role, passwordHash: await bcrypt.hash(body.password, 12) },
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });
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

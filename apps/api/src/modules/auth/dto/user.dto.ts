import { ApiProperty } from '@nestjs/swagger';
import { filterCaslFields } from '@querry-kit/nest/casl';

import { CaslAction } from '../../../casl/casl-action.js';
import { CaslSubject } from '../../../casl/casl-subject.js';
import type { AppAbility } from '../../../casl/types.js';
import type { User } from '../../../generated/prisma/client.js';

/** Public user representation without credential material. */
export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ maxLength: 255 })
  username!: string;
  @ApiProperty({ enum: ['SYSTEM_ADMIN', 'VIEWER', 'MANAGER'] })
  role!: User['role'];
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  /** Convert a persisted user to a permission-filtered public representation. */
  static fromModel(model: User, ability?: AppAbility): UserDto {
    return filterCaslFields(
      {
        id: model.id,
        username: model.username,
        role: model.role,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      },
      CaslSubject.User,
      ability,
      { action: CaslAction.Read },
    );
  }
}

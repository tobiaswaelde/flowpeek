import { QueryDTO } from '@querry-kit/nest';

import type { UserTypeMap } from '../users-query.service.js';

/** Paginated Query Kit request for system-user administration. */
export class UserQueryDto extends QueryDTO<UserTypeMap> {}

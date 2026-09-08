import { QueryDTO } from '@querry-kit/nest';

import type { RepositoryTypeMap } from '../repositories-query.service.js';

/** Paginated Query Kit request for repository administration. */
export class RepositoryQueryDto extends QueryDTO<RepositoryTypeMap> {}

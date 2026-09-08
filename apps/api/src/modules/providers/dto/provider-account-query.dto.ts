import { QueryDTO } from '@querry-kit/nest';

import type { ProviderAccountTypeMap } from '../provider-accounts-query.service.js';

/** Paginated Query Kit request for provider-account administration. */
export class ProviderAccountQueryDto extends QueryDTO<ProviderAccountTypeMap> {}

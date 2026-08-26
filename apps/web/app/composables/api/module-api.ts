import { useModuleApi as useQueryKitModuleApi } from '@querry-kit/nuxt/api';
import type { QueryParameters } from '@querry-kit/nuxt/types';
import type { AxiosResponse } from 'axios';

import { useApi } from '~/composables/api/api';
import type { Endpoint, Endpoints, QueryKitEndpoints } from '~/types/api/endpoints';
import type { WorkflowRun } from '~/types/api/resources';

/** Paginated response shape returned by Query Kit resource endpoints. */
export interface PaginatedDto<TItem> {
  items: TItem[];
  meta: {
    itemCount: number;
    pageCount: number;
    [key: string]: unknown;
  };
}

type ModuleApi<TEndpoint extends Endpoint> = {
  count(query?: QueryParameters): Promise<AxiosResponse<number>>;
  create(data: Endpoints[TEndpoint]['create'], query?: QueryParameters): Promise<AxiosResponse<WorkflowRun>>;
  delete(id: string | number, query?: QueryParameters): Promise<AxiosResponse<WorkflowRun>>;
  findById(id: string | number, query?: QueryParameters): Promise<AxiosResponse<WorkflowRun>>;
  get(id: string | number, query?: QueryParameters): Promise<AxiosResponse<WorkflowRun>>;
  query(query?: QueryParameters): Promise<AxiosResponse<PaginatedDto<WorkflowRun>>>;
  update(
    id: string | number,
    data: Endpoints[TEndpoint]['update'],
    query?: QueryParameters,
  ): Promise<AxiosResponse<WorkflowRun>>;
};

/** Provide a typed Query Kit resource client using Flowpeek's authenticated Axios client. */
export const useModuleApi = <TEndpoint extends Endpoint>(endpoint: TEndpoint): ModuleApi<TEndpoint> => {
  return useQueryKitModuleApi<QueryKitEndpoints, TEndpoint>(useApi(), endpoint) as ModuleApi<TEndpoint>;
};

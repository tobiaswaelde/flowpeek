import type { Filtering } from '@querry-kit/nuxt-ui/types';

import type { PaginatedResource, Repository } from '~/types/api/resources';

const durationField = 'durationMs';

/** Minimal repository projection required by the workflow-run repository filter. */
export type WorkflowRunRepositoryFilterResource = Pick<Repository, 'id' | 'name' | 'owner'>;

/** Select option displayed by the workflow-run repository filter. */
export interface WorkflowRunRepositoryFilterOption {
  label: string;
  value: string;
}

/** Convert persisted millisecond duration filters to seconds for the table filter editor. */
export function durationFilteringToSeconds(filtering: Filtering): Filtering {
  return mapDurationFilterValues(filtering, (value) => value / 1_000);
}

/** Convert duration filter values entered in seconds to integer milliseconds for Query Kit. */
export function durationFilteringToMilliseconds(filtering: Filtering): Filtering {
  return mapDurationFilterValues(filtering, (value) => Math.round(value * 1_000));
}

/**
 * Load every authorized repository page and adapt the resources to stable filter options.
 *
 * @param loadPage - Fetches one repository page from the permission-aware resource endpoint.
 * @returns Repository choices labeled as `owner/name`.
 */
export async function loadWorkflowRunRepositoryFilterOptions(
  loadPage: (page: number) => Promise<PaginatedResource<WorkflowRunRepositoryFilterResource>>,
): Promise<WorkflowRunRepositoryFilterOption[]> {
  const repositories: WorkflowRunRepositoryFilterResource[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await loadPage(page);
    repositories.push(...response.items);
    hasNextPage = response.meta.hasNextPage;
    page += 1;
  }

  return repositories.map((repository) => ({
    label: `${repository.owner}/${repository.name}`,
    value: repository.id,
  }));
}

/** Map numeric duration values while preserving every other filter instruction. */
function mapDurationFilterValues(filtering: Filtering, mapValue: (value: number) => number): Filtering {
  return {
    ...filtering,
    filters: filtering.filters.map((filter) =>
      filter.field === durationField && typeof filter.value === 'number'
        ? { ...filter, value: mapValue(filter.value) }
        : filter,
    ),
  };
}

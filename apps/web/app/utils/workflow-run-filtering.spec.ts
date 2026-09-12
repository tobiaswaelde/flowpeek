import { describe, expect, it, vi } from 'vitest';

import type { Filtering } from '@querry-kit/nuxt-ui/types';
import {
  durationFilteringToMilliseconds,
  durationFilteringToSeconds,
  loadWorkflowRunRepositoryFilterOptions,
} from './workflow-run-filtering';

describe('workflow-run filtering', () => {
  it('converts only duration filter values between milliseconds and seconds', () => {
    const filtering: Filtering = {
      filters: [
        { field: 'durationMs', id: 'duration', operator: 'gte', type: 'number', value: 90_500 },
        { field: 'status', id: 'status', operator: 'in', type: 'enum', value: ['FAILED'] },
      ],
      operator: 'AND',
    };

    const seconds = durationFilteringToSeconds(filtering);

    expect(seconds).toEqual({
      filters: [
        { field: 'durationMs', id: 'duration', operator: 'gte', type: 'number', value: 90.5 },
        { field: 'status', id: 'status', operator: 'in', type: 'enum', value: ['FAILED'] },
      ],
      operator: 'AND',
    });
    expect(durationFilteringToMilliseconds(seconds)).toEqual(filtering);
  });

  it('rounds fractional milliseconds before sending duration filters to Query Kit', () => {
    expect(
      durationFilteringToMilliseconds({
        filters: [{ field: 'durationMs', id: 'duration', operator: 'equals', type: 'number', value: 1.2345 }],
        operator: 'AND',
      }),
    ).toMatchObject({ filters: [{ value: 1_235 }] });
  });

  it('loads every repository page and creates owner/name options', async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: 'repository-1', name: 'api', owner: 'acme' }],
        meta: { hasNextPage: true, hasPrevPage: false, itemCount: 2, page: 1, pageCount: 2, perPage: 1 },
      })
      .mockResolvedValueOnce({
        items: [{ id: 'repository-2', name: 'web', owner: 'acme' }],
        meta: { hasNextPage: false, hasPrevPage: true, itemCount: 2, page: 2, pageCount: 2, perPage: 1 },
      });

    await expect(loadWorkflowRunRepositoryFilterOptions(loadPage)).resolves.toEqual([
      { label: 'acme/api', value: 'repository-1' },
      { label: 'acme/web', value: 'repository-2' },
    ]);
    expect(loadPage).toHaveBeenNthCalledWith(1, 1);
    expect(loadPage).toHaveBeenNthCalledWith(2, 2);
  });
});

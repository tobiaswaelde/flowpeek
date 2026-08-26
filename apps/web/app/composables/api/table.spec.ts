import { describe, expect, it } from 'vitest';

import type { ColumnDefinition } from '~/types/table';
import { toQueryKitColumns } from './table';

interface TestRow extends Record<string, unknown> {
  id: string;
  workflowName: string;
}

describe('toQueryKitColumns', () => {
  it('keeps all renderer metadata for visible columns', () => {
    const columns: ColumnDefinition<TestRow>[] = [
      { fields: ['repository.name'], header: 'Workflow', id: 'workflowName', renderer: { emphasis: true } },
      { header: 'Conditional action' },
    ];

    expect(toQueryKitColumns(columns)).toEqual([
      { fields: ['repository.name'], header: 'Workflow', id: 'workflowName', renderer: { emphasis: true } },
    ]);
  });
});

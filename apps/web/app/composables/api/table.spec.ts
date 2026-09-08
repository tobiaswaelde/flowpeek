import { describe, expect, it } from 'vitest';

import type { ColumnDefinition } from '~/types/table';
import { pinActionsColumnRight, toQueryKitColumns } from './table';

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

describe('pinActionsColumnRight', () => {
  it('moves an actions column from the left into the right-pinned columns', () => {
    expect(
      pinActionsColumnRight([{ id: 'name' }, { id: 'actions' }], { left: ['actions'], right: ['status'] }),
    ).toEqual({ left: [], right: ['status', 'actions'] });
  });

  it('preserves pinning state when the actions column is already pinned right', () => {
    const pinning = { right: ['actions'] };

    expect(pinActionsColumnRight([{ id: 'actions' }], pinning)).toBe(pinning);
  });
});

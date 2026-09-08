import type { Filtering } from '@querry-kit/nuxt-ui/types';
import { useTable as useQueryKitTable } from '@querry-kit/nuxt/table';
import type { TableColumn as QueryKitTableColumn } from '@querry-kit/nuxt/types';
import { useRouteQuery } from '@vueuse/router';
import { computed, type Ref, watch } from 'vue';

import type { Endpoint, Endpoints } from '~/types/api/endpoints';
import type { ColumnDefinition } from '~/types/table';
import { useApi } from './api';

type TableRow<TEndpoint extends Endpoint> = Endpoints[TEndpoint]['dto'] & { id: string } & Record<string, unknown>;

/** Configuration for a typed Flowpeek Query Kit table. */
export interface UseTableOptions<TEndpoint extends Endpoint> {
  columnDefinition: Ref<readonly ColumnDefinition<TableRow<TEndpoint>>[]>;
  defaultItemsPerPage?: number;
  endpoint: TEndpoint;
  name: string;
  staticFields?: string[];
  staticFilter?: Ref<Record<string, unknown> | undefined>;
}

/**
 * Retain local renderer metadata while adapting columns to Query Kit's field-selection contract.
 *
 * @param columnDefinition - Reactive local table column definitions.
 * @returns Visible columns with their original metadata and a resolved Query Kit identifier.
 */
export function toQueryKitColumns<TItem extends Record<string, unknown>>(
  columnDefinition: readonly ColumnDefinition<TItem>[],
): QueryKitTableColumn<TItem>[] {
  return columnDefinition.flatMap((column) => {
    if (!column.id) return [];
    return [{ ...column } as QueryKitTableColumn<TItem>];
  });
}

/**
 * Keep an actions column fixed at the far right without disturbing other user-selected pinned columns.
 *
 * @param columns - The currently visible renderer columns.
 * @param columnPinning - Persisted Query Kit pinning state.
 * @returns The original state when no actions column exists or it is already pinned right; otherwise corrected state.
 */
export function pinActionsColumnRight(
  columns: readonly { id?: string }[],
  columnPinning: Record<string, string[]>,
): Record<string, string[]> {
  if (!columns.some((column) => column.id === 'actions')) return columnPinning;

  const left = (columnPinning.left ?? []).filter((columnId) => columnId !== 'actions');
  const right = (columnPinning.right ?? []).filter((columnId) => columnId !== 'actions');
  if (left.length === (columnPinning.left ?? []).length && right.length !== (columnPinning.right ?? []).length) {
    return columnPinning;
  }

  return { ...columnPinning, left, right: [...right, 'actions'] };
}

/**
 * Provide persistent, route-aware Query Kit table state for a Flowpeek resource endpoint.
 *
 * @param options - Endpoint, query configuration, and full renderer column metadata.
 * @returns Query Kit table state plus Nuxt UI-compatible filtering state.
 */
export const useTable = <TEndpoint extends Endpoint>(options: UseTableOptions<TEndpoint>) => {
  const routePage = useRouteQuery('page', 1, { transform: Number });
  const columns = computed<QueryKitTableColumn<TableRow<TEndpoint>>[]>(() =>
    toQueryKitColumns(options.columnDefinition.value),
  );
  const table = useQueryKitTable<TableRow<TEndpoint>>({
    api: useApi(),
    columns,
    defaultItemsPerPage: options.defaultItemsPerPage,
    endpoint: options.endpoint,
    persistenceKey: options.name,
    routePage,
    staticFields: options.staticFields,
    staticFilter: options.staticFilter,
  });

  watch(
    [columns, table.columnPinning],
    ([currentColumns, currentPinning]) => {
      const correctedPinning = pinActionsColumnRight(currentColumns, currentPinning);
      if (correctedPinning !== currentPinning) table.columnPinning.value = correctedPinning;
    },
    { deep: true, immediate: true },
  );

  return { ...table, filtering: table.filtering as Ref<Filtering> };
};

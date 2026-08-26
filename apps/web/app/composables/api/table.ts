import type { Filtering } from '@querry-kit/nuxt-ui/types';
import { useTable as useQueryKitTable } from '@querry-kit/nuxt/table';
import type { TableColumn as QueryKitTableColumn } from '@querry-kit/nuxt/types';
import { useRouteQuery } from '@vueuse/router';
import { computed, type Ref } from 'vue';

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

  return { ...table, filtering: table.filtering as Ref<Filtering> };
};

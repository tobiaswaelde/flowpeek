import type { TableColumn } from '#ui/types';

/**
 * Nuxt UI column metadata augmented with the fields required by Flowpeek's Query Kit table adapter.
 *
 * The full renderer metadata remains available after the adapter derives the fields requested from the API.
 */
export type ColumnDefinition<
  TItem,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> = TableColumn<TItem> &
  TMetadata & {
    accessorKey?: string;
    fields?: string[];
    id?: string;
  };

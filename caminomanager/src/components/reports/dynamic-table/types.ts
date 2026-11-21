import { type AppTableFeatures } from "@/lib/tableFeatures";
import type { RowData } from "@tanstack/react-table";
import {
  ColumnDef,
  SortingState,
  ColumnVisibilityState,
} from "@tanstack/react-table";

export interface DynamicColumnMeta {
  filterType?: "text" | "select";
  enableGrouping?: boolean;
  aggregationType?: "count" | "sum" | "uniqueCount";
  aggregationLabel?: string;
  align?: "left" | "center" | "right";
}

export interface DynamicReportConfig<TData extends RowData> {
  title: string;
  description: string;
  columns: ColumnDef<AppTableFeatures, TData>[];
  exportFileName?: string;
  defaultGrouping?: string[];
  defaultSorting?: SortingState;
  globalFilterPlaceholder?: string;
  dataGrid?: {
    pageSize?: number;
    defaultColumnVisibility?: ColumnVisibilityState;
  };
}

export interface DynamicReportTableProps<TData extends RowData> {
  config: DynamicReportConfig<TData>;
  data: TData[];
  loading: boolean;
  onRefresh: () => void;
  loadExportRows: () => Promise<TData[]>;
}

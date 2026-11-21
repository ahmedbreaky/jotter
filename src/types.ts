import type { JSONContent } from "@tiptap/react";

export type ColumnType = "text" | "number" | "select" | "multi_select" | "date" | "checkbox" | "url";

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
}

export type CellValue = string | number | boolean | string[] | null;

export interface Row {
  id: string;
  cells: Record<string, CellValue>;
}

export interface TableData {
  columns: Column[];
  rows: Row[];
  sort?: { columnId: string; dir: "asc" | "desc" } | null;
  filter?: string;
  view?: "table" | "board";
  groupBy?: string | null; // select column used to group the board
  calcs?: Record<string, CalcKind>;
}

export type CalcKind = "none" | "count" | "filled" | "sum" | "avg" | "min" | "max" | "checked";

export interface PageStyle {
  font: "sans" | "serif" | "mono";
  small: boolean;
  full: boolean;
}

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  kind: "doc" | "table";
  content: JSONContent | null;
  table: TableData | null;
  style?: PageStyle;
  favorite: boolean;
  expanded: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  pages: Record<string, Page>;
  order: string[]; // ordering of all page ids (siblings sorted by this)
  currentId: string | null;
  theme: "light" | "dark" | "system";
}

import type { JSONContent } from "@tiptap/react";

export type ColumnType = "text" | "number" | "select" | "date" | "checkbox";

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
}

export type CellValue = string | number | boolean | null;

export interface Row {
  id: string;
  cells: Record<string, CellValue>;
}

export interface TableData {
  columns: Column[];
  rows: Row[];
  sort?: { columnId: string; dir: "asc" | "desc" } | null;
  filter?: string;
}

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  kind: "doc" | "table";
  content: JSONContent | null;
  table: TableData | null;
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

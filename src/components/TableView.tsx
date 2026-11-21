import { useMemo, useState } from "react";
import { uid } from "../store";
import type { CellValue, Column, ColumnType, Row, TableData } from "../types";

const TYPE_LABEL: Record<ColumnType, string> = {
  text: "Aa Text",
  number: "# Number",
  select: "▾ Select",
  date: "📅 Date",
  checkbox: "☑ Checkbox",
};

export function TableView({ table, onChange }: { table: TableData; onChange: (t: TableData) => void }) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const { columns, rows, sort, filter = "" } = table;

  const visible = useMemo(() => {
    let out = rows;
    const q = filter.trim().toLowerCase();
    if (q) out = out.filter((r) => columns.some((c) => String(r.cells[c.id] ?? "").toLowerCase().includes(q)));
    if (sort) {
      const col = columns.find((c) => c.id === sort.columnId);
      if (col) {
        const k = (r: Row) => {
          const v = r.cells[col.id];
          if (col.type === "number") return v === "" || v == null ? -Infinity : Number(v);
          if (col.type === "checkbox") return v ? 1 : 0;
          if (col.type === "select") return (col.options ?? []).indexOf(String(v ?? ""));
          return String(v ?? "").toLowerCase();
        };
        out = [...out].sort((a, b) => {
          const x = k(a), y = k(b);
          const c = x < y ? -1 : x > y ? 1 : 0;
          return sort.dir === "asc" ? c : -c;
        });
      }
    }
    return out;
  }, [rows, columns, sort, filter]);

  const set = (patch: Partial<TableData>) => onChange({ ...table, ...patch });
  const setCell = (rowId: string, colId: string, v: CellValue) =>
    set({ rows: rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: v } } : r)) });
  const setCol = (colId: string, patch: Partial<Column>) =>
    set({ columns: columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)) });

  const addRow = () => set({ rows: [...rows, { id: uid(), cells: {} }] });
  const addCol = () => {
    const id = uid();
    set({ columns: [...columns, { id, name: "New column", type: "text" }] });
    setEditingCol(id);
  };
  const toggleSort = (colId: string) => {
    if (!sort || sort.columnId !== colId) set({ sort: { columnId: colId, dir: "asc" } });
    else if (sort.dir === "asc") set({ sort: { columnId: colId, dir: "desc" } });
    else set({ sort: null });
  };

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <input
          className="table-filter"
          placeholder="Filter rows…"
          value={filter}
          onChange={(e) => set({ filter: e.target.value })}
        />
        <span className="muted">{visible.length} of {rows.length} rows</span>
      </div>
      <div className="table-scroll">
        <table className="db">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id}>
                  <div className="th">
                    <button className="th-name" onClick={() => setEditingCol(editingCol === c.id ? null : c.id)}>
                      <span className="th-type">{TYPE_LABEL[c.type].split(" ")[0]}</span> {c.name}
                    </button>
                    <button className="th-sort" title="Sort" onClick={() => toggleSort(c.id)}>
                      {sort?.columnId === c.id ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                    </button>
                  </div>
                  {editingCol === c.id && (
                    <ColumnEditor
                      col={c}
                      onChange={(p) => setCol(c.id, p)}
                      onDelete={() => {
                        set({
                          columns: columns.filter((x) => x.id !== c.id),
                          sort: sort?.columnId === c.id ? null : sort,
                        });
                        setEditingCol(null);
                      }}
                      onClose={() => setEditingCol(null)}
                      canDelete={columns.length > 1}
                    />
                  )}
                </th>
              ))}
              <th className="th-add">
                <button onClick={addCol} title="Add column">+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.id}>
                    <Cell col={c} value={r.cells[c.id] ?? null} onChange={(v) => setCell(r.id, c.id, v)} />
                  </td>
                ))}
                <td className="td-del">
                  <button title="Delete row" onClick={() => set({ rows: rows.filter((x) => x.id !== r.id) })}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="add-row" onClick={addRow}>+ New row</button>
    </div>
  );
}

function Cell({ col, value, onChange }: { col: Column; value: CellValue; onChange: (v: CellValue) => void }) {
  switch (col.type) {
    case "checkbox":
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} aria-label={col.name} />;
    case "number":
      return (
        <input
          className="cell"
          type="number"
          value={value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "date":
      return <input className="cell" type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "select": {
      const opts = col.options ?? [];
      const idx = opts.indexOf(String(value ?? ""));
      return (
        <select
          className={`cell select tag-${idx >= 0 ? idx % 6 : "none"}`}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    default:
      return <input className="cell" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  }
}

function ColumnEditor({
  col,
  onChange,
  onDelete,
  onClose,
  canDelete,
}: {
  col: Column;
  onChange: (p: Partial<Column>) => void;
  onDelete: () => void;
  onClose: () => void;
  canDelete: boolean;
}) {
  const [opts, setOpts] = useState((col.options ?? []).join(", "));
  return (
    <div className="col-editor" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <label>
        Name
        <input autoFocus value={col.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label>
        Type
        <select value={col.type} onChange={(e) => onChange({ type: e.target.value as ColumnType })}>
          {(Object.keys(TYPE_LABEL) as ColumnType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
      </label>
      {col.type === "select" && (
        <label>
          Options (comma separated)
          <input
            value={opts}
            onChange={(e) => {
              setOpts(e.target.value);
              onChange({ options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
            }}
          />
        </label>
      )}
      <div className="col-editor-actions">
        {canDelete && <button className="danger" onClick={onDelete}>Delete column</button>}
        <button onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

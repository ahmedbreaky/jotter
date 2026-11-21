import { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../store";
import type { CalcKind, CellValue, Column, ColumnType, Row, TableData } from "../types";

const TYPE_LABEL: Record<ColumnType, string> = {
  text: "Aa Text",
  number: "# Number",
  select: "▾ Select",
  multi_select: "☰ Multi-select",
  date: "📅 Date",
  checkbox: "☑ Checkbox",
  url: "🔗 Link",
};

const CALC_LABEL: Record<CalcKind, string> = {
  none: "Calculate",
  count: "Count all",
  filled: "Not empty",
  sum: "Sum",
  avg: "Average",
  min: "Min",
  max: "Max",
  checked: "Checked",
};

function calcsFor(type: ColumnType): CalcKind[] {
  if (type === "number") return ["none", "count", "filled", "sum", "avg", "min", "max"];
  if (type === "checkbox") return ["none", "count", "checked"];
  return ["none", "count", "filled"];
}

const isEmpty = (v: CellValue | undefined) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

function computeCalc(kind: CalcKind, col: Column, rows: Row[]): string {
  const vals = rows.map((r) => r.cells[col.id]);
  const nums = vals.filter((v) => v !== "" && v != null && !isNaN(Number(v))).map(Number);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  switch (kind) {
    case "count": return String(rows.length);
    case "filled": return `${vals.filter((v) => !isEmpty(v)).length} / ${rows.length}`;
    case "sum": return fmt(nums.reduce((a, b) => a + b, 0));
    case "avg": return nums.length ? fmt(nums.reduce((a, b) => a + b, 0) / nums.length) : "–";
    case "min": return nums.length ? fmt(Math.min(...nums)) : "–";
    case "max": return nums.length ? fmt(Math.max(...nums)) : "–";
    case "checked": {
      const n = vals.filter(Boolean).length;
      return `${n} / ${rows.length} (${rows.length ? Math.round((n / rows.length) * 100) : 0}%)`;
    }
    default: return "";
  }
}

const asText = (v: CellValue | undefined) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

export function TableView({ table, onChange }: { table: TableData; onChange: (t: TableData) => void }) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const { columns, rows, sort, filter = "", view = "table", calcs = {} } = table;
  const selectCols = columns.filter((c) => c.type === "select");
  const groupCol = columns.find((c) => c.id === table.groupBy && c.type === "select") ?? selectCols[0];

  const visible = useMemo(() => {
    let out = rows;
    const q = filter.trim().toLowerCase();
    if (q) out = out.filter((r) => columns.some((c) => asText(r.cells[c.id]).toLowerCase().includes(q)));
    if (sort) {
      const col = columns.find((c) => c.id === sort.columnId);
      if (col) {
        const k = (r: Row) => {
          const v = r.cells[col.id];
          if (col.type === "number") return v === "" || v == null ? -Infinity : Number(v);
          if (col.type === "checkbox") return v ? 1 : 0;
          if (col.type === "select") return (col.options ?? []).indexOf(String(v ?? ""));
          return asText(v).toLowerCase();
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
  const moveCol = (colId: string, dir: -1 | 1) => {
    const i = columns.findIndex((c) => c.id === colId);
    const j = i + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[i], next[j]] = [next[j], next[i]];
    set({ columns: next });
  };

  const addRow = (cells: Record<string, CellValue> = {}) => set({ rows: [...rows, { id: uid(), cells }] });
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
        <div className="view-tabs" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === "table"} className={view === "table" ? "on" : ""} onClick={() => set({ view: "table" })}>
            ▦ Table
          </button>
          <button role="tab" aria-selected={view === "board"} className={view === "board" ? "on" : ""} onClick={() => set({ view: "board" })}>
            ▥ Board
          </button>
        </div>
        {view === "board" && selectCols.length > 0 && (
          <label className="group-by">
            Group by
            <select id="group-by" value={groupCol?.id ?? ""} onChange={(e) => set({ groupBy: e.target.value })}>
              {selectCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <input
          id="table-filter"
          className="table-filter"
          placeholder="Filter rows…"
          value={filter}
          onChange={(e) => set({ filter: e.target.value })}
        />
        <span className="muted">{visible.length} of {rows.length}</span>
      </div>

      {view === "board" ? (
        groupCol ? (
          <Board
            table={table}
            rows={visible}
            group={groupCol}
            onCell={setCell}
            onAdd={(value) => addRow({ [groupCol.id]: value })}
            onDelete={(id) => set({ rows: rows.filter((r) => r.id !== id) })}
          />
        ) : (
          <div className="board-empty">
            The board groups cards by a Select column. Add one in Table view, then come back.
            <button onClick={() => { set({ view: "table" }); addCol(); }}>Add a column</button>
          </div>
        )
      ) : (
        <>
          <div className="table-scroll">
            <table className="db">
              <thead>
                <tr>
                  {columns.map((c, i) => (
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
                          first={i === 0}
                          last={i === columns.length - 1}
                          onMove={(d) => moveCol(c.id, d)}
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
              <tfoot>
                <tr>
                  {columns.map((c) => {
                    const kind = calcs[c.id] ?? "none";
                    return (
                      <td key={c.id} className="calc">
                        <select
                          aria-label={`Calculation for ${c.name}`}
                          value={kind}
                          onChange={(e) => set({ calcs: { ...calcs, [c.id]: e.target.value as CalcKind } })}
                        >
                          {calcsFor(c.type).map((k) => <option key={k} value={k}>{CALC_LABEL[k]}</option>)}
                        </select>
                        {kind === "none" ? (
                          <span className="calc-hint">Calculate</span>
                        ) : (
                          <span className="calc-out">
                            {CALC_LABEL[kind]} <span className="calc-val">{computeCalc(kind, c, visible)}</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button className="add-row" onClick={() => addRow()}>+ New row</button>
        </>
      )}
    </div>
  );
}

function Board({
  table, rows, group, onCell, onAdd, onDelete,
}: {
  table: TableData;
  rows: Row[];
  group: Column;
  onCell: (rowId: string, colId: string, v: CellValue) => void;
  onAdd: (value: string) => void;
  onDelete: (rowId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const options = group.options ?? [];
  const lanes = [...options, ""]; // "" = no value
  const title = table.columns.find((c) => c.type === "text") ?? table.columns[0];
  const shown = table.columns.filter((c) => c.id !== title.id && c.id !== group.id);

  return (
    <div className="board">
      {lanes.map((lane) => {
        const items = rows.filter((r) => (lane === "" ? !options.includes(String(r.cells[group.id] ?? "")) : r.cells[group.id] === lane));
        if (lane === "" && items.length === 0) return null;
        const idx = options.indexOf(lane);
        return (
          <section
            key={lane || "__none"}
            className={`lane ${over === lane ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(lane); }}
            onDragLeave={() => setOver((o) => (o === lane ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onCell(dragId, group.id, lane);
              setDragId(null);
              setOver(null);
            }}
          >
            <header className="lane-head">
              <span className={`pill tag-${idx >= 0 ? idx % 6 : "none"}`}>{lane || `No ${group.name}`}</span>
              <span className="muted">{items.length}</span>
            </header>
            {items.map((r) => (
              <article
                key={r.id}
                className={`card ${dragId === r.id ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => { setDragId(r.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", r.id); }}
                onDragEnd={() => { setDragId(null); setOver(null); }}
              >
                <input
                  className="card-title"
                  aria-label={title.name}
                  placeholder="Untitled"
                  value={asText(r.cells[title.id])}
                  onChange={(e) => onCell(r.id, title.id, e.target.value)}
                />
                <div className="card-props">
                  {shown.map((c) => {
                    const v = r.cells[c.id];
                    if (isEmpty(v) || v === false) return null;
                    return <CardProp key={c.id} col={c} value={v} />;
                  })}
                </div>
                <div className="card-foot">
                  <select
                    aria-label={`Move to ${group.name}`}
                    value={String(r.cells[group.id] ?? "")}
                    onChange={(e) => onCell(r.id, group.id, e.target.value)}
                  >
                    <option value="">No {group.name}</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button title="Delete card" onClick={() => onDelete(r.id)}>×</button>
                </div>
              </article>
            ))}
            <button className="lane-add" onClick={() => onAdd(lane)}>+ New</button>
          </section>
        );
      })}
    </div>
  );
}

function CardProp({ col, value }: { col: Column; value: CellValue }) {
  if (col.type === "multi_select" && Array.isArray(value))
    return (
      <span className="tags">
        {value.map((t) => <span key={t} className={`pill tag-${Math.max(0, (col.options ?? []).indexOf(t)) % 6}`}>{t}</span>)}
      </span>
    );
  if (col.type === "select") {
    const i = (col.options ?? []).indexOf(String(value));
    return <span className={`pill tag-${i >= 0 ? i % 6 : "none"}`}>{String(value)}</span>;
  }
  if (col.type === "checkbox") return <span className="muted">☑ {col.name}</span>;
  if (col.type === "url") return <a className="cell-link" href={safeUrl(String(value))} target="_blank" rel="noreferrer">{String(value)}</a>;
  if (col.type === "number") return <span className="muted">{col.name} <b className="num-val">{asText(value)}</b></span>;
  return <span className="muted">{col.type === "date" ? "📅 " : ""}{asText(value)}</span>;
}

function safeUrl(v: string) {
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s.replace(/^[a-z]+:/i, "");
}

function Cell({ col, value, onChange }: { col: Column; value: CellValue; onChange: (v: CellValue) => void }) {
  switch (col.type) {
    case "checkbox":
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} aria-label={col.name} />;
    case "number":
      return (
        <input
          className="cell num"
          type="number"
          value={value === null || Array.isArray(value) ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "date":
      return <input className="cell" type="date" value={asText(value)} onChange={(e) => onChange(e.target.value)} />;
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
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    case "multi_select":
      return <MultiSelect col={col} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case "url":
      return (
        <div className="url-cell">
          <input className="cell" type="url" placeholder="https://" value={asText(value)} onChange={(e) => onChange(e.target.value)} />
          {!isEmpty(value) && (
            <a href={safeUrl(asText(value))} target="_blank" rel="noreferrer" title="Open link" aria-label="Open link">↗</a>
          )}
        </div>
      );
    default:
      return <input className="cell" value={asText(value)} onChange={(e) => onChange(e.target.value)} />;
  }
}

function MultiSelect({ col, value, onChange }: { col: Column; value: string[]; onChange: (v: CellValue) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const opts = col.options ?? [];
  return (
    <div className="ms" ref={ref}>
      <button className="ms-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {value.length === 0 ? <span className="muted">—</span> : value.map((t) => (
          <span key={t} className={`pill tag-${Math.max(0, opts.indexOf(t)) % 6}`}>{t}</span>
        ))}
      </button>
      {open && (
        <div className="ms-pop" role="listbox" aria-multiselectable="true">
          {opts.length === 0 && <div className="muted pad">Add options in the column settings.</div>}
          {opts.map((o, i) => {
            const on = value.includes(o);
            return (
              <label key={o} className="ms-opt">
                <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} />
                <span className={`pill tag-${i % 6}`}>{o}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ColumnEditor({
  col, first, last, onMove, onChange, onDelete, onClose, canDelete,
}: {
  col: Column;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onChange: (p: Partial<Column>) => void;
  onDelete: () => void;
  onClose: () => void;
  canDelete: boolean;
}) {
  const [opts, setOpts] = useState((col.options ?? []).join(", "));
  const hasOptions = col.type === "select" || col.type === "multi_select";
  return (
    <div className="col-editor" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <label>
        Name
        <input id={`col-name-${col.id}`} autoFocus value={col.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label>
        Type
        <select id={`col-type-${col.id}`} value={col.type} onChange={(e) => onChange({ type: e.target.value as ColumnType })}>
          {(Object.keys(TYPE_LABEL) as ColumnType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </label>
      {hasOptions && (
        <label>
          Options (comma separated)
          <input
            id={`col-opts-${col.id}`}
            value={opts}
            onChange={(e) => {
              setOpts(e.target.value);
              onChange({ options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
            }}
          />
        </label>
      )}
      <div className="col-move">
        <button disabled={first} onClick={() => onMove(-1)}>← Move left</button>
        <button disabled={last} onClick={() => onMove(1)}>Move right →</button>
      </div>
      <div className="col-editor-actions">
        {canDelete && <button className="danger" onClick={onDelete}>Delete column</button>}
        <button onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

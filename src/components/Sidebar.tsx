import { APP_NAME } from "../config";
import { children } from "../store";
import type { Page, Workspace } from "../types";

interface Props {
  ws: Workspace;
  onSelect: (id: string) => void;
  onCreate: (parentId: string | null, kind?: Page["kind"]) => void;
  onToggle: (id: string) => void;
  onSearch: () => void;
  onTheme: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ ws, onSelect, onCreate, onToggle, onSearch, onTheme, open, onClose }: Props) {
  const favorites = ws.order.map((id) => ws.pages[id]).filter((p) => p?.favorite);
  const themeLabel = ws.theme === "system" ? "Auto" : ws.theme === "dark" ? "Dark" : "Light";

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span className="logo">J</span>
          <span>{APP_NAME}</span>
        </div>
        <button className="side-btn" onClick={onSearch}>
          <span>🔍</span> Search <kbd>Ctrl K</kbd>
        </button>
        <button className="side-btn" onClick={onTheme}>
          <span>🌓</span> Theme: {themeLabel}
        </button>

        {favorites.length > 0 && (
          <>
            <div className="side-label">Favorites</div>
            {favorites.map((p) => (
              <button
                key={p.id}
                className={`tree-row ${ws.currentId === p.id ? "active" : ""}`}
                onClick={() => onSelect(p.id)}
              >
                <span className="twisty" />
                <span className="icon">{p.icon}</span>
                <span className="title">{p.title || "Untitled"}</span>
              </button>
            ))}
          </>
        )}

        <div className="side-label">
          Pages
          <span className="side-actions">
            <button title="New page" onClick={() => onCreate(null, "doc")}>+</button>
            <button title="New table" onClick={() => onCreate(null, "table")}>▦</button>
          </span>
        </div>
        <nav className="tree">
          <Tree ws={ws} parentId={null} depth={0} onSelect={onSelect} onCreate={onCreate} onToggle={onToggle} />
        </nav>
      </aside>
    </>
  );
}

function Tree({
  ws,
  parentId,
  depth,
  onSelect,
  onCreate,
  onToggle,
}: {
  ws: Workspace;
  parentId: string | null;
  depth: number;
  onSelect: (id: string) => void;
  onCreate: (parentId: string | null, kind?: Page["kind"]) => void;
  onToggle: (id: string) => void;
}) {
  const kids = children(ws, parentId);
  if (kids.length === 0 && depth > 0)
    return <div className="tree-empty" style={{ paddingLeft: 12 + depth * 14 + 22 }}>No pages inside</div>;
  return (
    <>
      {kids.map((p) => {
        return (
          <div key={p.id}>
            <div
              className={`tree-row ${ws.currentId === p.id ? "active" : ""}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => onSelect(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(p.id)}
            >
              <button
                className="twisty"
                aria-label={p.expanded ? "Collapse" : "Expand"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(p.id);
                }}
              >
                {p.expanded ? "▾" : "▸"}
              </button>
              <span className="icon">{p.icon}</span>
              <span className="title">{p.title || "Untitled"}</span>
              <button
                className="row-add"
                title="Add a page inside"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreate(p.id, "doc");
                }}
              >
                +
              </button>
            </div>
            {p.expanded && (
              <Tree ws={ws} parentId={p.id} depth={depth + 1} onSelect={onSelect} onCreate={onCreate} onToggle={onToggle} />
            )}
          </div>
        );
      })}
    </>
  );
}

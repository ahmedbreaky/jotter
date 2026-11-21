import { useEffect, useState } from "react";
import { APP_NAME } from "./config";
import { breadcrumb, children, useWorkspace } from "./store";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import { TableView } from "./components/TableView";
import { SearchModal } from "./components/SearchModal";

const ICONS = ["📄", "📝", "📚", "✅", "🗂️", "💡", "🎯", "📌", "🚀", "🧠", "🌱", "📅", "🏠", "💼", "🎨", "🔖"];

export default function App() {
  const { ws, update, create, remove, select, setContent, setTheme } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const page = ws.currentId ? ws.pages[ws.currentId] : undefined;

  useEffect(() => {
    const root = document.documentElement;
    if (ws.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", ws.theme);
  }, [ws.theme]);

  useEffect(() => {
    document.title = page ? `${page.title || "Untitled"} · ${APP_NAME}` : APP_NAME;
  }, [page?.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (id: string) => {
    select(id);
    setSideOpen(false);
    setSearchOpen(false);
    setIconOpen(false);
  };

  const cycleTheme = () => setTheme(ws.theme === "system" ? "light" : ws.theme === "light" ? "dark" : "system");

  return (
    <div className="app">
      <Sidebar
        ws={ws}
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        onSelect={go}
        onCreate={(parent, kind) => {
          create(parent, kind);
          setSideOpen(false);
        }}
        onToggle={(id) => update(id, { expanded: !ws.pages[id].expanded })}
        onSearch={() => setSearchOpen(true)}
        onTheme={cycleTheme}
      />

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Open sidebar" onClick={() => setSideOpen(true)}>☰</button>
          <div className="crumbs">
            {page &&
              breadcrumb(ws, page.id).map((p, i, arr) => (
                <span key={p.id}>
                  <button className="crumb" onClick={() => go(p.id)}>
                    {p.icon} {p.title || "Untitled"}
                  </button>
                  {i < arr.length - 1 && <span className="sep">/</span>}
                </span>
              ))}
          </div>
          {page && (
            <div className="top-actions">
              <button
                className={page.favorite ? "fav on" : "fav"}
                title={page.favorite ? "Remove from favorites" : "Add to favorites"}
                onClick={() => update(page.id, { favorite: !page.favorite })}
              >
                {page.favorite ? "★" : "☆"}
              </button>
              {confirmDel === page.id ? (
                <button
                  className="confirm-del"
                  onClick={() => { remove(page.id); setConfirmDel(null); }}
                  onBlur={() => setConfirmDel(null)}
                  autoFocus
                >
                  {countDescendants(page.id) ? `Delete with ${countDescendants(page.id)} inside?` : "Delete page?"}
                </button>
              ) : (
                <button className="danger-ghost" title="Delete page" onClick={() => setConfirmDel(page.id)}>
                  🗑
                </button>
              )}
            </div>
          )}
        </header>

        {page ? (
          <article className={`page ${page.kind === "table" ? "wide" : ""}`} key={page.id}>
            <div className="icon-wrap">
              <button className="page-icon" onClick={() => setIconOpen((o) => !o)} aria-label="Change icon">
                {page.icon}
              </button>
              {iconOpen && (
                <div className="icon-picker">
                  {ICONS.map((ic) => (
                    <button key={ic} onClick={() => { update(page.id, { icon: ic }); setIconOpen(false); }}>{ic}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              className="page-title"
              placeholder="Untitled"
              value={page.title}
              onChange={(e) => update(page.id, { title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (document.querySelector(".prose") as HTMLElement | null)?.focus();
                }
              }}
            />
            {page.kind === "table" && page.table ? (
              <TableView table={page.table} onChange={(t) => update(page.id, { table: t })} />
            ) : (
              <Editor pageId={page.id} content={page.content} onChange={(c) => setContent(page.id, c)} />
            )}

            {renderSubPages()}
          </article>
        ) : (
          <div className="empty">
            <p>No page selected.</p>
            <button className="primary" onClick={() => create(null)}>Create a page</button>
          </div>
        )}
      </main>

      {searchOpen && <SearchModal ws={ws} onPick={go} onClose={() => setSearchOpen(false)} />}
    </div>
  );

  function countDescendants(id: string): number {
    return children(ws, id).reduce((n, c) => n + 1 + countDescendants(c.id), 0);
  }

  function renderSubPages() {
    if (!page) return null;
    const kids = children(ws, page.id);
    return (
      <section className="subpages">
        {kids.map((k) => (
          <button key={k.id} className="subpage" onClick={() => go(k.id)}>
            <span>{k.icon}</span> <u>{k.title || "Untitled"}</u>
          </button>
        ))}
        <div className="subpage-add">
          <button onClick={() => create(page.id, "doc")}>+ Add page inside</button>
          <button onClick={() => create(page.id, "table")}>+ Add table inside</button>
        </div>
      </section>
    );
  }
}

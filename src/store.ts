import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type { Page, TableData, Workspace } from "./types";

const KEY = "jotter.workspace.v1";

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

function newPage(partial: Partial<Page> = {}): Page {
  const now = Date.now();
  return {
    id: uid(),
    parentId: null,
    title: "",
    icon: "📄",
    kind: "doc",
    content: null,
    table: null,
    favorite: false,
    expanded: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function defaultTable(): TableData {
  const name = uid(), status = uid(), tags = uid(), pts = uid(), due = uid(), link = uid(), done = uid();
  return {
    columns: [
      { id: name, name: "Name", type: "text" },
      { id: status, name: "Status", type: "select", options: ["Not started", "In progress", "Done"] },
      { id: tags, name: "Tags", type: "multi_select", options: ["Design", "Writing", "Research", "Urgent"] },
      { id: pts, name: "Hours", type: "number" },
      { id: due, name: "Due", type: "date" },
      { id: link, name: "Link", type: "url" },
      { id: done, name: "Reviewed", type: "checkbox" },
    ],
    rows: [
      { id: uid(), cells: { [name]: "Example: draft outline", [status]: "Done", [tags]: ["Writing"], [pts]: 2, [due]: "", [link]: "", [done]: true } },
      { id: uid(), cells: { [name]: "Example: collect sources", [status]: "In progress", [tags]: ["Research", "Urgent"], [pts]: 3, [due]: "", [link]: "", [done]: false } },
      { id: uid(), cells: { [name]: "Example: sketch cover", [status]: "Not started", [tags]: ["Design"], [pts]: 1.5, [due]: "", [link]: "", [done]: false } },
    ],
    sort: null,
    filter: "",
    view: "table",
    groupBy: status,
    calcs: { [name]: "count", [pts]: "sum", [done]: "checked" },
  };
}

function seed(): Workspace {
  const welcome = newPage({
    title: "Welcome",
    icon: "👋",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Getting started" }] },
        { type: "paragraph", content: [{ type: "text", text: "Type / anywhere to insert a block: headings, lists, to-dos, quotes, code and more." }] },
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Open this page" }] }] },
            { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Create a page with + in the sidebar" }] }] },
            { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Press Ctrl/⌘ + K to search" }] }] },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "Everything is saved in this browser automatically." }] },
      ],
    },
  });
  const tasks = newPage({ title: "Tasks", icon: "✅", kind: "table", table: defaultTable() });
  return {
    pages: { [welcome.id]: welcome, [tasks.id]: tasks },
    order: [welcome.id, tasks.id],
    currentId: welcome.id,
    theme: "system",
  };
}

function load(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const ws = JSON.parse(raw) as Workspace;
      if (ws && ws.pages && Array.isArray(ws.order)) return ws;
    }
  } catch {
    /* storage unavailable or corrupt */
  }
  return seed();
}

export function useWorkspace() {
  const [ws, setWs] = useState<Workspace>(load);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(ws));
      } catch {
        /* quota or blocked */
      }
    }, 250);
  }, [ws]);

  const update = useCallback((id: string, patch: Partial<Page>) => {
    setWs((w) => {
      const p = w.pages[id];
      if (!p) return w;
      return { ...w, pages: { ...w.pages, [id]: { ...p, ...patch, updatedAt: Date.now() } } };
    });
  }, []);

  const create = useCallback((parentId: string | null, kind: Page["kind"] = "doc") => {
    const page = newPage({
      parentId,
      kind,
      icon: kind === "table" ? "🗂️" : "📄",
      table: kind === "table" ? defaultTable() : null,
    });
    setWs((w) => {
      const pages = { ...w.pages, [page.id]: page };
      if (parentId && pages[parentId]) pages[parentId] = { ...pages[parentId], expanded: true };
      return { ...w, pages, order: [...w.order, page.id], currentId: page.id };
    });
    return page.id;
  }, []);

  const remove = useCallback((id: string) => {
    setWs((w) => {
      const doomed = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of Object.values(w.pages)) {
          if (p.parentId && doomed.has(p.parentId) && !doomed.has(p.id)) {
            doomed.add(p.id);
            grew = true;
          }
        }
      }
      const pages = { ...w.pages };
      doomed.forEach((d) => delete pages[d]);
      const order = w.order.filter((o) => !doomed.has(o));
      const currentId = w.currentId && doomed.has(w.currentId) ? order[0] ?? null : w.currentId;
      return { ...w, pages, order, currentId };
    });
  }, []);

  const select = useCallback((id: string | null) => setWs((w) => ({ ...w, currentId: id })), []);

  const setContent = useCallback(
    (id: string, content: JSONContent) => update(id, { content }),
    [update],
  );

  const setTheme = useCallback((theme: Workspace["theme"]) => setWs((w) => ({ ...w, theme })), []);

  return { ws, update, create, remove, select, setContent, setTheme };
}

export function children(ws: Workspace, parentId: string | null): Page[] {
  return ws.order.map((id) => ws.pages[id]).filter((p): p is Page => !!p && p.parentId === parentId);
}

export function breadcrumb(ws: Workspace, id: string): Page[] {
  const trail: Page[] = [];
  let cur: Page | undefined = ws.pages[id];
  while (cur) {
    trail.unshift(cur);
    cur = cur.parentId ? ws.pages[cur.parentId] : undefined;
  }
  return trail;
}

export function plainText(node: JSONContent | null | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? []).map(plainText).join(" ");
}

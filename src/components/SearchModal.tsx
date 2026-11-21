import { useEffect, useMemo, useState } from "react";
import { plainText } from "../store";
import type { Workspace } from "../types";

export function SearchModal({ ws, onPick, onClose }: { ws: Workspace; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const all = ws.order.map((id) => ws.pages[id]).filter(Boolean);
    if (!query) return all.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8).map((p) => ({ p, snippet: "" }));
    return all
      .map((p) => {
        const body = p.kind === "table"
          ? (p.table?.rows ?? []).map((r) => Object.values(r.cells).join(" ")).join(" ")
          : plainText(p.content);
        const inTitle = (p.title || "Untitled").toLowerCase().includes(query);
        const at = body.toLowerCase().indexOf(query);
        if (!inTitle && at < 0) return null;
        const snippet = at >= 0 ? "…" + body.slice(Math.max(0, at - 30), at + 60) + "…" : "";
        return { p, snippet, score: inTitle ? 0 : 1 };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.score - b.score);
  }, [q, ws]);

  useEffect(() => setIndex(0), [q]);

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <input
          autoFocus
          className="search-input"
          placeholder="Search pages…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && results[index]) onPick(results[index].p.id);
          }}
        />
        <div className="search-results">
          {!q && <div className="side-label">Recent</div>}
          {results.length === 0 && <div className="muted pad">No matching pages</div>}
          {results.map((r, i) => (
            <button
              key={r.p.id}
              className={`search-row ${i === index ? "sel" : ""}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => onPick(r.p.id)}
            >
              <span className="icon">{r.p.icon}</span>
              <span>
                <span className="title">{r.p.title || "Untitled"}</span>
                {r.snippet && <span className="snippet">{r.snippet}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

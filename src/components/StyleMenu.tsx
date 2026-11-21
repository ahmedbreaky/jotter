import { useEffect, useRef, useState } from "react";
import type { PageStyle } from "../types";

export const DEFAULT_STYLE: PageStyle = { font: "sans", small: false, full: false };

const FONTS: { id: PageStyle["font"]; label: string }[] = [
  { id: "sans", label: "Default" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
];

export function StyleMenu({ style, onChange }: { style: PageStyle; onChange: (s: PageStyle) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="style-menu" ref={ref}>
      <button title="Page style" aria-label="Page style" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Aa
      </button>
      {open && (
        <div className="style-pop">
          <div className="fb-label">Font</div>
          <div className="font-choices">
            {FONTS.map((f) => (
              <button
                key={f.id}
                className={`font-choice font-${f.id} ${style.font === f.id ? "on" : ""}`}
                aria-pressed={style.font === f.id}
                onClick={() => onChange({ ...style, font: f.id })}
              >
                <span className="ag">Ag</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          <label className="switch-row">
            <span>Small text</span>
            <input id="style-small" type="checkbox" checked={style.small} onChange={(e) => onChange({ ...style, small: e.target.checked })} />
          </label>
          <label className="switch-row">
            <span>Full width</span>
            <input id="style-full" type="checkbox" checked={style.full} onChange={(e) => onChange({ ...style, full: e.target.checked })} />
          </label>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";

// Colors are CSS variables so they adapt to light and dark themes.
const COLORS = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;

export function FormatBar({ editor }: { editor: Editor }) {
  const [panel, setPanel] = useState<"none" | "color" | "link">("none");
  const [href, setHref] = useState("");

  const btn = (label: string, title: string, active: boolean, run: () => void, cls = "") => (
    <button
      type="button"
      className={`fb-btn ${active ? "on" : ""} ${cls}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  );

  const chain = () => editor.chain().focus();

  const applyLink = () => {
    const v = href.trim();
    if (!v) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: /^(https?:|mailto:)/i.test(v) ? v : `https://${v}` }).run();
    setPanel("none");
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, maxWidth: "none", onHidden: () => setPanel("none") }}
      shouldShow={({ editor, from, to }) => from !== to && !editor.isActive("codeBlock")}
    >
      <div className="fb" onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}>
        <div className="fb-row">
          {btn("B", "Bold (Ctrl+B)", editor.isActive("bold"), () => chain().toggleBold().run(), "b")}
          {btn("I", "Italic (Ctrl+I)", editor.isActive("italic"), () => chain().toggleItalic().run(), "i")}
          {btn("U", "Underline (Ctrl+U)", editor.isActive("underline"), () => chain().toggleUnderline().run(), "u")}
          {btn("S", "Strikethrough", editor.isActive("strike"), () => chain().toggleStrike().run(), "s")}
          {btn("</>", "Inline code", editor.isActive("code"), () => chain().toggleCode().run(), "mono")}
          <span className="fb-sep" />
          {btn("🔗", "Link", editor.isActive("link"), () => {
            setHref(editor.getAttributes("link").href ?? "");
            setPanel((p) => (p === "link" ? "none" : "link"));
          })}
          {btn("A", "Text and highlight color", panel === "color", () => setPanel((p) => (p === "color" ? "none" : "color")), "color-a")}
          <span className="fb-sep" />
          {btn("⇤", "Align left", editor.isActive({ textAlign: "left" }), () => chain().setTextAlign("left").run())}
          {btn("↔", "Align center", editor.isActive({ textAlign: "center" }), () => chain().setTextAlign("center").run())}
          {btn("⇥", "Align right", editor.isActive({ textAlign: "right" }), () => chain().setTextAlign("right").run())}
          <span className="fb-sep" />
          {btn("⌫", "Clear formatting", false, () => chain().unsetAllMarks().unsetTextAlign().run())}
        </div>

        {panel === "link" && (
          <form
            className="fb-link"
            onSubmit={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            <input
              id="fb-link-input"
              autoFocus
              placeholder="Paste a link…"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setPanel("none")}
            />
            <button type="submit">Apply</button>
            {editor.isActive("link") && (
              <button type="button" onClick={() => { chain().extendMarkRange("link").unsetLink().run(); setPanel("none"); }}>
                Remove
              </button>
            )}
          </form>
        )}

        {panel === "color" && (
          <div className="fb-colors">
            <div className="fb-label">Text color</div>
            <div className="fb-swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="sw sw-text"
                  title={c[0].toUpperCase() + c.slice(1)}
                  aria-label={`${c} text`}
                  style={{ color: c === "default" ? "var(--text)" : `var(--c-${c})` }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => (c === "default" ? chain().unsetColor().run() : chain().setColor(`var(--c-${c})`).run())}
                >
                  A
                </button>
              ))}
            </div>
            <div className="fb-label">Highlight</div>
            <div className="fb-swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="sw sw-bg"
                  title={c[0].toUpperCase() + c.slice(1)}
                  aria-label={`${c} highlight`}
                  style={{ background: c === "default" ? "transparent" : `var(--h-${c})` }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => (c === "default" ? chain().unsetHighlight().run() : chain().setHighlight({ color: `var(--h-${c})` }).run())}
                >
                  {c === "default" ? "⊘" : ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}

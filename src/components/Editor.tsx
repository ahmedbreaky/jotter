import { useEffect, useRef, useState } from "react";
import { EditorContent, Extension, useEditor, type Editor as TEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { TextSelection } from "@tiptap/pm/state";

interface SlashItem {
  label: string;
  hint: string;
  icon: string;
  keywords: string;
  run: (e: TEditor) => void;
}

const ITEMS: SlashItem[] = [
  { label: "Text", hint: "Plain paragraph", icon: "¶", keywords: "text paragraph", run: (e) => e.chain().focus().setParagraph().run() },
  { label: "Heading 1", hint: "Large section heading", icon: "H1", keywords: "h1 heading title", run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { label: "Heading 2", hint: "Medium section heading", icon: "H2", keywords: "h2 heading", run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { label: "Heading 3", hint: "Small section heading", icon: "H3", keywords: "h3 heading", run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { label: "To-do list", hint: "Track tasks with checkboxes", icon: "☑", keywords: "todo task checkbox check", run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: "Bulleted list", hint: "Simple bulleted list", icon: "•", keywords: "bullet unordered list ul", run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", hint: "List with numbers", icon: "1.", keywords: "number ordered list ol", run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Quote", hint: "Capture a quote", icon: "❝", keywords: "quote blockquote", run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code", hint: "Code block", icon: "</>", keywords: "code snippet pre", run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", hint: "Visual separator", icon: "—", keywords: "divider hr line rule", run: (e) => e.chain().focus().setHorizontalRule().run() },
];

/** Alt+Shift+↑/↓ moves the top-level block containing the cursor. */
const MoveBlock = Extension.create({
  name: "moveBlock",
  addKeyboardShortcuts() {
    const move = (dir: -1 | 1) => () => {
      const { state, view } = this.editor;
      const { $from } = state.selection;
      const index = $from.index(0);
      const doc = state.doc;
      const target = index + dir;
      if (target < 0 || target >= doc.childCount) return true;
      let pos = 0;
      for (let i = 0; i < Math.min(index, target); i++) pos += doc.child(i).nodeSize;
      const a = doc.child(Math.min(index, target));
      const b = doc.child(Math.max(index, target));
      const offsetInBlock = $from.pos - (dir === 1 ? pos : pos + a.nodeSize);
      const tr = state.tr.replaceWith(pos, pos + a.nodeSize + b.nodeSize, [b, a]);
      const newStart = dir === 1 ? pos + b.nodeSize : pos;
      const sel = Math.min(newStart + offsetInBlock, tr.doc.content.size);
      tr.setSelection(TextSelection.near(tr.doc.resolve(sel)));
      view.dispatch(tr.scrollIntoView());
      return true;
    };
    return { "Alt-Shift-ArrowUp": move(-1), "Alt-Shift-ArrowDown": move(1) };
  },
});

interface MenuState {
  open: boolean;
  query: string;
  from: number;
  x: number;
  y: number;
  index: number;
}

export function Editor({ pageId, content, onChange }: { pageId: string; content: JSONContent | null; onChange: (c: JSONContent) => void }) {
  const [menu, setMenu] = useState<MenuState>({ open: false, query: "", from: 0, x: 0, y: 0, index: 0 });
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const filtered = ITEMS.filter((i) => {
    const q = menu.query.toLowerCase();
    return !q || i.label.toLowerCase().includes(q) || i.keywords.includes(q);
  });
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : "Type '/' for commands"),
      }),
      MoveBlock,
    ],
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: { class: "prose", spellcheck: "true" },
      handleKeyDown: (_view, event) => {
        const m = menuRef.current;
        if (!m.open) return false;
        const items = filteredRef.current;
        if (event.key === "ArrowDown") {
          setMenu((s) => ({ ...s, index: (s.index + 1) % Math.max(items.length, 1) }));
          return true;
        }
        if (event.key === "ArrowUp") {
          setMenu((s) => ({ ...s, index: (s.index - 1 + items.length) % Math.max(items.length, 1) }));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[m.index];
          if (item) {
            apply(item);
            return true;
          }
          setMenu((s) => ({ ...s, open: false }));
          return false;
        }
        if (event.key === "Escape") {
          setMenu((s) => ({ ...s, open: false }));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON());
      detectSlash(editor);
    },
    onSelectionUpdate: ({ editor }) => detectSlash(editor),
    onBlur: () => setTimeout(() => setMenu((s) => ({ ...s, open: false })), 150),
  }, [pageId]);

  function detectSlash(editor: TEditor) {
    const { $from, empty } = editor.state.selection;
    if (!empty || editor.isActive("codeBlock")) {
      if (menuRef.current.open) setMenu((s) => ({ ...s, open: false }));
      return;
    }
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
    const match = /(?:^|\s)\/([\w ]{0,20})$/.exec(textBefore);
    if (!match) {
      if (menuRef.current.open) setMenu((s) => ({ ...s, open: false }));
      return;
    }
    const query = match[1];
    const from = $from.pos - query.length - 1;
    const coords = editor.view.coordsAtPos($from.pos);
    setMenu((s) => ({
      open: true,
      query,
      from,
      x: coords.left,
      y: coords.bottom + 6,
      index: s.open && s.query === query ? s.index : 0,
    }));
  }

  function apply(item: SlashItem) {
    if (!editor) return;
    const { from } = menuRef.current;
    const to = editor.state.selection.$from.pos;
    editor.chain().focus().deleteRange({ from, to }).run();
    item.run(editor);
    setMenu((s) => ({ ...s, open: false }));
  }

  useEffect(() => () => editor?.destroy(), [editor]);

  // keep menu inside viewport
  const left = Math.min(menu.x, window.innerWidth - 276);
  const top = menu.y + 300 > window.innerHeight ? Math.max(8, menu.y - 330) : menu.y;

  return (
    <>
      <EditorContent editor={editor} />
      {menu.open && filtered.length > 0 && (
        <div className="slash" style={{ left: Math.max(8, left), top }} role="listbox">
          <div className="slash-head">Blocks</div>
          {filtered.map((item, i) => (
            <button
              key={item.label}
              role="option"
              aria-selected={i === menu.index}
              className={`slash-item ${i === menu.index ? "sel" : ""}`}
              onMouseEnter={() => setMenu((s) => ({ ...s, index: i }))}
              onMouseDown={(e) => {
                e.preventDefault();
                apply(item);
              }}
            >
              <span className="slash-icon">{item.icon}</span>
              <span>
                <span className="slash-label">{item.label}</span>
                <span className="slash-hint">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

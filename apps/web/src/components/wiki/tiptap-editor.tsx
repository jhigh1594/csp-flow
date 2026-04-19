import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type TiptapEditorProps = {
  contentJson: Record<string, unknown> | null;
  editable: boolean;
  onUpdate: (html: string, json: Record<string, unknown>) => void;
  placeholder?: string;
};

type ToolbarButton = {
  icon: typeof Bold;
  action: string;
  isActive: string;
  headingLevel?: 1 | 2 | 3;
  id: string;
};

const toolbarButtons: ToolbarButton[] = [
  { id: "bold", icon: Bold, action: "toggleBold", isActive: "bold" },
  { id: "italic", icon: Italic, action: "toggleItalic", isActive: "italic" },
  {
    id: "h1",
    icon: Heading1,
    action: "toggleHeading",
    isActive: "heading",
    headingLevel: 1,
  },
  {
    id: "h2",
    icon: Heading2,
    action: "toggleHeading",
    isActive: "heading",
    headingLevel: 2,
  },
  {
    id: "h3",
    icon: Heading3,
    action: "toggleHeading",
    isActive: "heading",
    headingLevel: 3,
  },
  {
    id: "bulletList",
    icon: List,
    action: "toggleBulletList",
    isActive: "bulletList",
  },
  {
    id: "orderedList",
    icon: ListOrdered,
    action: "toggleOrderedList",
    isActive: "orderedList",
  },
  {
    id: "codeBlock",
    icon: Code,
    action: "toggleCodeBlock",
    isActive: "codeBlock",
  },
  {
    id: "blockquote",
    icon: Quote,
    action: "toggleBlockquote",
    isActive: "blockquote",
  },
];

export default function TiptapEditor({
  contentJson,
  editable,
  onUpdate,
  placeholder = "Start writing...",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: contentJson,
    editable,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getHTML(), ed.getJSON() as Record<string, unknown>);
    },
  });

  if (!editor) return null;

  const handleToolbarAction = (btn: ToolbarButton) => {
    const chain = editor.chain().focus();

    switch (btn.action) {
      case "toggleHeading":
        chain.toggleHeading({ level: btn.headingLevel ?? 1 }).run();
        break;
      case "toggleBold":
        chain.toggleBold().run();
        break;
      case "toggleItalic":
        chain.toggleItalic().run();
        break;
      case "toggleBulletList":
        chain.toggleBulletList().run();
        break;
      case "toggleOrderedList":
        chain.toggleOrderedList().run();
        break;
      case "toggleCodeBlock":
        chain.toggleCodeBlock().run();
        break;
      case "toggleBlockquote":
        chain.toggleBlockquote().run();
        break;
    }
  };

  const isToolbarActive = (btn: ToolbarButton) => {
    if (btn.action === "toggleHeading") {
      return editor.isActive("heading", { level: btn.headingLevel ?? 1 });
    }
    return editor.isActive(btn.isActive);
  };

  return (
    <div className="rounded-lg border border-border/80">
      {editable && (
        <div className="flex flex-wrap gap-0.5 border-b border-border/80 p-1.5">
          {toolbarButtons.map((btn) => (
            <Button
              key={btn.id}
              variant="ghost"
              size="icon-xs"
              className={isToolbarActive(btn) ? "bg-accent" : ""}
              onClick={() => handleToolbarAction(btn)}
            >
              <btn.icon className="size-4" />
            </Button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
      {!editable && !editor.getText() && placeholder && (
        <p className="px-4 py-3 text-sm text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}

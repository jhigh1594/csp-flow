import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { TableOfContents } from "@tiptap/extension-table-of-contents";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Underline } from "@tiptap/extension-underline";
import { Selection } from "@tiptap/extensions";
import type { Editor } from "@tiptap/react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover";
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { LinkPopover } from "@/components/tiptap-ui/link-popover";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TableInsertButton } from "@/components/tiptap-ui/table-insert-button/table-insert-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import type { TocAnchor } from "@/components/wiki/wiki-toc";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";

type SlashRange = { from: number; to: number };

type SlashCommand = {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  run: (editor: Editor, range: SlashRange) => void;
};

type SlashMenuState = {
  from: number;
  to: number;
  query: string;
  selectedIndex: number;
  top: number;
  left: number;
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "text",
    label: "Text",
    group: "Basic",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: "heading-1",
    label: "Heading 1",
    group: "Headings",
    shortcut: "\u2318\u23251",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    label: "Heading 2",
    group: "Headings",
    shortcut: "\u2318\u23252",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    label: "Heading 3",
    group: "Headings",
    shortcut: "\u2318\u23253",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    group: "Lists",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "Ordered List",
    group: "Lists",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: "task-list",
    label: "Task List",
    group: "Lists",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: "blockquote",
    label: "Blockquote",
    group: "Blocks",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: "code-block",
    label: "Code Block",
    group: "Blocks",
    shortcut: "\u2318\u2325\\",
    run: (ed, range) =>
      ed.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: "table",
    label: "Table",
    group: "Blocks",
    run: (ed, range) =>
      ed
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
];

type WikiEditorProps = {
  contentJson: Record<string, unknown> | null;
  editable: boolean;
  onUpdate: (html: string, json: Record<string, unknown>) => void;
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  onTocAnchorsChange?: (anchors: TocAnchor[]) => void;
};

export type WikiEditorHandle = {
  contentWrapperRef: React.RefObject<HTMLDivElement | null>;
};

const WikiEditor = forwardRef<WikiEditorHandle, WikiEditorProps>(
  function WikiEditorInner(
    {
      contentJson,
      editable,
      onUpdate,
      title,
      onTitleChange,
      onTitleBlur,
      onTocAnchorsChange,
    },
    ref,
  ) {
    const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
    const [_tocAnchors, setTocAnchors] = useState<TocAnchor[]>([]);
    const contentWrapperRef = useRef<HTMLDivElement | null>(null);
    const slashMenuRef = useRef<SlashMenuState | null>(null);
    const latestContentRef = useRef<{
      html: string;
      json: Record<string, unknown>;
    } | null>(null);
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    useEffect(() => {
      slashMenuRef.current = slashMenu;
    }, [slashMenu]);

    useImperativeHandle(ref, () => ({ contentWrapperRef }), []);

    const editor = useEditor({
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: [
        StarterKit.configure({
          horizontalRule: false,
        }),
        HorizontalRule,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false }),
        Underline,
        Image,
        Typography,
        Superscript,
        Subscript,
        Selection,
        TableKit,
        TableOfContents.configure({
          scrollParent: () => contentWrapperRef.current ?? window,
          onUpdate: (anchors) => {
            const mapped = anchors.map((a) => ({
              id: a.id,
              textContent: a.textContent,
              level: a.level,
              isActive: a.isActive,
              isScrolledOver: a.isScrolledOver,
            }));
            setTocAnchors(mapped);
            onTocAnchorsChange?.(mapped);
          },
        }),
        ImageUploadNode.configure({
          accept: "image/*",
          maxSize: MAX_FILE_SIZE,
          limit: 3,
          upload: handleImageUpload,
        }),
      ],
      content: contentJson,
      editable,
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          "aria-label": "Main content area, start typing to enter text.",
          class: "wiki-editor-content",
        },
      },
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        const json = ed.getJSON() as Record<string, unknown>;
        latestContentRef.current = { html, json };
        onUpdateRef.current(html, json);
      },
    });

    useEffect(() => {
      if (editor && !editable) {
        editor.setEditable(false);
      } else if (editor && editable) {
        editor.setEditable(true);
      }
    }, [editor, editable]);

    useEffect(() => {
      return () => {
        if (latestContentRef.current) {
          onUpdateRef.current(
            latestContentRef.current.html,
            latestContentRef.current.json,
          );
        }
      };
    }, []);

    const filteredSlashCommands = useMemo(() => {
      const query = slashMenu?.query.trim().toLowerCase() || "";
      if (!query) return SLASH_COMMANDS;
      return SLASH_COMMANDS.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query) || cmd.id.includes(query),
      );
    }, [slashMenu?.query]);

    const groupedSlashCommands = useMemo(() => {
      const groups: { title: string; items: SlashCommand[] }[] = [];
      const groupMap = new Map<string, SlashCommand[]>();

      for (const cmd of filteredSlashCommands) {
        const existing = groupMap.get(cmd.group);
        if (existing) {
          existing.push(cmd);
        } else {
          groupMap.set(cmd.group, [cmd]);
        }
      }

      for (const [title, items] of groupMap) {
        groups.push({ title, items });
      }

      return groups;
    }, [filteredSlashCommands]);

    const runSlashCommand = useCallback(
      (command: SlashCommand) => {
        if (!editor || !slashMenuRef.current) return;
        command.run(editor, {
          from: slashMenuRef.current.from,
          to: slashMenuRef.current.to,
        });
        setSlashMenu(null);
      },
      [editor],
    );

    const syncSlashMenu = useCallback((activeEditor: Editor) => {
      const { state, view } = activeEditor;
      if (!state.selection.empty) {
        setSlashMenu(null);
        return;
      }

      const { $from } = state.selection;
      if ($from.parent.type.name === "codeBlock") {
        setSlashMenu(null);
        return;
      }

      const textBeforeCursor = $from.parent.textContent.slice(
        0,
        $from.parentOffset,
      );
      const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBeforeCursor);
      if (!match) {
        setSlashMenu(null);
        return;
      }

      const from =
        $from.pos - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
      const to = $from.pos;
      const coords = view.coordsAtPos($from.pos);

      setSlashMenu((current) => {
        if (
          current?.from === from &&
          current?.to === to &&
          current.query === match[1]
        ) {
          return current;
        }
        return {
          from,
          to,
          query: match[1],
          selectedIndex: 0,
          top: coords.bottom + 8,
          left: coords.left,
        };
      });
    }, []);

    useEffect(() => {
      if (!editor) return;

      const onSelection = () => syncSlashMenu(editor);
      const onUpdate = () => syncSlashMenu(editor);

      editor.on("selectionUpdate", onSelection);
      editor.on("update", onUpdate);

      return () => {
        editor.off("selectionUpdate", onSelection);
        editor.off("update", onUpdate);
      };
    }, [editor, syncSlashMenu]);

    useEffect(() => {
      if (!editor || !editable) return;

      const handleKeyDown = (_view: unknown, event: KeyboardEvent) => {
        const current = slashMenuRef.current;
        if (!current || !editor.isFocused) return false;

        if (event.key === "Escape") {
          event.preventDefault();
          setSlashMenu(null);
          return true;
        }

        const commands = filteredSlashCommands;
        if (!commands.length) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashMenu((v) =>
            v
              ? { ...v, selectedIndex: (v.selectedIndex + 1) % commands.length }
              : v,
          );
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashMenu((v) =>
            v
              ? {
                  ...v,
                  selectedIndex:
                    (v.selectedIndex - 1 + commands.length) % commands.length,
                }
              : v,
          );
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          const command =
            commands[Math.min(current.selectedIndex, commands.length - 1)];
          if (command) {
            command.run(editor, { from: current.from, to: current.to });
          }
          setSlashMenu(null);
          return true;
        }

        return false;
      };

      // biome-ignore lint/suspicious/noExplicitAny: Tiptap internal view API
      (editor as any).view.setProps({ handleKeyDown });
    }, [editor, editable, filteredSlashCommands]);

    if (!editor) return null;

    return (
      <div className="wiki-editor-wrapper">
        <EditorContext.Provider value={{ editor }}>
          {editable && (
            <Toolbar>
              <Spacer />

              <ToolbarGroup>
                <UndoRedoButton action="undo" />
                <UndoRedoButton action="redo" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <HeadingDropdownMenu modal={false} levels={[1, 2, 3]} />
                <ListDropdownMenu
                  modal={false}
                  types={["bulletList", "orderedList", "taskList"]}
                />
                <BlockquoteButton />
                <CodeBlockButton />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="code" />
                <MarkButton type="underline" />
                <ColorHighlightPopover />
                <LinkPopover />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <TextAlignButton align="left" />
                <TextAlignButton align="center" />
                <TextAlignButton align="right" />
                <TextAlignButton align="justify" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <ImageUploadButton text="Add" />
                <TableInsertButton />
              </ToolbarGroup>

              <Spacer />
            </Toolbar>
          )}

          <div className="wiki-editor-inner">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              disabled={!editable}
              className="wiki-editor-title"
              placeholder="Untitled"
            />

            <div
              className="wiki-editor-content-wrapper"
              ref={contentWrapperRef}
            >
              <EditorContent editor={editor} role="presentation" />
            </div>
          </div>
        </EditorContext.Provider>

        {slashMenu && filteredSlashCommands.length > 0 && (
          <div
            className="kaneo-tiptap-slash-menu"
            style={{ top: slashMenu.top, left: slashMenu.left }}
          >
            {groupedSlashCommands.map((group) => (
              <div key={group.title}>
                <div className="kaneo-tiptap-slash-group">
                  <div className="kaneo-tiptap-slash-group-title">
                    {group.title}
                  </div>
                  {group.items.map((cmd) => {
                    const globalIndex = filteredSlashCommands.indexOf(cmd);
                    const isSelected = globalIndex === slashMenu.selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        className={`kaneo-tiptap-slash-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => runSlashCommand(cmd)}
                        onMouseEnter={() =>
                          setSlashMenu((v) =>
                            v ? { ...v, selectedIndex: globalIndex } : v,
                          )
                        }
                      >
                        <span className="kaneo-tiptap-slash-label">
                          {cmd.label}
                        </span>
                        {cmd.shortcut && (
                          <span className="kaneo-tiptap-slash-shortcut">
                            {cmd.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default WikiEditor;

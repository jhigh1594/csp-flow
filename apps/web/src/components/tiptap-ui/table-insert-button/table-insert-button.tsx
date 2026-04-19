import { forwardRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { Grid3X3 } from "lucide-react";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import { Button } from "@/components/tiptap-ui-primitive/button";

export interface TableInsertButtonProps extends Omit<ButtonProps, "type"> {
  editor?: Editor | null;
  text?: string;
}

export const TableInsertButton = forwardRef<
  HTMLButtonElement,
  TableInsertButtonProps
>(({ editor: providedEditor, text, onClick, children, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      editor
        ?.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
    [editor, onClick],
  );

  return (
    <Button
      type="button"
      variant="ghost"
      role="button"
      tabIndex={-1}
      aria-label="Insert table"
      tooltip="Table"
      onClick={handleClick}
      {...buttonProps}
      ref={ref}
    >
      {children ?? (
        <>
          <Grid3X3 className="tiptap-button-icon" />
          {text && <span className="tiptap-button-text">{text}</span>}
        </>
      )}
    </Button>
  );
});

TableInsertButton.displayName = "TableInsertButton";

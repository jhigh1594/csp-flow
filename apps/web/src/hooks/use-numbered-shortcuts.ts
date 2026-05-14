import { useEffect } from "react";
import { isEditableElement } from "@/lib/dom-utils";

type NumberedShortcutOption = {
  onSelect: () => void;
};

export function useNumberedShortcuts(
  isOpen: boolean,
  options: NumberedShortcutOption[],
  maxNumbers = 9,
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isEditableElement(target)) return;

      const num = Number.parseInt(e.key, 10);
      const isValidNumber =
        !Number.isNaN(num) &&
        num >= 1 &&
        num <= Math.min(options.length, maxNumbers);

      if (isValidNumber) {
        e.preventDefault();
        e.stopPropagation();
        options[num - 1].onSelect();
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isOpen, options, maxNumbers]);
}

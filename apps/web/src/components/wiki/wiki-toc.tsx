import { List } from "lucide-react";

export type TocAnchor = {
  id: string;
  textContent: string;
  level: number;
  isActive: boolean;
  isScrolledOver: boolean;
};

type WikiTocProps = {
  anchors: TocAnchor[];
  onHeadingClick: (id: string) => void;
  visible: boolean;
  onToggle: () => void;
};

export default function WikiToc({
  anchors,
  onHeadingClick,
  visible,
  onToggle,
}: WikiTocProps) {
  if (anchors.length === 0) return null;

  return (
    <div className="wiki-toc-sidebar">
      <button
        type="button"
        className="wiki-toc-toggle"
        onClick={onToggle}
        aria-label={
          visible ? "Hide table of contents" : "Show table of contents"
        }
      >
        <List className="size-4" />
      </button>
      {visible && (
        <div className="wiki-toc-content">
          <div className="wiki-toc-header">On this page</div>
          <nav className="wiki-toc-list">
            {anchors.map((anchor) => (
              <button
                key={anchor.id}
                type="button"
                className={`wiki-toc-item wiki-toc-item-level-${anchor.level} ${anchor.isActive ? "is-active" : ""} ${anchor.isScrolledOver && !anchor.isActive ? "is-scrolled-over" : ""}`}
                onClick={() => onHeadingClick(anchor.id)}
              >
                {anchor.textContent}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

"use client";

type SpaceSummary = Readonly<{
  id: string;
  name: string;
  itemCount: number;
}>;

type SpaceNavProps = Readonly<{
  spaces: readonly SpaceSummary[];
  activeSpaceId: string;
  onSelect: (spaceId: string) => void;
  onAddSpace: () => void;
  onDeleteSpace: () => void;
}>;

export function SpaceNav({ spaces, activeSpaceId, onSelect, onAddSpace, onDeleteSpace }: SpaceNavProps) {
  return (
    <aside className="editor-sidebar card">
      <div className="editor-sidebar__header">
        <h3>空间</h3>
        <button className="button button--ghost focus-ring" onClick={onAddSpace} type="button">
          添加空间
        </button>
      </div>
      <div className="space-list" role="tablist" aria-label="空间导航">
        {spaces.map((space) => (
          <button
            key={space.id}
            className={`space-pill focus-ring ${space.id === activeSpaceId ? "space-pill--active" : ""}`}
            onClick={() => onSelect(space.id)}
            type="button"
          >
            <span>{space.name}</span>
            <small>{space.itemCount} 项</small>
          </button>
        ))}
      </div>
      <button className="text-button focus-ring" onClick={onDeleteSpace} type="button">
        删除当前空间
      </button>
    </aside>
  );
}

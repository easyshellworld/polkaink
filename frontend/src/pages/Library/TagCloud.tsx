import { Badge } from '../../components/ui/Badge';

interface TagCloudProps {
  tags: string[];
  selectedTag?: string;
  onSelectTag: (tag: string | undefined) => void;
}

export function TagCloud({ tags, selectedTag, onSelectTag }: TagCloudProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => onSelectTag(undefined)}
        className={`text-xs px-3 py-1 rounded-full transition-colors ${
          !selectedTag
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button key={tag} onClick={() => onSelectTag(tag)}>
          <Badge variant={selectedTag === tag ? 'primary' : 'neutral'}>{tag}</Badge>
        </button>
      ))}
    </div>
  );
}
